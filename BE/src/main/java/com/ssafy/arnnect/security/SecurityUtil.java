package com.ssafy.arnnect.security;

import com.ssafy.arnnect.member.domain.entity.UserRole;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtil {

    public static String getCurrentMemberUuid() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            throw new RuntimeException("No authenticated user found");
        }
        return (String) auth.getPrincipal();
    }

    public static UserRole getCurrentUserRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities().isEmpty()) {
            throw new RuntimeException("No authenticated role found");
        }
        return UserRole.valueOf(auth.getAuthorities().iterator().next().getAuthority());
    }
}
