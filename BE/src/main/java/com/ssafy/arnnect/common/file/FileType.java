package com.ssafy.arnnect.common.file;

public enum FileType {
    PROFILE("profile"),
    ARTWORK("artwork"),
    REVIEW("review");

    private final String folder;

    FileType(String folder) {
        this.folder = folder;
    }

    public String getFolder() {
        return folder;
    }
}


