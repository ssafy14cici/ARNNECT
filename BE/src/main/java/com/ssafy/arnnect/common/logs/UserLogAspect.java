package com.ssafy.arnnect.common.logs;


import com.ssafy.arnnect.comment.application.dto.request.CreateCommentRequest;
import com.ssafy.arnnect.comment.domain.entity.TargetType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.List;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class UserLogAspect {

    private final UserLogService userLogService;
    @AfterReturning(
            pointcut = "@annotation(userLoggable)",
            returning = "result"
    )
    public void saveUserLog(
            JoinPoint joinPoint,
            UserLoggable userLoggable,
            Object result
    ) {
        String memberUuid = extractMemberUuid(joinPoint.getArgs());
        Long artworkId = extractArtworkId(joinPoint.getArgs());

        if(userLoggable.action() == UserLogAction.SELECT){
            List<Long> artistList = extractArtworkIdList(joinPoint.getArgs());

            // null 체크 추가
            if (artistList == null || artistList.isEmpty()) {
                return;
            }

            for(Long artist : artistList){
                userLogService.save(
                        memberUuid,
                        userLoggable.action(),
                        artist
                );
            }
            return;
        }

        if(userLoggable.action() == UserLogAction.COMMENT) {
            CreateCommentRequest request = (CreateCommentRequest) joinPoint.getArgs()[0];
            if(request.getTargetType() == TargetType.ARTWORK) {
                artworkId = request.getTargetId().longValue();
            }
        }

        if (memberUuid == null || artworkId == null) {
            return; // 로그 불가 → 종료
        }

        if (userLoggable.action() == UserLogAction.LIKE) {
            if (!(result instanceof Boolean liked) || !liked) {
                return; // 좋아요 취소 → 로그 안 남김
            }
        }

        userLogService.save(
                memberUuid,
                userLoggable.action(),
                artworkId
        );
    }

    private String extractMemberUuid(Object[] args) {
        for (Object arg : args) {
            if (arg instanceof String uuid) {
                return uuid;
            }
        }
        return null;
    }

    private Long extractArtworkId(Object[] args) {
        for (Object arg : args) {
            if (arg == null) continue;

            if (arg instanceof Long artworkId) {
                return artworkId;
            }

            try {
                Method method = arg.getClass().getMethod("getArtworkId");
                Object value = method.invoke(arg);

                if (value instanceof Long artworkIdFromDto) {
                    return artworkIdFromDto;
                }
            } catch (NoSuchMethodException ignored) {
            } catch (Exception e) {
                log.warn("getArtworkId invoke failed", e);
            }
        }
        return null;
    }
    @SuppressWarnings("unchecked")
    private List<Long> extractArtworkIdList(Object[] args) {
        for (Object arg : args) {
            if (arg == null) continue;

            // 1. 직접 List<Long> 타입인 경우
            if (arg instanceof List<?> list) {
                if (!list.isEmpty() && list.get(0) instanceof Long) {
                    return (List<Long>) list;
                }
            }

            // 2. DTO getter 메서드 시도 (여러 이름 패턴 지원)
            for (String methodName : List.of("getArtworkIdList", "getArtworkIds")) {
                try {
                    Method method = arg.getClass().getMethod(methodName);
                    Object value = method.invoke(arg);

                    if (value instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof Long) {
                        return (List<Long>) list;
                    }
                } catch (NoSuchMethodException ignored) {
                    // 다음 메서드명 시도
                } catch (Exception e) {
                    log.warn("{} invoke failed", methodName, e);
                }
            }
        }
        return null;
    }
}
