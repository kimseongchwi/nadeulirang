"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { brandPalette } from "@/config/brand";
import { DateField } from "@/features/ui-design/calendar";
import { Dialog, type DialogStyle } from "@/components/ui/dialog";
import { Icon, type IconName } from "@/components/ui/icons";
import { ongoing, photoId } from "@/features/outings/model";
import { publicItems } from "./review-model";
import { NavigationLink, useNavigation } from "@/providers/navigation-provider";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback";
import { OutingCard } from "@/features/outings/outing-card";
import { PolicyLinks } from "@/features/policies/policy-links";
import { Pagination } from "@/features/outings/pagination";
import { AddressInformation, AdmissionInformation, EvidenceList, HoursInformation, UnknownValue } from "@/features/outings/evidence";
import { routeFeeBlocks } from "@/features/outings/fee-blocks";
import { ExpandableDetailText } from "@/features/outings/expandable-detail-text";
import type { Evidence } from "@/features/outings/api-types";

const feeSample = (field: string, value: string): Evidence => ({ field, value, source: "TOUR", sourceKey: "가이드", url: "https://www.data.go.kr/data/15101578/openapi.do", sourceReference: null, collectedAt: "2026-10-09T00:00:00Z", checkedAt: "2026-10-09T00:00:00Z", stale: false, observationId: "가이드" });

const sections = [
  ["brand-colors", "브랜드 색상"],
  ["screens", "화면"],
  ["detail-examples", "상세 요금·빈 자료"],
  ["navigation", "내비게이션"],
  ["inputs", "입력·선택"],
  ["dates", "달력"],
  ["buttons", "버튼·뒤로가기"],
  ["pagination", "페이지네이션"],
  ["cards", "카드"],
  ["states", "로딩·빈 결과·오류"],
  ["tokens", "스타일 값"],
  ["brand", "로고"],
  ["policies", "정책·안내"],
  ["featurePlan", "기능 계획"],
];
function GuideTable({
  rows,
  className = "comparison",
}: {
  rows: string[][];
  className?: string;
}) {
  return (
    <table className={className}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th>{label}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function PaginationExample({ title, initialPage, width }: { title: string; initialPage: number; width: number }) {
  const [page, setPage] = useState(initialPage);
  return <article className="guide-pagination-example">
    <h3>{title}</h3>
    <div className="guide-pagination-frame" style={{ width }} data-compact={width <= 360 || undefined}>
      <Pagination page={page} pages={8} onPageChange={setPage} label={`${title} 예시 페이지`} />
      <p className="hint" role="status" aria-live="polite">현재 {page}페이지 · 전체 8페이지</p>
    </div>
    <button type="button" className="text-button" onClick={() => setPage(initialPage)}>처음 상태로</button>
  </article>;
}
export function GuideReview() {
  const {
    today,
    homeUrl,
    searchUrl,
    upcomingDays,
    setUpcomingDays,
  } = useNavigation();
  const items = publicItems(today);
  const [previewWidth, setPreviewWidth] = useState(390);
  const [message, setMessage] = useState("");
  const [statePlacement, setStatePlacement] = useState<"page" | "area">("page");
  const [menu, setMenu] = useState(false);
  const [futureSelection, setFutureSelection] = useState("home");
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(timer);
  }, [message]);
  const realCard = items.find((item) => ongoing(item, today)) || items[0];
  const photoCard = items.find((item) => item.id === photoId);
  const detailCard = photoCard || realCard;
  const screens = [
    { label: "홈", src: `/?previewDays=${upcomingDays}` },
    { label: "검색", src: "/search" },
    {
      label: "상세",
      src: detailCard ? `/detail/${detailCard.id}` : "/search",
    },
  ];
  const style: DialogStyle = { "--guide-preview-width": `${previewWidth}px` };
  return (
    <div style={style}>
      <header className="guide-masthead">
        <div className="guide-title">
          <span className="wordmark" role="img" aria-label="나들이랑" />
          <div>
            <p className="eyebrow">모바일 웹을 위한 디자인 기준</p>
            <h1>UI 디자인 가이드</h1>
            <p className="small muted">
              서비스 화면은 모바일 기준, 가이드는 넓은 화면에서 함께 검토합니다.
            </p>
          </div>
        </div>
        <div className="row wrap">
          <NavigationLink href={homeUrl} className="button secondary">
            홈 열기 <Icon name="next" />
          </NavigationLink>
        </div>
      </header>
      <div className="guide-layout">
        <nav className="guide-jump" aria-label="가이드 목차">
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>
        <div className="guide-board">
          <section id="brand-colors" className="guide-brand-colors">
            <h2>브랜드 색상</h2>
            <p className="section-description">숲 초록을 중심으로, 색상마다 쓰임을 나눕니다.</p>
            <div className="guide-brand-palette">
              {[
                ["메인 초록", brandPalette.brand, "로고 · 버튼 · 선택 상태"],
                ["옅은 잎색", brandPalette.soft, "선택 영역 · 부드러운 강조 바탕"],
                ["따뜻한 흰색", brandPalette.background, "페이지 전체 바탕"],
              ].map(([name, color, purpose]) => (
                <article className="guide-brand-color" key={name}>
                  <span className="brand-color-chip" style={{ background: color }} aria-hidden="true" />
                  <div><h3>{name}</h3><span className="brand-color-value">{color}</span></div>
                  <p>{purpose}</p>
                </article>
              ))}
            </div>
          </section>
          <section id="screens" className="guide-screens">
            <div className="guide-section-head">
              <div>
                <h2>01 · 모바일 화면 한눈에 보기</h2>
                <p className="section-description">
                  실제 시안을 같은 너비로 나란히 봅니다. 각 화면 안에서
                  스크롤·검색·필터를 직접 사용할 수 있어요.
                </p>
              </div>
              <div className="guide-width-control">
                <label htmlFor="previewWidth">모바일 미리보기 너비</label>
                <select
                  id="previewWidth"
                  value={previewWidth}
                  onChange={(event) =>
                    setPreviewWidth(Number(event.target.value))
                  }
                >
                  <option value="320">320px · 작은 화면</option>
                  <option value="390">390px · 기본</option>
                  <option value="430">430px · 넓은 화면</option>
                </select>
              <label htmlFor="upcomingDays">다가오는 기간 비교</label>
              <select
                id="upcomingDays"
                value={upcomingDays}
                onChange={(event) => {
                  const days = Number(event.target.value);
                  setUpcomingDays(days);
                  setMessage(`홈의 다가오는 기간을 ${days}일로 바꿨어요.`);
                }}
              >
                {[7, 14, 30].map((days) => (
                  <option key={days} value={days}>
                    내일부터 {days}일 · {days === 14 ? "채택 기준" : "가이드 비교"}
                  </option>
                ))}
              </select>
              </div>
            </div>
            <div className="guide-screen-grid">
              {screens.map((screen) => (
                <figure className="guide-screen" key={screen.label}>
                  <figcaption>
                    <strong>{screen.label}</strong>
                  </figcaption>
                  <div className="guide-preview-frame">
                    <iframe
                      src={screen.src}
                      title={`모바일 ${screen.label} 미리보기`}
                      loading="lazy"
                    />
                  </div>
                </figure>
              ))}
            </div>
            <div className="guide-home-notes">
              <h3>채택한 홈 구성·기간 비교</h3>
              <p className="small">
                진행 중 → 곧 시작 → 상설 시설 순서. 각 섹션 최대 3곳, 더 보기는
                조건을 유지한 검색으로 이동합니다. 진행 중은 종료일 순, 다가오는
                것은 시작일 순, 상설은 이름순입니다.
              </p>

              <p className="hint">
                채택한 기본 구간은 내일부터 14일입니다. 7일·30일은 가이드의
                비교 옵션이며 기본 기준을 바꾸지 않습니다.
              </p>
            </div>
          </section>
          <section id="detail-examples" className="guide-detail-examples">
            <h2>상세 요금·빈 자료 예시</h2>
              <p className="section-description">표시 검토용 표본입니다. 공통 출처·이용 조건은 푸터에서 확인합니다. 서로 다른 요금 자료는 각 묶음의 항목·조건과 여백으로 구분합니다. 사용자 선택에 따른 대상별 요금표 사례는 별도 전부 무료 자료를 화면에서 생략합니다. 실제 상세 갤러리는 위 미리보기를 사용해요.</p>
            <div className="guide-detail-grid">
              <div className="sample"><dl className="detail-facts"><div><dt>입장료 안내 · 그룹 표본</dt><dd><EvidenceList presentation="fee" values={[feeSample("usefee", "[개인]- 일반 1,500원- 청소년 1,000원- 어린이 800원[단체(10인 이상)]- 일반 1,000원- 청소년 700원- 어린이 500원 [개인/단체 도민]- 일반 750원- 청소년 500원- 어린이 400원")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>체험·추가 요금 · 복합 표본</dt><dd><EvidenceList presentation="fee" values={[feeSample("etcChrgeInfo", "단체 관람료 1000원+교육체험(보호자 입장권 2000원+아트키친 타일액자 10000원+소품 15000원+컬러링세라믹 10000원)+무료(유치원생~초등학생)")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>체험·추가 요금 · 무료 조건</dt><dd><EvidenceList presentation="fee" values={[feeSample("etcChrgeInfo", "무료(김치체험학교 유료)")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>입장료 안내 · 항목 구분</dt><dd><EvidenceList presentation="fee" values={[feeSample("usefee", "돔하우스 5,000원(공사에 따른 휴관)- 큐빅하우스 3,000원")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>주차 요금</dt><dd><EvidenceList presentation="fee" showLabels={false} values={[feeSample("parkingfee", "무료")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>입장료 안내 · 요금/무료 조건</dt><dd><EvidenceList presentation="fee" values={[feeSample("usefee", "[이용요금]\n- 개인 5,000원\n- 소인 및 경로우대자 4,500원\n- 곡성군민, 국가유공자, 장애인 무료\n- 단체(대인 30명 이상 / 소인·경로 15명 이상) : 대인 4,500원 / 소인 4,000원\n- 축제 기간 중 초등학생 이하 무료 입장")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>운영 시간 · 기간/입장 마감</dt><dd><HoursInformation values={[feeSample("usetime", "[1월~2월/11월~12월]09:00~17:00 (입장마감 16:00)[3월~5월/9월~10월]09:00~18:00 (입장마감 17:00)")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>운영 시간 · 평일/휴일</dt><dd><HoursInformation values={[feeSample("weekdayOperOpenHhmm", "09:00"), feeSample("weekdayOperColseHhmm", "17:00"), feeSample("holidayOperOpenHhmm", "10:00"), feeSample("holidayCloseOpenHhmm", "18:00")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>운영 시간 · 1부/2부</dt><dd><HoursInformation values={[feeSample("usetimefestival", "1부 - 18:20~20:10 / 2부 - 19:30~21:20")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>운영 시간 · 월별 관람/체험</dt><dd><HoursInformation values={[feeSample("usetimeculture", "[관람시간]<br>\n- 3월~11월 10:00~18:00<br>\n- 12월~2월 10:00~17:00<br>\n※ 관람 시 종료 40분 전까지 입장<br>\n[체험시간]<br>\n- 10:00~16:00<br>\n※ 체험 시 종료 1시간 전까지 입장")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>운영 시간 · 계절별 회차 시각</dt><dd><HoursInformation values={[feeSample("playtime", "- 하절기(3월~9월) 20:00, 22:00- 동절기(10월~2월) 19:00, 21:00")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>휴관·휴무</dt><dd><EvidenceList presentation="closedDays" values={[feeSample("restdate", "매주 화요일 ※ 단, 정기휴일이 공휴일 및 대체공휴일과 겹칠 경우에는 개방하며, 그 다음의 첫 번째 비공휴일이 정기휴일임")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>휴관·휴무 · 별도 항목</dt><dd><EvidenceList presentation="closedDays" values={[feeSample("restdateculture", "매주 토요일~일요일 / 1월 1일 / 설·추석 연휴 / 법정 공휴일")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>입장료 안내 · 대상/개인/단체</dt><dd><EvidenceList presentation="fee" facilityName="강릉 오죽헌·시립박물관" values={[feeSample("usefee", "[오죽헌·시립박물관]- 어른 : 개인 3,000원 / 단체 2,000원- 청소년·군인 : 개인 2,000원 / 단체 1,500원- 어린이 : 개인 1,000원 / 단체 500원※ 무료 : 만65세 이상 / 강릉 시민 본인 / 만 6세 이하 미취학 아동※ 단체 : 30명 이상")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>주차 요금 · 기본/초과</dt><dd><EvidenceList presentation="fee" showLabels={false} values={[feeSample("parkingfee", "[소형차] 기본 1시간 3,000원 / 초과 시 매 10분마다 800원[중·대형차] 기본 1시간 5,000원 / 초과 시 매 10분마다 800원")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>주소</dt><dd><AddressInformation values={[feeSample("rdnmadr", "서울특별시 종로구 사직로 161"), feeSample("addr2", "광화문 입구")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>한국어안내서비스</dt><dd><EvidenceList presentation="service" showLabels={false} values={[feeSample("infotext", "가능(화요일~일요일 10:00~17:00)※ 전화 문의 : 063-626-1330")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>외국어안내서비스 · 언어/예약 조건</dt><dd><EvidenceList presentation="service" showLabels={false} values={[feeSample("infotext", "가능(한국어, 영어(사전 예약), 단체 유료)※ 전화 문의 : 063-626-1330")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>연락처 · 빈 자료</dt><dd><UnknownValue /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>운영 시간 · 하절기/동절기</dt><dd><HoursInformation values={[feeSample("usetimeculture", "- 하절기(3~10월) 09:00~18:00- 동절기(11~2월) 09:00~17:00")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>예약 안내 · 내국인</dt><dd><EvidenceList values={routeFeeBlocks({notes:[feeSample("infoname", "내국인예약안내"), feeSample("infotext", "가능")]}).reservation || []} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>예약 안내 · 단체 사전예약</dt><dd><EvidenceList values={routeFeeBlocks({notes:[feeSample("infoname", "내국인예약안내"), feeSample("infotext", "단체 사전 전화예약")]}).reservation || []} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>예약 안내 · 접수 조건</dt><dd><EvidenceList values={[feeSample("infotext", "전화 예약 가능(관람 당일 30분 전 접수 가능)")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>연락처 · 기관별 전화</dt><dd><EvidenceList presentation="contact" values={[feeSample("infocenterculture", "거제시청 농업정책과 055-639-6311거제시농업개발원 0507-1344-6421")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>연락처 · 운영기관/시설</dt><dd><EvidenceList presentation="contact" values={[feeSample("operPhoneNumber", "053-659-4900"), feeSample("phoneNumber", "053-668-2796")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>입장료 안내 · 서로 다른 자료</dt><dd><AdmissionInformation values={[]} alternatives={[[feeSample("adultChrge", "1000"), feeSample("childChrge", "0"), feeSample("yngbgsChrge", "1000")], [feeSample("usefee", "- 돔하우스 5,000원(공사에 따른 휴관)- 큐빅하우스 3,000원※ 요금 감경 대상자 및 자세한 안내는 홈페이지 참조")]]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts"><div><dt>입장료 안내 · 대상별 요금표 우선</dt><dd><AdmissionInformation values={[]} alternatives={[[feeSample("adultChrge", "0"), feeSample("childChrge", "0"), feeSample("yngbgsChrge", "0")], [feeSample("usefee", "일반 성인 3000/일반 어린이, 청소년 2000/달성군민 성인 1500/달성군민 어린이, 청소년 1000")]]} discount={[feeSample("etcChrgeInfo", "달성군민 50 할인, 미취학, 장애인, 국가유공자 등 조례에 따른 무료입장")]} /></dd></div><div><dt>할인 안내</dt><dd><EvidenceList values={[feeSample("etcChrgeInfo", "달성군민 50 할인, 미취학, 장애인, 국가유공자 등 조례에 따른 무료입장")]} /></dd></div></dl></div>
              <div className="sample"><h3>공식 안내</h3><a className="source-link detail-official-link" href="https://www.data.go.kr/data/15101578/openapi.do" target="_blank" rel="noopener noreferrer"><strong>홈페이지 보기</strong><span aria-hidden="true">↗</span></a></div>
              <div className="sample"><dl className="detail-facts detail-programs"><div><dt>행사 내용 · 연속 번호/변경 안내</dt><dd><ExpandableDetailText emphasizeHeadings values={[feeSample("program", "1. 도슭수라상 체험\n2. 경복궁 야간탐방\n- 탐방로: 계조당→외소주방→자경전→집옥재&팔우정→건청궁→향원정\n※ 상황에 따라 동선은 변경될 수 있습니다.")]} /></dd></div></dl></div>
              <div className="sample"><dl className="detail-facts detail-programs"><div><dt>행사 내용 · 전시 기간/매주 공연</dt><dd><ExpandableDetailText emphasizeHeadings values={[feeSample("program", "- 주요 프로그램 : 상설전시 / 기획전시 / 공연\n\n1. 상설전시 2026.06.04.~2026.12.31\n2. 기획전시 2026.07.15.~2026.12.31.\n3. 공연 매주 수요일 12:10")]} /></dd></div></dl></div>
            </div>
          </section>
          <section id="navigation">
            <h2>02 · 상단·하단 내비게이션</h2>
            <p className="section-description">
              첨부 화면의 역할 분리를 나들이랑에 맞게 적용해요.
            </p>
            <div className="sample">
              <h3>지금의 구성</h3>
              <dl className="guide-navigation-facts">
                <div><dt>상단</dt><dd>로고 · 검색 · 햄버거 · 로그인</dd></div>
                <div><dt>하단</dt><dd>홈 · 북마크</dd></div>
                <div><dt>메뉴</dt><dd>홈 · 검색</dd></div>
                <div><dt>홈 필터</dt><dd>지역 · 종류를 바텀시트에서 선택</dd></div>
                <div><dt>정책·출처</dt><dd>서비스 푸터</dd></div>
              </dl>
              <p className="hint">로그인·북마크는 자리만 표시하며 기능은 후속입니다.</p>
            </div>
            <div className="sample">
              <h3>후속 구성 예시 · 구현 보류</h3>
              <div className="future-header">
                <span className="wordmark" role="img" aria-label="나들이랑" />
                <span>
                  <Icon name="search" />
                </span>
                <span>
                  <Icon name="menu" />
                </span>
                <button
                  className="button primary login-placeholder"
                  disabled
                  title="로그인 기능 준비 중"
                >
                  로그인
                </button>
              </div>
              <div className="future-nav">
                {(
                  [
                    ["home", "홈"],
                    ["bookmark", "북마크"],
                    ["spark", "AI 추천"],
                  ] satisfies [IconName, string][]
                ).map(([name, label]) => (
                  <button key={name} type="button" aria-pressed={futureSelection === name} aria-label={`${label} 선택 상태 예시`} onClick={() => setFutureSelection(name)}>
                    <Icon name={name} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <p className="hint">
                로그인·북마크·상황별 AI 추천의 자리만 보는 가이드 예시입니다.
                버튼은 선 아이콘을 유지하고 진한 초록색·라벨 700·조금 굵은 선으로 선택을 구분합니다.
                북마크 저장이나 AI 추천을 실행하지 않아요.
              </p>
            </div>
            <div className="sample menu-comparison">
              <h3>메뉴 구성 비교</h3>
              <GuideTable
                className="guide-table menu-comparison-table"
                rows={[
                  [
                    "현재 구성",
                    "하단은 홈·북마크 자리, 검색은 상단과 햄버거에서 이동합니다. 정책·출처는 서비스 푸터에서 확인해요.",
                  ],
                  [
                    "하단바만",
                    "이동은 간단하지만 정책·출처·후속 메뉴까지 늘면 좁아져요. 보조 링크를 본문 하단에 두어야 해요.",
                  ],
                  [
                    "햄버거 중심",
                    "화면을 넓게 쓰지만 홈·검색까지 메뉴를 열어야 해요. 반복 이동에 한 단계가 더 들어갑니다.",
                  ],
                ]}
              />
              <p className="hint">
                하단 검색은 제거하고 북마크 자리를 유지합니다. 저장 기능은
                아직 연결하지 않았어요.
              </p>
            </div>
          </section>
          <section id="inputs">
            <h2>03 · 인풋·셀렉트</h2>
            <div className="sample stack">
              <div>
                <label htmlFor="guideInput">기본 입력</label>
                <input id="guideInput" placeholder="행사 또는 시설 이름" />
                <p className="hint">
                  16px 본문, 높이 44px 이상 · 터치 시 확대 방지
                </p>
              </div>
              <div>
                <label htmlFor="guideSelect">지역 선택</label>
                <select id="guideSelect">
                  <option>전체 지역</option>
                  {[...new Set(items.map((item) => item.region_name))].map(
                    (region) => (
                      <option key={region}>{region}</option>
                    ),
                  )}
                </select>
                <p className="hint">
                  입력 높이·여백·얇은 화살표를 통일합니다. 선택 목록은
                  OS·브라우저 입력을 유지해요.
                </p>
              </div>
              <div>
                <label htmlFor="guideError">오류 상태 · 스타일 예시</label>
                <input
                  id="guideError"
                  defaultValue="2026-02-30"
                  aria-invalid="true"
                  aria-describedby="guideErrorText"
                />
                <p className="error-text" id="guideErrorText">
                  올바른 날짜를 입력해 주세요.
                </p>
              </div>
              <div>
                <label htmlFor="guideDisabled">비활성 상태 · 스타일 예시</label>
                <input
                  id="guideDisabled"
                  placeholder="아직 선택할 수 없어요"
                  disabled
                />
              </div>
            </div>
          </section>
          <section id="dates">
            <h2>04 · 날짜 선택</h2>
            <div className="sample">
              <DateField />
              <p className="hint">
                연도·월을 눌러 연도를 고릅니다. 오늘은 테두리와 ‘오늘’ 표시로 구분하며
                날짜를 눌러 선택해요.
              </p>
              <p className="hint">
                지우기는 모달 하단 왼쪽, 취소·완료는 오른쪽에 둡니다. 선택 값이
                있을 때 입력 옆의 ×로도 지울 수 있어요.
              </p>
            </div>
            <p className="hint">
              직접 제어 달력의 검토 시안입니다. 실기기·스크린리더·웹뷰 검증은
              제품 적용 때 수행합니다.
            </p>
          </section>
          <section id="buttons">
            <h2>05 · 버튼·뒤로가기</h2>
            <div className="sample">
              <div className="row wrap">
                <button
                  className="button primary"
                  onClick={() => setMessage("기본 동작 버튼을 눌렀어요.")}
                >
                  기본 동작
                </button>
                <button
                  className="button secondary"
                  onClick={() => setMessage("보조 동작 버튼을 눌렀어요.")}
                >
                  보조 동작
                </button>
                <button
                  className="button selected"
                  aria-pressed="true"
                  onClick={() => setMessage("선택 상태의 예시예요.")}
                >
                  <Icon name="check" /> 선택됨
                </button>
                <button className="button secondary" disabled>
                  비활성
                </button>
              </div>
              <div className="row wrap">
                <button
                  className="icon-button"
                  onClick={() => setMessage("뒤로가기 아이콘의 스타일 예시예요.")}
                  aria-label="뒤로가기 아이콘 예시"
                >
                  <Icon name="back" />
                </button>
                <button className="back-label" onClick={() => setMessage("이전 화면 버튼의 스타일 예시예요.")}>
                  <Icon name="back" />
                  이전 화면
                </button>
                <button
                  className="icon-button"
                  onClick={() => setMenu(true)}
                  aria-label="보조 메뉴 열기"
                >
                  <Icon name="menu" />
                </button>
              </div>
              <p className="hint">
                여기서는 스타일만 확인하며 페이지를 이동하지 않습니다.
                서비스의 뒤로 가기는 이전 화면·조건·스크롤로 복귀합니다. 직접 들어온
                페이지는 검색으로 이동합니다. 최소 44px 터치 영역, 포커스 때
                레이아웃 크기는 유지해요.
              </p>
            </div>
          </section>
          <section id="pagination">
            <div className="guide-section-head">
              <div>
                <h2>페이지네이션</h2>
                <p className="section-description">번호와 화살표를 눌러 현재 페이지와 양 끝의 비활성 상태를 확인해 보세요.</p>
              </div>
              <div className="guide-width-control">
                <label htmlFor="paginationWidth">페이지네이션 예시 너비</label>
                <select id="paginationWidth" value={previewWidth} onChange={(event) => setPreviewWidth(Number(event.target.value))}>
                  <option value="320">320px · 작은 화면</option>
                  <option value="390">390px · 기본</option>
                  <option value="430">430px · 넓은 화면</option>
                </select>
              </div>
            </div>
            <div className="guide-pagination-grid">
              <PaginationExample title="첫 페이지에서 시작" initialPage={1} width={previewWidth} />
              <PaginationExample title="중간 페이지에서 시작" initialPage={4} width={previewWidth} />
              <PaginationExample title="마지막 페이지에서 시작" initialPage={8} width={previewWidth} />
            </div>
            <p className="hint">검색 화면과 같은 44px 선택 영역과 현재 페이지 표시예요. 번호는 최대 5개, 360px 이하에서는 주변 3개로 줄어듭니다. 결과가 한 페이지뿐이면 페이지네이션은 생략해요. 예시의 선택은 이 영역 안에서만 바뀝니다.</p>
          </section>
          <section id="cards">
            <h2>06 · 카드·상태</h2>
            <p className="section-description">
              사진 또는 종류 아이콘 옆에 이름·지역·일정을 간결하게 표시합니다.
              카드를 누르면 간단 보기 시트가 올라오고, 상세 정보 보기로 개별
              페이지에 이동해요. 사진 설명은 생략하고 출처·이용 조건은
              푸터의 서비스·데이터 출처에서 확인합니다. 시트는 열고 닫을 때 부드럽게 움직이며
              동작 줄이기 설정에서는 움직임을 생략해요.
            </p>
            {photoCard && <OutingCard item={photoCard} sample />}
            {realCard && <OutingCard item={realCard} sample />}
            <div className="sample">
              <div className="status-list">
                <span className="badge">행사 기간 진행 중</span>
                <span className="badge warning">운영 정보 미확인</span>
                <span className="badge neutral">행사 종료</span>
                <span className="badge error">정보 조회 실패</span>
              </div>
              <p className="hint">상태는 색상과 라벨을 함께 읽습니다.</p>
            </div>
            <div className="sample">
              <h3>무료·유료·미확인 · 스타일 예시</h3>
              <p className="small muted">
                아래는 가이드 전용 상태이며 특정 시설의 요금 정보가 아닙니다.
              </p>
              <dl className="info-list">
                <dt>무료 예시</dt>
                <dd>일반 입장 무료 · 체험 별도</dd>
                <dt>유료 예시</dt>
                <dd>일반 성인 요금 확인 필요</dd>
                <dt>미확인 예시</dt>
                <dd>요금 미확인 · 0원으로 바꾸지 않음</dd>
              </dl>
            </div>
            <div className="sample">
              <h3>상세 본문·조건 안내</h3>
              <p className="small muted">주소·예약·언어 안내 등 단독 자료 값과 좌우 행의 왼쪽 항목명은 15px·600, 오른쪽 일반 값과 소개·프로그램 본문은 15px·400입니다. 프로그램 번호 제목과 무료 값은 15px·600, 그 밖의 그룹 제목은 14px·600, 가격은 15px·500, 보조 조건·문의는 13px·400입니다. 긴 본문은 처음 5줄/더 보기·접기를 유지합니다.</p>
              <p className="hint">개인·단체·주민·무료 조건은 요금 행에서 함께 읽고, 전화 문의 같은 주석은 다음 줄의 보통 굵기로 표시합니다. 요금 괄호·요일·기간을 보존하며 체험·셔틀은 추가 요금, 주차는 독립 행으로 구분합니다.</p>
            </div>
          </section>
          <section id="states">
            <div className="guide-section-head">
              <div>
                <h2>07 · 로딩·빈 결과·오류</h2>
                <p className="section-description">
                  전체 페이지 안내는 본문 가운데보다 조금 위에, 목록 일부·팝업
                  안내는 해당 영역 가운데에 표시합니다. 로딩·빈 결과·실패를 구분하고
                  다음 동작을 유지합니다.
                </p>
              </div>
              <div className="guide-width-control">
                <label htmlFor="statePlacement">상태 안내 위치</label>
                <select id="statePlacement" value={statePlacement} onChange={(event) => setStatePlacement(event.currentTarget.value === "page" ? "page" : "area")}>
                  <option value="page">전체 페이지 · 조금 위</option>
                  <option value="area">부분 영역·팝업 · 가운데</option>
                </select>
              </div>
            </div>
            <div className="state-gallery">
              <article className="state-example">
                <h3>불러오는 중</h3>
                <div className="state-example-stage"><LoadingState placement={statePlacement} /></div>
                <p className="hint">
                  파비콘과 같은 심볼 · 걷는 듯한 작은 움직임
                </p>
              </article>
              <article className="state-example">
                <h3>아직 없는 결과</h3>
                <div className="state-example-stage">
                  <EmptyState
                    placement={statePlacement}
                    title="조건에 맞는 곳이 없어요."
                    description="다른 지역이나 종류로 찾아볼까요?"
                  >
                    <button
                      className="button secondary"
                      onClick={() => setMessage("초기화 버튼의 스타일 예시예요.")}
                    >
                      초기화
                    </button>
                  </EmptyState>
                </div>
                <p className="hint">결과 없음 · 조회 실패와 구분</p>
              </article>
              <article className="state-example">
                <h3>불러오기 실패</h3>
                <div className="state-example-stage">
                  <ErrorState
                    placement={statePlacement}
                    sample
                    onRetry={() => setMessage("다시 시도 버튼의 스타일 예시예요.")}
                  />
                </div>
                <p className="hint">실패 안내 · 다시 시도할 수 있게</p>
              </article>
            </div>
            <p className="hint">
              동작은 스타일 예시입니다. 기기의 움직임 줄이기 설정에서는 로딩
              심볼을 고정해서 보여줍니다.
            </p>
          </section>
          <section id="tokens">
            <h2>08 · 글자·간격·보조 색상</h2>
            <p className="section-description">
              글자·간격과 정보 상태를 구분하는 보조 색상입니다.
            </p>
            <div className="token-grid">
              {[
                ["본문", "#202832"],
                ["보조 글자", "#586574"],
                ["주의", "#805513"],
                ["오류", "#A92D3B"],
                ["입력 경계", "#7F8B99"],
                ["구분선", "#D6DDE5"],
              ].map(([name, color]) => (
                <div className="token" key={name}>
                  <span className="swatch" style={{ background: color }} />
                  <span>
                    {name}
                    <br />
                    {color}
                  </span>
                </div>
              ))}
            </div>
            <GuideTable
              className="guide-table"
              rows={[
                ["글꼴", "맑은 고딕 / Apple SD Gothic Neo / sans-serif"],
                ["제목", "모바일 24px / PC 28px · 700"],
                ["섹션·카드", "20px / 17px · 700 · 개편 검토안"],
                ["모달·시트 상단 제목", "18px · 700 · 본문색 · 줄높이 1.5"],
                ["본문·보조", "16px / 14px · 줄높이 1.6"],
                ["간격", "4 · 8 · 12 · 16 · 24 · 32px"],
                ["모서리", "검색 입력 4px · 발견 카드 18px · 홈 강조 22px · 상세 12~20px · 검토안"],
                ["포커스", "입력 1px 링 · 버튼 2px 외곽선, 2px 간격"],
                ["레이아웃", "중앙 여백 200px · 안내 320px · PC 서비스 최대 480px"],
                ["스크롤", "PC는 서비스 본문 안에서 이동 · 모바일은 화면 전체 너비 사용"],
                [
                  "하단 안전 영역",
                  "76px + safe-area-inset-bottom, 본문 끝 여백",
                ],
              ]}
            />
          </section>
          <section id="brand">
            <h2>09 · 현재 로고·심볼</h2>
            <p className="section-description">
              채택한 한글 로고·두 사람 심볼을 숲 초록으로 표시합니다.
              웹에서는 현재 투명 PNG 원본과 같은 심볼의 파비콘을 사용합니다.
            </p>
            <div className="sample">
              <div className="brand-samples">
                {[
                  [112, "모바일 헤더"],
                  [216, "PC 안내"],
                ].map(([width, label]) => (
                  <figure key={label}>
                    <span
                      className="wordmark"
                      role="img"
                      aria-label={
                        label === "PC 안내" ? "PC 안내 로고" : "현재 한글 로고"
                      }
                      style={{ width: Number(width) }}
                    />
                    <figcaption>
                      {label} {width}px
                    </figcaption>
                  </figure>
                ))}
              </div>
              <p className="hint">
                ‘랑’ 옆점 없이 둥근 열린 받침 유지 · 현재 모양과 비율 채택
              </p>
            </div>
            <div className="sample">
              <div className="brand-samples">
                {[16, 32, 48].map((size) => (
                  <figure key={size}>
                    <span
                      className="people-mask"
                      role="img"
                      aria-label={`두 사람 심볼 ${size}px`}
                      style={{ display: "block", width: size, height: size }}
                    />
                    <figcaption>{size}px</figcaption>
                  </figure>
                ))}
                <figure>
                  <Image
                    src="/icon"
                    width={32}
                    height={32}
                    alt="현재 탭 파비콘 32px"
                    unoptimized
                  />
                  <figcaption>현재 파비콘 32px</figcaption>
                </figure>
              </div>
              <p className="hint">
                로고·심볼·파비콘은 같은 브랜드색을 사용합니다. 스타일이 바뀌면
                함께 갱신합니다. 공개 전 유사 상표 확인은 남아 있으며,
                앱용 아이콘 크기·마스크·여백은 P23에서 준비합니다.
              </p>
            </div>
          </section>
          <section id="policies">
            <h2>10 · 정책·하단 안내</h2>
            <p className="small muted">
              정책·출처는 서비스 푸터에서 바텀시트로 열립니다. 뒤로
              가기로 닫으면 보던 화면을 유지해요.
            </p>
            <PolicyLinks variant="buttons" />
          </section>
          <section id="featurePlan">
            <h2>11 · 기능 계획 다시 보기</h2>
            <p className="section-description">
              비교를 제외하고, 북마크·로그인·AI는 후속으로 보류합니다.
            </p>
            <GuideTable
              rows={[
                [
                  "실제 제공 · P12·P13·P44",
                  "현재 DB 자료의 홈 · 이름/지역/종류 검색 · 상세/공식 출처 · 정책 · 대표 사진",
                ],
                [
                  "이번 개선 · P76·P77·P78",
                  "저장 원문 기반 추가 사진 · 상세 수동 갤러리 · 푸터/상세 안내 · 가이드·토스트 개선. 화면 검증과 디자인 확정은 구분",
                ],
                [
                  "공개 전 작업 · P14·P15·P25",
                  "SEO · 운영 환경/정책/원천 한도 · 유사 상표 확인은 미완료",
                ],
                [
                  "검토 중 · P27",
                  "날짜 입력·달력의 가이드 검토. 첫 공개 날짜 필터는 활성화하지 않음",
                ],
                [
                  "후속 보류",
                  "P29 북마크 · P30 로그인 · P31 상황별 AI 추천. 북마크·로그인은 미연결 자리만 표시하고 AI 추천은 실제 메뉴에서 제외",
                ],
                [
                  "필요할 때 재검토",
                  "P32 날짜/요금 필터 · 비교 · 예상 합계. 과거 기준을 자동 재도입하지 않음",
                ],
                [
                  "웹 완성 뒤",
                  "P23 같은 모바일 웹을 사용하는 웹뷰 앱, 확정 심볼의 앱용 아이콘",
                ],
              ]}
            />
            <p className="hint">
              P12 조회 API·P13 웹 화면 연결 완료 → P14
              검색 유입·P15 운영 준비 순서. 제품 범위는 P28에서 확정했으며,
              채택한 홈·로고로 실제 API를 연결했습니다. 카드 예시는 검토 표본이며 화면 미리보기는 현재 DB 자료를 조회합니다.
            </p>
          </section>
        </div>
      </div>
      {message && (
        <p className="toast" role="status" aria-live="polite">
          {message}
        </p>
      )}
      {menu && (
        <Dialog
          open
          id="guideMenu"
          title="메뉴"
          className="menu-dialog"
          onClose={() => setMenu(false)}
        >
          <nav aria-label="전체 메뉴">
            <NavigationLink href={homeUrl} onClick={() => setMenu(false)}>
              <Icon name="home" />홈
            </NavigationLink>
            <NavigationLink href={searchUrl} onClick={() => setMenu(false)}>
              <Icon name="search" />
              검색
            </NavigationLink>
          </nav>
        </Dialog>
      )}
    </div>
  );
}
