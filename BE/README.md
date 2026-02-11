## 🚀 Tech Stack
<div align="center">

![IntelliJ IDEA](https://img.shields.io/badge/IntelliJ_IDEA-black?style=flat-square&logo=intellijidea)
![Java](https://img.shields.io/badge/Java-orange?style=flat-square&logo=openjdk)
![Gradle](https://img.shields.io/badge/Gradle-02303A?style=flat-square&logo=gradle)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=flat-square&logo=springboot)
![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?style=flat-square&logo=springsecurity)

![JWT](https://img.shields.io/badge/JWT-black?style=flat-square&logo=jsonwebtokens)
![Hibernate](https://img.shields.io/badge/Hibernate-59666C?style=flat-square&logo=hibernate)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=flat-square&logo=swagger)
![OpenAI](https://img.shields.io/badge/OpenAI-black?style=flat-square&logo=openai)
</div>

| Category | Stack |
| --- | --- |
| Language | Java 17 |
| Framework | Spring Boot 3.5.9 |
| Library | Spring Security, Spring Data JPA, Spring Data Redis, Spring Batch, Spring Validation, Springdoc OpenAPI, JWT (jjwt), Lombok |
| Build Tool | Gradle |
| Database | MySQL 8.0, Redis 7.4 |
| IDE | IntelliJ IDEA 2023.3.8 (Ultimate Edition) |

<details>
<summary><b>BE 프로젝트 구조</b></summary>

```text
src/main/java/com/ssafy/arnnect
├── artwork
│   ├── application
│   │   ├── dto
│   │   │   ├── request
│   │   │   └── response
│   │   └── service
│   ├── domain/entity
│   ├── presentation/controller
│   └── repository

├── auth
│   ├── application
│   │   ├── dto
│   │   │   ├── request
│   │   │   └── response
│   │   └── service
│   ├── jwt
│   └── presentation/controller

├── collectbook
├── comment
├── fanletter
├── follow
├── member
├── review
│   └── (application / domain / presentation / repository 동일 구조)

├── preference
│   ├── application
│   │   ├── dto
│   │   ├── service
│   │   └── vo
│   ├── batch
│   │   ├── config
│   │   └── job
│   ├── domain
│   ├── presentation/controller
│   └── repository

├── remind
│   └── presentation/controller

├── common
│   ├── config
│   ├── exception
│   ├── file
│   ├── logs
│   ├── response
│   └── util

├── security
└── resources
```
</details>