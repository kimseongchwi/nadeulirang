import type { PolicyType } from "@/features/policies/model";

export function PolicyContent({
  type,
  samplePhoto = false,
}: {
  type: PolicyType;
  samplePhoto?: boolean;
}) {
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
      {type !== "about" && (
        <div className="callout warning">
          공개 정책 확정 전 · 검토 안내
          <br />
          실제 운영 구성 확인 후 정책·약관을 준비합니다.
        </div>
      )}
      <div className="policy-content">
        {type === "about" ? (
          <>
            <h2>데이터 출처</h2>
            <ul>
              <li>
                <a
                  href="https://www.data.go.kr/data/15101578/openapi.do"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  한국관광공사 TourAPI
                </a>{" "}
                · 한국관광공사 제공 관광·행사·시설 정보
              </li>
              <li>
                <a
                  href="https://www.data.go.kr/data/15017323/standard.do"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  전국박물관미술관 표준데이터
                </a>{" "}
                · 지방자치단체 제공 시설·이용 정보
              </li>
              <li>
                <a
                  href="https://www.data.go.kr/data/15013104/standard.do"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  전국문화축제 표준데이터
                </a>{" "}
                · 한국관광공사·지방자치단체 제공 축제·일정 정보
              </li>
            </ul>
            <p>
              각 제공기관의 이용 조건에 따라 사용합니다. 두 표준데이터는{" "}
              <a
                href="https://www.kogl.or.kr/info/license.do"
                target="_blank"
                rel="noopener noreferrer"
              >
                공공누리 제1유형(출처 표시)
              </a>
              으로 제공됩니다.
            </p>
            <h2>사진 출처와 이용 조건</h2>
            <p>
              <a
                href="https://www.data.go.kr/data/15101578/openapi.do"
                target="_blank"
                rel="noopener noreferrer"
              >
                한국관광공사 TourAPI 제공 사진
              </a>
              {" · "}
              <a
                href="https://www.kogl.or.kr/info/licenseType1.do"
                target="_blank"
                rel="noopener noreferrer"
              >
                공공누리 제1유형(출처 표시)
              </a>
            </p>
            <p>
              한국관광공사 제공 사진 중 제1유형으로 확인한 자료를 사용합니다. 피사체의 명예·인격을
              침해하는 용도와 기업 CI·BI로 사용하지 않습니다. 목록은 일부 잘라 표시하고 상세는 전체
              사진을 표시합니다.
            </p>
            {samplePhoto && (
              <details className="policy-photo-credits">
                <summary>가이드 표본 사진 출처</summary>
                <ul>
                  <li>
                    <a
                      href="https://commons.wikimedia.org/wiki/File:Clayarch_Gimhae_Museum.JPG"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      클레이아크 김해미술관 · HappyMidnight (2015)
                    </a>
                    {" · "}
                    <a
                      href="https://creativecommons.org/licenses/by-sa/4.0/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      CC BY-SA 4.0
                    </a>
                    {" · 일부 잘라 표시"}
                  </li>
                </ul>
              </details>
            )}
          </>
        ) : (
          <>
            <h2>{type === "privacy" ? "공개 정책" : "공개 약관"} 작성 전 확인할 항목</h2>
            <ul>
              {checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h2>{type === "privacy" ? "현재 검토 시안의 동작" : "현재 제공 범위"}</h2>
            <p>
              {type === "privacy"
                ? "소셜 로그인 화면이 있으며, 실제 이용 가능 여부는 제공자 연결과 가입 정책 준비 상태에 따라 달라집니다. 기간·홈 필터 설정은 이 탭의 sessionStorage에 저장됩니다. 공개 서비스의 수집·보관 범위는 아직 확정되지 않았습니다."
                : "이 페이지는 화면 검토 시안입니다. 직접 예약·결제·개인별 할인 판정과 요금 합계 기능은 제공하지 않습니다. 공개 운영 구성과 검토를 거쳐 실제 약관을 준비합니다."}
            </p>
            {type === "privacy" && (
              <>
                <h2>방문 통계</h2>
                <p>
                  나들이랑 운영 주소에서는 Vercel Web Analytics로 방문 수·페이지 조회·유입 경로와
                  국가·기기·브라우저별 통계를 확인합니다. 이 분석 도구는 쿠키를 사용하지 않으며,
                  회원 정보나 검색어를 별도 분석 이벤트로 보내지 않습니다. 페이지 주소의 검색 조건과
                  해시는 제거하고 로그인·내정보·설정·개발 가이드는 집계에서 제외합니다.
                </p>
                <p>
                  도구의 처리 방식은{" "}
                  <a
                    href="https://vercel.com/docs/analytics/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Vercel Web Analytics 개인정보 안내
                  </a>
                  에서 확인할 수 있습니다. 운영자 정보·접속 로그·위탁 및 국외 이전 등의 최종 고지는
                  공개 정책 검토 때 함께 확정합니다.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
