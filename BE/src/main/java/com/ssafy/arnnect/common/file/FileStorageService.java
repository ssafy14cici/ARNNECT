package com.ssafy.arnnect.common.file;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageService {
    @Value("${file.base-dir}")
    private String baseDir;

    public Map<String, String> saveFile(MultipartFile file, FileType fileType){
        try {
            // 1. 디렉토리 생성
            File uploadFolder = new File(baseDir);
            if (!uploadFolder.exists()) {
                uploadFolder.mkdirs();
            }

            // 2. 파일명 중복 방지 (UUID + 원본 확장자)
            String originalName = file.getOriginalFilename();
            String fileExtension = getFileExtension(originalName);
            String fileName = UUID.randomUUID() + "." + fileExtension;

            // 3. 저장 경로
            File saveFile = new File(baseDir + "/" + fileType.getFolder() + "/" + fileName);

            // 4. 저장
            file.transferTo(saveFile);

            log.info("이미지 저장 완료: {}", saveFile.getAbsolutePath());

            return Map.of("origin",originalName,"saved",fileName);

        } catch (IOException e) {
            log.error("이미지 저장 실패: {}", e.getMessage());
            throw new RuntimeException("이미지 저장 실패", e);
        }
    }

    public void deleteFile(String fileName, FileType fileType){
        File file = new File(baseDir + "/" + fileType.getFolder() + "/" + fileName);
        if (file.exists()) {
            file.delete();
            log.info("롤백: {} 삭제", fileName);
        }
    }

    private String getFileExtension(String fileName) {
        if (fileName == null) return "";
        return fileName.substring(fileName.lastIndexOf(".") + 1);
    }

    public String getBaseDir(FileType fileType){
        return baseDir + "/" + fileType.getFolder() + "/";
    }
}
