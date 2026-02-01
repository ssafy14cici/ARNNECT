package com.ssafy.arnnect.common.file;

import com.ssafy.arnnect.common.exception.BusinessException;
import com.ssafy.arnnect.common.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
public class FileStorageService {
    @Value("${file.base-dir}")
    private String baseDir;

    // 파일 저장
    public void saveFile(MultipartFile file, String storedFileName, FileType fileType) throws IOException {
        Path uploadPath = Paths.get(baseDir, fileType.getFolder());

        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        Path filePath = uploadPath.resolve(storedFileName);
        file.transferTo(filePath.toFile());
    }

    // 파일 조회
    public Resource loadFile(String storedFileName, FileType fileType) throws MalformedURLException {
        Path filePath = Paths.get(baseDir, fileType.getFolder(), storedFileName);
        Resource resource = new UrlResource(filePath.toUri());

        if (resource.exists() && resource.isReadable()) {
            return resource;
        }
        throw new BusinessException(ErrorCode.FILE_NOT_FOUND);
    }

    // 파일 삭제
    public void deleteFile(String storedFileName, FileType fileType) throws IOException {
        Path filePath = Paths.get(baseDir, fileType.getFolder(), storedFileName);
        Files.deleteIfExists(filePath);
    }
}
