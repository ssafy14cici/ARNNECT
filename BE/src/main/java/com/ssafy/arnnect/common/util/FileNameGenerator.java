package com.ssafy.arnnect.common.util;

public class FileNameGenerator {
    public String generateFileName(String originalFileName, String memberUuid) {
        String ext = originalFileName.substring(originalFileName.lastIndexOf(".") + 1);
        return memberUuid + "_" + System.currentTimeMillis() + "." + ext;
    }
}
