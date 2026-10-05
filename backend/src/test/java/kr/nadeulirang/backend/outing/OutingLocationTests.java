package kr.nadeulirang.backend.outing;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class OutingLocationTests {
    @Test @DisplayName("같은 시도의 확보 주소가 가리키는 시군구 하나만 표시한다")
    void usesConfirmedAddresses() {
        assertThat(OutingLocation.confirmedDistrict("부산광역시", new String[]{
            "부산광역시 수영구 광안해변로 219", "부산광역시 수영구 광안동"})).isEqualTo("수영구");
        assertThat(OutingLocation.confirmedDistrict("경상남도", new String[]{
            "경상남도 김해시 진례면", "경상남도 김해시 분청로 21"})).isEqualTo("김해시");
        assertThat(OutingLocation.confirmedDistrict("대구광역시", new String[]{
            "대구광역시 달성군 유가읍"})).isEqualTo("달성군");
    }

    @Test @DisplayName("주소 누락·시군구 충돌·시도 불일치·장소명은 지역 추정에 쓰지 않는다")
    void doesNotGuessMissingOrConflictingDistricts() {
        assertThat(OutingLocation.confirmedDistrict("부산광역시", new String[]{
            "부산광역시 수영구 광안동", "부산광역시 해운대구 우동"})).isNull();
        assertThat(OutingLocation.confirmedDistrict("부산광역시", new String[]{
            "서울특별시 종로구", "광안리 해변 일원", "부산광역시 광안동", null})).isNull();
        assertThat(OutingLocation.confirmedDistrict("부산광역시", null)).isNull();
        assertThat(OutingLocation.confirmedDistrict("세종특별자치시", new String[]{
            "세종특별자치시 어진동"})).isNull();
    }
}
