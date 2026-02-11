package com.ssafy.arnnect.common.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    /** COMMON **/
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "COMMON_001", "잘못된 요청입니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_002", "서버 오류가 발생했습니다."),
    DB_SAVE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_003", "DB 오류가 발생했습니다."),

    /** AUTH **/
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "AUTH_001", "인증에 실패했습니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "AUTH_002", "접근 권한이 없습니다."),
    USER_NOT_FOUND(HttpStatus.UNAUTHORIZED, "AUTH_003", "잘못된 이메일 또는 비밀번호 입니다."),

    /** VALIDATION **/
    INVALID_PARAMETER(HttpStatus.BAD_REQUEST, "VALID_001", "요청 값이 올바르지 않습니다."),

    /** FILE **/
    FILE_NOT_FOUND(HttpStatus.NOT_FOUND, "FILE_001", "파일을 찾을 수 없습니다."),
    FILE_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "FILE_002", "파일 업로드에 실패했습니다."),
    FILE_DELETE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "FILE_003", "파일 삭제에 실패했습니다."),

    /** ARTWORK **/
    ARTWORK_NOT_FOUND(HttpStatus.NOT_FOUND, "ARTWORK_001", "작품이 존재하지않습니다."),

    /** REVIEW **/
    REVIEW_NOT_FOUND(HttpStatus.NOT_FOUND, "REVIEW_001", "감상평이 존재하지않습니다."),

    /** COMMENT **/
    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMENT_001", "댓글이 존재하지않습니다."),

    /** FanLetter **/
    FANLETTER_NOT_FOUND(HttpStatus.NOT_FOUND, "FANLETTER_001", "팬레터가 존재하지않습니다."),
    
    /** TICKET **/
    TICKET_NOT_FOUND(HttpStatus.NOT_FOUND, "TICKET_001", "티켓이 존재하지않습니다."),
    INVALID_TICKET_CODE(HttpStatus.BAD_REQUEST, "TICKET_002", "유효하지않은 티켓입니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus httpStatus, String code, String message) {
        this.httpStatus = httpStatus;
        this.code = code;
        this.message = message;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }

    public String getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }
}
