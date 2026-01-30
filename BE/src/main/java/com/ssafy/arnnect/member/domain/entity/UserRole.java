package com.ssafy.arnnect.member.domain.entity;

public enum UserRole {
    GENERAL,
    ARTIST;

    public String getAuthority() {
        return this.name();
    }
}
