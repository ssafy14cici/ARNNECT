package com.ssafy.arnnect.remind.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.arnnect.remind.application.dto.request.RemindQuizRequest;
import com.ssafy.arnnect.remind.application.dto.response.ChatCompletionResponse;
import com.ssafy.arnnect.remind.application.dto.response.RemindQuizResponse;
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

    @Value("${remind.ai.version}")
    private String version;

    @Override
    public List<RemindQuizResponse> sendRemind(String memberUuid) throws JsonProcessingException {

        List<RemindQuizRequest.Message> messages = new ArrayList<>();

        // 1) system 메시지
        messages.add(new RemindQuizRequest.Message("system", prompt));

        // 2) user 메시지 (여러 리뷰를 반복)
        List<RemindQuizRequest.ReviewPayload> reviews = List.of(
                new RemindQuizRequest.ReviewPayload(1L, "예상치 못한 반전",
                        "처음에는 평범한 이야기인 줄 알았는데, 마지막에 등장인물이 큰 결정을 내리는 순간 반전이 있어 놀랐다."),
                new RemindQuizRequest.ReviewPayload(2L, "감정이 몰입되는 서사",
                        "주인공의 성장 과정이 섬세하게 그려져서 이야기 초반부터 끝까지 감정적으로 몰입할 수 있었다."),
                new RemindQuizRequest.ReviewPayload(3L, "유머와 감동의 조화",
                        "중간중간 웃음을 주는 장면과 진지한 감동 장면이 적절히 섞여 있어 보는 내내 지루하지 않았다."),
                new RemindQuizRequest.ReviewPayload(4L, "주제의 깊이",
                        "사회적 문제를 배경으로 주제를 깊이 있게 탐구하며, 여러 관점에서 생각할 거리를 주었다."),
                new RemindQuizRequest.ReviewPayload(5L, "강렬한 캐릭터",
                        "각 인물의 성격이 뚜렷하고, 특히 조연 캐릭터조차 기억에 남을 만큼 개성이 강하다."),
                new RemindQuizRequest.ReviewPayload(6L, "시각적 매력",
                        "화면 구성이 아름답고 색감과 장면 연출이 인상적이라 시청하는 즐거움이 컸다."),
                new RemindQuizRequest.ReviewPayload(7L, "긴장감 넘치는 전개",
                        "계속해서 사건이 이어지며 긴장감이 유지되어 마지막까지 손에 땀을 쥐고 볼 수 있었다."),
                new RemindQuizRequest.ReviewPayload(8L, "음악과 분위기",
                        "배경음악과 분위기가 작품의 감정을 잘 살려주어 몰입감이 훨씬 높았다."),
                new RemindQuizRequest.ReviewPayload(9L, "생각하게 하는 결말",
                        "마지막 장면에서 결말이 열린 느낌이라, 작품이 끝난 후에도 계속 생각하게 된다."),
                new RemindQuizRequest.ReviewPayload(10L, "감정 표현의 섬세함",
                        "등장인물들의 감정이 미세하게 표현되어서 작은 표정이나 말투 하나에도 의미를 느낄 수 있었다.")
        );
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
            5. 퀴즈는 설명형 문장 또는 질문형 문장으로 작성한다.
                        
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
