FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
COPY src src
# DB 회귀는 커밋 검사와 CI에서 실행한다. 이미지 빌드에 DB 비밀값을 전달하지 않는다.
RUN chmod +x mvnw && ./mvnw -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app app
COPY --from=build --chown=app:app /app/target/backend-0.0.1-SNAPSHOT.jar app.jar
USER app
ENV SPRING_PROFILES_ACTIVE=review
ENV JAVA_TOOL_OPTIONS="-Xms64m -Xmx256m -Xss512k -XX:+UseSerialGC -XX:ActiveProcessorCount=1 -XX:MaxMetaspaceSize=128m -XX:ReservedCodeCacheSize=32m -XX:MaxDirectMemorySize=16m"
EXPOSE 10000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
