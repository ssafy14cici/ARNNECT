FROM openjdk:17-jdk-slim

WORKDIR /app

# Jenkins가 빌드한 JAR 파일 복사
COPY build/libs/*.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]