package kr.nadeulirang.backend.collection;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import static org.assertj.core.api.Assertions.assertThat;

class CollectionSettingsTests {
    @TempDir Path directory;

    @Test @DisplayName("새 작업 폴더는 공통 키를 사용하고 빈 입력란으로 저장된 키를 지우지 않는다")
    void inheritsKeysAcrossFolders() throws Exception {
        Path shared = directory.resolve("shared.env");
        Path local = directory.resolve(".env");
        Files.writeString(shared, "TOURAPI_SERVICE_KEY=shared-tour\nFESTIVAL_SERVICE_KEY=shared-festival\nMUSEUM_SERVICE_KEY=shared-museum\nDB_PASSWORD=not-an-api-key\n");
        assertThat(CollectionRunner.readKeys(local, shared)).hasSize(3).containsEntry("TOURAPI_SERVICE_KEY", "shared-tour");
        Files.writeString(local, "TOURAPI_SERVICE_KEY=\nFESTIVAL_SERVICE_KEY='folder-festival'\nMUSEUM_SERVICE_KEY=\" \"\n");
        assertThat(CollectionRunner.readKeys(local, shared)).hasSize(3)
                .containsEntry("TOURAPI_SERVICE_KEY", "shared-tour")
                .containsEntry("FESTIVAL_SERVICE_KEY", "folder-festival")
                .containsEntry("MUSEUM_SERVICE_KEY", "shared-museum");
        assertThat(Files.readString(shared)).contains("TOURAPI_SERVICE_KEY=shared-tour");
    }

    @Test @DisplayName("공통 설정이 없는 환경에서는 기존 폴더 키를 읽고 두 파일이 없어도 비밀값을 만들지 않는다")
    void retainsLocalOnlySetup() throws Exception {
        Path shared = directory.resolve("missing.env");
        Path local = directory.resolve(".env");
        assertThat(CollectionRunner.readKeys(local, shared)).isEmpty();
        Files.writeString(local, "TOURAPI_SERVICE_KEY=local-only\nOTHER_TOKEN=ignored\n");
        assertThat(CollectionRunner.readKeys(local, shared)).containsOnlyKeys("TOURAPI_SERVICE_KEY")
                .containsEntry("TOURAPI_SERVICE_KEY", "local-only");
    }
}
