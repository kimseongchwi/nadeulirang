"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { brandPalette } from "@/config/brand";
import { DateField } from "@/features/ui-design/calendar";
import { ReviewDialog, type ReviewStyle } from "@/components/ui/dialog";
import { Icon, type IconName } from "@/components/ui/icons";
import { ongoing, photoId } from "@/features/outings/model";
import { ReviewLink, useReview } from "@/providers/review-provider";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback";
import { OutingCard } from "@/features/outings/outing-card";
import { PolicyLinks } from "@/features/policies/policy-links";

const sections = [
  ["brand-colors", "브랜드 색상"],
  ["screens", "화면"],
  ["navigation", "내비게이션"],
  ["inputs", "입력·선택"],
  ["dates", "달력"],
  ["buttons", "버튼·뒤로가기"],
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
export function GuideReview() {
  const {
    items,
    today,
    homeUrl,
    searchUrl,
    upcomingDays,
    setUpcomingDays,
  } = useReview();
  const [previewWidth, setPreviewWidth] = useState(390);
  const [message, setMessage] = useState("");
  const [menu, setMenu] = useState(false);
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
  const style: ReviewStyle = { "--guide-preview-width": `${previewWidth}px` };
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
          <ReviewLink href={homeUrl} className="button secondary">
            홈 열기 <Icon name="next" />
          </ReviewLink>
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
            <details className="guide-home-notes">
              <summary>채택한 홈 구성·기간 비교</summary>
              <p className="small">
                진행 중 → 곧 시작 → 상설 시설 순서. 각 섹션 최대 3곳, 더 보기는
                조건을 유지한 검색으로 이동합니다. 진행 중은 종료일 순, 다가오는
                것은 시작일 순, 상설은 이름순입니다.
              </p>
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
                    내일부터 {days}일
                  </option>
                ))}
              </select>
              <p className="hint">
                채택한 기본 구간은 내일부터 14일입니다. 7일·30일은 가이드의
                비교 옵션이며 기본 기준을 바꾸지 않습니다.
              </p>
            </details>
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
                  <div key={name}>
                    <Icon name={name} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <p className="hint">
                로그인·북마크·상황별 AI 추천의 자리만 보는 가이드 예시입니다.
                로그인은 상단에 버튼만, 북마크는 하단에 미연결 자리만
                표시합니다. AI 추천은 후속 배치 예시예요.
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
          <section id="cards">
            <h2>06 · 카드·상태</h2>
            <p className="section-description">
              사진 또는 종류 아이콘 옆에 이름·지역·일정을 간결하게 표시합니다.
              카드를 누르면 간단 보기 시트가 올라오고, 상세 정보 보기로 개별
              페이지에 이동해요. 사진 설명은 생략하고 출처는 간단 보기와
              상세 하단의 사진 출처에서 확인합니다. 시트는 열고 닫을 때 부드럽게 움직이며
              동작 줄이기 설정에서는 움직임을 생략해요.
            </p>
            {photoCard && <OutingCard item={photoCard} sample />}
            {realCard && <OutingCard item={realCard} sample />}
            <div className="sample">
              <div className="status-list">
                <span className="badge">행사 기간 진행 중</span>
                <span className="badge warning">운영 확인 필요</span>
                <span className="badge neutral">행사 종료</span>
                <span className="badge error">정보 조회 실패</span>
              </div>
              <p className="hint">행사 기간과 당일 운영은 구분해요. 상태는 색상과 라벨을 함께 읽습니다.</p>
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
          </section>
          <section id="states">
            <h2>07 · 로딩·빈 결과·오류</h2>
            <p className="section-description">
              같은 숲 초록 톤으로 상황을 구분합니다. 로딩에는 두 사람 심볼을
              사용하고, 빈 결과와 실패에는 차분한 안내와 다음 동작을 둡니다.
            </p>
            <div className="state-gallery">
              <article className="state-example">
                <h3>불러오는 중</h3>
                <LoadingState />
                <p className="hint">
                  파비콘과 같은 심볼 · 걷는 듯한 작은 움직임
                </p>
              </article>
              <article className="state-example">
                <h3>아직 없는 결과</h3>
                <EmptyState
                  title="조건에 맞는 곳이 없어요."
                  description="다른 지역이나 종류로 찾아볼까요?"
                >
                  <button
                    className="button secondary"
                    onClick={() =>
                      setMessage("초기화 버튼의 스타일 예시예요.")
                    }
                  >
                    초기화
                  </button>
                </EmptyState>
                <p className="hint">결과 없음 · 조회 실패와 구분</p>
              </article>
              <article className="state-example">
                <h3>불러오기 실패</h3>
                <ErrorState
                  sample
                  onRetry={() =>
                    setMessage("다시 시도 버튼의 스타일 예시예요.")
                  }
                />
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
                  <span className="symbol-preview">
                    <span
                      className="people-mask"
                      role="img"
                      aria-label="심볼 원형 미리보기"
                    />
                  </span>
                  <figcaption>원형 미리보기</figcaption>
                </figure>
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
                  "첫 웹 공개 확정 · P28",
                  "실제 데이터의 발견 홈 · 이름/지역/종류 검색 · 상세/공식 출처 · 정책 · 검색 유입",
                ],
                [
                  "첫 공개 제외 · 후속 검토",
                  "방문일/요금 필터는 운영·요금 확인 자료 확보 뒤 P32에서 검토. 정보와 미확인 표시는 상세에 유지",
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
              P12 조회 API 완료 → 화면·로고 검토 → P13 웹 화면 연결 → P14
              검색 유입·P15 운영 준비 순서. 제품 범위는 P28에서 확정했으며,
              홈 구성·로고는 채택했으며 실제 API 연결은 P13에서 진행합니다.
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
        <ReviewDialog
          open
          id="guideMenu"
          title="메뉴"
          className="menu-dialog"
          onClose={() => setMenu(false)}
        >
          <nav aria-label="전체 메뉴">
            <ReviewLink href={homeUrl} onClick={() => setMenu(false)}>
              <Icon name="home" />홈
            </ReviewLink>
            <ReviewLink href={searchUrl} onClick={() => setMenu(false)}>
              <Icon name="search" />
              검색
            </ReviewLink>
          </nav>
        </ReviewDialog>
      )}
    </div>
  );
}
