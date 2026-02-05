package com.ssafy.arnnect.remind.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.arnnect.member.application.service.MemberService;
import com.ssafy.arnnect.remind.application.dto.request.RemindQuizRequest;
import com.ssafy.arnnect.remind.application.dto.response.ChatCompletionResponse;
import com.ssafy.arnnect.remind.application.dto.response.RemindQuizResponse;
import com.ssafy.arnnect.review.application.dto.response.ReviewQuizResponse;
import com.ssafy.arnnect.review.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
@Slf4j
@Service
@RequiredArgsConstructor
public class RemindServiceImpl implements RemindService {

    private final RestClient restClient;
    private final ReviewRepository repository;
    private final MemberService memberService;

    @Value("${remind.ai.version}")
    private String version;

    @Override
    public List<RemindQuizResponse> sendRemind(String memberUuid) throws JsonProcessingException {
        List<RemindQuizRequest.Message> messages = new ArrayList<>();

        // 1) system 메시지
        messages.add(new RemindQuizRequest.Message("system", prompt));

        List<RemindQuizRequest.ReviewPayload> reviews = repository.getReviewQuizList(memberService.getMemberId(memberUuid))
                .stream().map(ReviewQuizResponse::toQuiz).toList();

        ObjectMapper objectMapper = new ObjectMapper();
        String reviewsJson = objectMapper.writeValueAsString(reviews);

        messages.add(new RemindQuizRequest.Message("user",reviewsJson));

        RemindQuizRequest request = RemindQuizRequest.builder()
                .model(version)
                .messages(messages)
                .max_tokens(4096)
                .temperature(0.3)
                .build();

        String body = restClient.post()
                .body(request)
                .retrieve()
                .body(String.class);

        log.info("반환값 : {}",body);



        // ObjectMapper 설정: 알 수 없는 필드 무시
        objectMapper = new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        // 1. 전체 응답 파싱
        ChatCompletionResponse chatResponse = objectMapper.readValue(body, ChatCompletionResponse.class);

        // 2. 안전한 검증
        if (chatResponse == null ||
                chatResponse.getChoices() == null ||
                chatResponse.getChoices().isEmpty() ||
                chatResponse.getChoices().get(0).getMessage() == null ||
                chatResponse.getChoices().get(0).getMessage().getContent() == null) {
            log.error("유효하지 않은 Chat API 응답");
            return Collections.emptyList();
        }

        String content = chatResponse.getChoices().get(0).getMessage().getContent();
//        log.info("추출된 content: {}", content);

        // 3. 퀴즈 배열 파싱
        List<RemindQuizResponse> responses = objectMapper.readValue(
                content,
                new TypeReference<List<RemindQuizResponse>>() {}
        );

        log.info("파싱 성공! 퀴즈 개수: {}", responses.size());



        return responses;

    }
    String prompt = """
            입력으로 감상평 10개가 주어진다.
            각 감상평에는 다음 정보가 포함되어 있다.
                        
            - reviewId: 감상평 ID
            - title: 감상평 제목
            - content: 감상평 본문
                        
            아래 규칙을 반드시 지켜서 퀴즈를 생성해야 한다.
                        
            1. 각 감상평마다 퀴즈 1개를 생성한다. (총 10개)
            2. 퀴즈에는 작품명, 작가명, 고유명사(작품을 직접 식별 가능한 명칭)가 절대 포함되면 안 된다.
            3. 감상평에 명시적으로 언급된 내용만 사용해야 하며, 추론·추가 설정·외부 지식은 사용하면 안 된다.
            4. 퀴즈 내용만 읽고도 사용자가 어떤 작품에 대한 감상평인지 유추할 수 있어야 한다.
            5. 퀴즈는 어떤 작품인지 물어보는 형식이어야한다.
                        
            출력은 반드시 아래 JSON 형식을 따른다.
            다른 설명 문장은 출력하지 않는다.
                        
            [
                        
            {
            ’reviewId’: number,
            ’quiz’: ‘생성된 퀴즈 내용’
            }
                        
            ]
                        
            - 작품명, 시리즈명, 캐릭터 이름, 장소명 등 고유명사 사용 금지
            - 감상평에 없는 설정·사건·결말 추가 금지
            - 퀴즈가 아닌 감상 요약 형태로 작성 금지
                        
            입력 예시 )\s
                        
            [
                        
            {
            ’reviewId’: 1,
                        
            ‘title’: 해바라기
            ’content’: ‘강렬한 노란색의 에너지가 캔버스를 뚫고 나오는 듯한 빈센트 반 고흐의 <해바라기>를 보고 있으면, 말로 다 못 할 뭉클함이 느껴지곤 해요. 단순히 예쁜 꽃그림이라기엔 그 질감이 너무나 입체적이라, 마치 고흐가 붓을 꾹꾹 눌러 담은 그날의 뜨거운 진심이 그대로 전해지는 기분이거든요.
                        
            활짝 피어난 꽃부터 조금은 시들어 고개를 숙인 꽃까지 섞여 있는 모습을 보며, 우리 삶의 화려함과 쓸쓸함이 참 닮아있다는 생각도 듭니다. 특히 친구 고갱이 올 날을 손꼽아 기다리며 이 노란 방을 꾸몄을 고흐의 설렘을 상상하면, 그림이 이전보다 훨씬 더 다정하고 애틋하게 다가와요.
                        
            지치고 에너지가 필요한 날, 이 해바라기 앞에 서서 가만히 눈을 맞추고 있으면 어느덧 마음속에도 환한 노란빛 위로가 차오르는 것 같습니다.’
            }
                        
            ]
                        
            생성된 퀴즈 예시 )\s
                        
            [
                        
            {
            ’reviewId’: 1,
            ’quiz’: ‘강렬한 노란색의 에너지가 느껴지며, 활짝 피어난 꽃부터 시들어 고개를 숙인 꽃까지 함께 담겨 있어 삶의 화려함과 쓸쓸함을 동시에 보여주는 이 작품은 무엇일까요?’
            }
                        
            ]
            """;

}
