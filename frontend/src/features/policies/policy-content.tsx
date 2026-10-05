import type { PolicyType } from "@/features/policies/model";

export function PolicyContent({ type }: { type: PolicyType }) {
  const checklist =
    type === "privacy"
      ? [
          "운영자와 개인정보 문의 연락처",
          "운영 서버·호스팅의 접속 로그 항목과 보관 기간",
          "쿠키·브라우저 저장 정보와 삭제 방법",
          "광고·분석 도구의 실제 사용 여부와 처리 구조",
          "위탁·국외 이전 여부, 권리 행사 절차와 시행일",
        ]
      : [
          "실제 운영 주체·연락처와 적용 시점",
          "서비스 이용 범위와 데이터 변경·갱신 안내",
          "외부 공식 안내·예약 링크의 역할",
          "서비스 변경·중단 및 문의 절차",
          "자료 이용 권리와 이용자 권리·책임",
        ];
  return (
    <>
      {type !== "about" && <div className="callout warning">
        공개 정책 확정 전 · 검토 안내
        <br />
        실제 운영 구성 확인 후 정책·약관을 준비합니다.
      </div>}
      <div className="policy-content">
        {type === "about" ? (
          <>
            <h2>데이터 출처</h2>
            <ul>
              <li><a href="https://www.data.go.kr/data/15101578/openapi.do" target="_blank" rel="noopener noreferrer">한국관광공사 TourAPI</a> · 한국관광공사 제공 관광·행사·시설 정보</li>
              <li><a href="https://www.data.go.kr/data/15017323/standard.do" target="_blank" rel="noopener noreferrer">전국박물관미술관 표준데이터</a> · 지방자치단체 제공 시설·이용 정보</li>
              <li><a href="https://www.data.go.kr/data/15013104/standard.do" target="_blank" rel="noopener noreferrer">전국문화축제 표준데이터</a> · 한국관광공사·지방자치단체 제공 축제·일정 정보</li>
            </ul>
            <p>
              각 제공기관의 이용 조건에 따라 사용합니다. 두 표준데이터는{" "}
              <a href="https://www.kogl.or.kr/info/license.do" target="_blank" rel="noopener noreferrer">공공누리 제1유형(출처 표시)</a>
              으로 제공됩니다.
            </p>
            <h2>사진 출처와 이용 조건</h2>
            <p>
              한국관광공사 TourAPI와 Wikimedia Commons의 사진을 이용하며, 각 이용 조건을 준수합니다.
            </p>
            <details className="policy-photo-credits">
              <summary>사진별 출처 보기</summary>
              <ul>
                <li>
                  <a href="https://www.data.go.kr/data/15101578/openapi.do" target="_blank" rel="noopener noreferrer">한국관광공사 TourAPI 제공 사진</a>
                  {" · "}
                  <a href="https://www.kogl.or.kr/info/license.do" target="_blank" rel="noopener noreferrer">공공누리 제1유형(출처 표시)</a>
                </li>
                <li>
                  <a href="https://commons.wikimedia.org/wiki/File:Clayarch_Gimhae_Museum.JPG" target="_blank" rel="noopener noreferrer">클레이아크 김해미술관 · HappyMidnight (2015)</a>
                  {" · "}
                  <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>
                  {" · 일부 잘라 표시"}
                </li>
              </ul>
            </details>
          </>
        ) : (
          <>
            <h2>
              {type === "privacy" ? "공개 정책" : "공개 약관"} 작성 전 확인할
              항목
            </h2>
            <ul>
              {checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h2>
              {type === "privacy" ? "현재 검토 시안의 동작" : "현재 제공 범위"}
            </h2>
            <p>
              {type === "privacy"
                ? "로그인과 개인정보 입력 기능은 없습니다. 기간·홈 필터 설정은 이 탭의 sessionStorage에 저장됩니다. 공개 서비스의 수집·보관 범위는 아직 확정되지 않았습니다."
                : "이 페이지는 화면 검토 시안입니다. 직접 예약·결제·개인별 할인 판정과 요금 합계 기능은 제공하지 않습니다. 공개 운영 구성과 검토를 거쳐 실제 약관을 준비합니다."}
            </p>
          </>
        )}
      </div>
    </>
  );
}
