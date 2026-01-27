package com.ssafy.arnnect.common.exception;

import com.ssafy.arnnect.common.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(
            BusinessException e
    ) {
        ErrorCode errorCode = e.getErrorCode();
        log.warn("BusinessException caught: {}", e.getErrorCode());
        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.fail(errorCode));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        log.warn("Exception caught");
        return ResponseEntity
                .status(ErrorCode.INTERNAL_SERVER_ERROR.getHttpStatus())
                .body(ApiResponse.fail(ErrorCode.INTERNAL_SERVER_ERROR));
    }
}

