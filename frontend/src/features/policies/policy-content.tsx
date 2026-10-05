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
      <div className="callout warning">
        공개 정책 확정 전 · 검토 안내
        <br />
        실제 운영 구성 확인 후 정책·약관을 준비합니다.
      </div>
      <div className="policy-content">
        {type === "about" ? (
          <>
            <h2>나들이랑이 준비하는 것</h2>
            <p>
              축제·행사·전시·박물관·문화관광지를 발견하고 상세·공식 출처에서
              방문 정보를 확인하는 모바일 웹을 준비하고 있어요.
            </p>
            <h2>실제 확보 자료</h2>
            <p>
              수집 DB에서 공개 검토를 마친 자료를 조회합니다. 종료·취소 행사는
              홈·검색에서 제외하고 공개 가능한 기존 상세에는 상태를 표시합니다. 전체 지역은 확보한 자료를 함께 본다는
              뜻이며 전국 모든 시설을 확보했다는 의미가 아닙니다.
            </p>
            <h2>데이터 출처</h2>
            <p>
              <a
                href="https://www.data.go.kr/data/15101578/openapi.do"
                target="_blank"
                rel="noopener noreferrer"
              >
                한국관광공사 TourAPI
              </a>
              와{" "}
              <a
                href="https://www.data.go.kr/data/15017323/standard.do"
                target="_blank"
                rel="noopener noreferrer"
              >
                전국박물관미술관 표준데이터
              </a>
              를 사용합니다. 원천별 출처와 확인일은 각 상세 화면에 표시합니다.
            </p>
            <h2>사진 출처와 이용 조건</h2>
            <p>
              클레이아크 김해미술관 사진은{" "}
              <a href="https://commons.wikimedia.org/wiki/File:Clayarch_Gimhae_Museum.JPG" target="_blank" rel="noopener noreferrer">HappyMidnight · Wikimedia Commons (2015)</a>
              의 자료입니다. 이용 조건은{" "}
              <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>
              이며, 화면에서는 원본 사진의 일부를 잘라 표시합니다.
            </p>
            <h2>정보를 읽는 기준</h2>
            <p>
              행사 기간은 당일 운영·예약 가능을 보증하지 않습니다.
              요금·운영·할인·예약의 미확인 정보는 추정하지 않으며 출발 전에 공식
              기관 안내를 확인해야 합니다.
            </p>
            <h2>시안의 로컬 저장</h2>
            <p>
              이 브라우저 탭의 기간·홈 필터 설정을 sessionStorage에
              보관합니다. 계정·예약·결제·광고·분석 도구는 이 시안에 연결하지
              않았습니다.
            </p>
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
