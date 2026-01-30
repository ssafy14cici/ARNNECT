FROM eclipse-temurin:17-jdk-jammy

WORKDIR /app

# Jenkins가 빌드한 JAR 파일 복사
COPY build/libs/*.jar app.jar

ENTRYPOINT ["java", "-jar", "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "app.jar"]