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
import { OutingCard } from "@/features/outings/outing-card";
import { PolicyLinks } from "@/features/policies/policy-links";
import { Pagination } from "@/features/outings/pagination";
import type { ApiResult, Page } from "@/features/outings/api-types";
import { DetailExamples } from "./detail-examples";
import { StateExamples } from "./state-examples";
import { AdPlacementPreview } from "./ad-placement-preview";

const sections = [
  ["brand-colors", "브랜드 색상"],
  ["screens", "화면"],
  ["ad-placement", "광고 위치"],
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
function GuideTable({ rows, className = "comparison" }: { rows: string[][]; className?: string }) {
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
function PaginationExample({
  title,
  initialPage,
  width,
}: {
  title: string;
  initialPage: number;
  width: number;
}) {
  const [page, setPage] = useState(initialPage);
  return (
    <article className="guide-pagination-example">
      <h3>{title}</h3>
      <div
        className="guide-pagination-frame"
        style={{ width }}
        data-compact={width <= 360 || undefined}
      >
        <Pagination
          page={page}
          pages={8}
          onPageChange={setPage}
          label={`${title} 예시 페이지`}
        />
        <p
          className="hint"
          role="status"
          aria-live="polite"
        >
          현재 {page}페이지 · 전체 8페이지
        </p>
      </div>
      <button
        type="button"
        className="text-button"
        onClick={() => setPage(initialPage)}
      >
        처음 상태로
      </button>
    </article>
  );
}
export function GuideReview({ adPreview }: { adPreview: ApiResult<Page> }) {
  const { today, homeUrl, upcomingDays, setUpcomingDays } = useNavigation();
  const items = publicItems(today);
  const [previewWidth, setPreviewWidth] = useState(390);
  const [message, setMessage] = useState("");
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
    { label: "내정보", src: "/mypage" },
    { label: "로그인", src: "/login" },
    { label: "FAQ", src: "/faq" },
    { label: "공지사항", src: "/notices" },
    { label: "찾을 수 없는 페이지", src: "/notices/missing" },
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
          <span
            className="wordmark"
            role="img"
            aria-label="나들이랑"
          />
          <div>
            <p className="eyebrow">모바일 웹을 위한 디자인 기준</p>
            <h1>UI 디자인 가이드</h1>
            <p className="small muted">
              서비스 화면은 모바일 기준, 가이드는 넓은 화면에서 함께 검토합니다.
            </p>
          </div>
        </div>
        <div className="row wrap">
          <NavigationLink
            href={homeUrl}
            className="button secondary"
          >
            홈 열기 <Icon name="next" />
          </NavigationLink>
        </div>
      </header>
      <div className="guide-layout">
        <nav
          className="guide-jump"
          aria-label="가이드 목차"
        >
          {sections.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="guide-board">
          <section
            id="brand-colors"
            className="guide-brand-colors"
          >
            <h2>브랜드 색상</h2>
            <p className="section-description">숲 초록을 중심으로, 색상마다 쓰임을 나눕니다.</p>
            <div className="guide-brand-palette">
              {[
                ["메인 초록", brandPalette.brand, "로고 · 버튼 · 선택 상태"],
                ["옅은 잎색", brandPalette.soft, "선택 영역 · 부드러운 강조 바탕"],
                ["따뜻한 흰색", brandPalette.background, "페이지 전체 바탕"],
              ].map(([name, color, purpose]) => (
                <article
                  className="guide-brand-color"
                  key={name}
                >
                  <span
                    className="brand-color-chip"
                    style={{ background: color }}
                    aria-hidden="true"
                  />
                  <div>
                    <h3>{name}</h3>
                    <span className="brand-color-value">{color}</span>
                  </div>
                  <p>{purpose}</p>
                </article>
              ))}
            </div>
          </section>
          <section
            id="screens"
            className="guide-screens"
          >
            <div className="guide-section-head">
              <div>
                <h2>모바일 화면 한눈에 보기</h2>
                <p className="section-description">
                  실제 시안을 같은 너비로 나란히 봅니다. 각 화면 안에서 스크롤·검색·필터를 직접
                  사용할 수 있어요.
                </p>
              </div>
              <div className="guide-width-control">
                <label htmlFor="previewWidth">모바일 미리보기 너비</label>
                <select
                  id="previewWidth"
                  value={previewWidth}
                  onChange={(event) => setPreviewWidth(Number(event.target.value))}
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
                    <option
                      key={days}
                      value={days}
                    >
                      내일부터 {days}일 · {days === 14 ? "채택 기준" : "가이드 비교"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="guide-home-notes">
              <p>진행 중(종료일순) → 곧 시작(시작일순) → 상설(이름순) · 섹션별 최대 3곳</p>
              <p>더 보기는 조건 유지 · 기본 내일부터 14일, 7·30일은 비교용</p>
            </div>
            <div className="guide-screen-grid">
              {screens.map((screen) => (
                <figure
                  className="guide-screen"
                  key={screen.label}
                >
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
          </section>
          <section
            id="ad-placement"
            className="guide-ad-placement"
          >
            <div className="guide-section-head">
              <h2>목록 중간 광고 위치</h2>
              <div className="guide-width-control">
                <label htmlFor="adPreviewWidth">광고 목록 미리보기 너비</label>
                <select
                  id="adPreviewWidth"
                  value={previewWidth}
                  onChange={(event) => setPreviewWidth(Number(event.target.value))}
                >
                  <option value="320">320px · 작은 화면</option>
                  <option value="390">390px · 기본</option>
                  <option value="430">430px · 넓은 화면</option>
                </select>
              </div>
            </div>
            <p className="section-description">
              실제 목록의 6번째·14번째 카드 뒤에 광고 자리를 표시합니다. 위치·크기는 검토용이며 실제
              광고는 불러오지 않습니다.
            </p>
            <AdPlacementPreview result={adPreview} />
          </section>
          <DetailExamples />
          <section id="navigation">
            <h2>상단·하단 내비게이션</h2>
            <p className="section-description">
              검색은 상단, 자주 묻는 질문과 공지사항은 하단 내정보에서 열어요.
            </p>
            <div className="sample">
              <h3>지금의 구성</h3>
              <dl className="guide-navigation-facts">
                <div>
                  <dt>상단</dt>
                  <dd>로고 · 검색 · 햄버거 · 로그인</dd>
                </div>
                <div>
                  <dt>하단</dt>
                  <dd>홈 · 북마크 · 내정보</dd>
                </div>
                <div>
                  <dt>햄버거 메뉴</dt>
                  <dd>홈 · 내정보</dd>
                </div>
                <div>
                  <dt>내정보</dt>
                  <dd>로그인하러 가기 · 공지사항 · 자주 묻는 질문 · 설정(항상 마지막)</dd>
                </div>
                <div>
                  <dt>설정</dt>
                  <dd>개인정보처리방침 · 이용약관 · 서비스·데이터 출처</dd>
                </div>
                <div>
                  <dt>홈 필터</dt>
                  <dd>지역 · 종류를 바텀시트에서 선택</dd>
                </div>
                <div>
                  <dt>정책·출처</dt>
                  <dd>설정 · 서비스 푸터</dd>
                </div>
              </dl>
              <p className="hint">
                로그인은 카카오·네이버·구글 계정으로 진행해요. 외부 설정과 정책 확인 후 사용할 수
                있으며 북마크·AI 추천과 사용자 환경 설정은 준비 중이에요.
              </p>
            </div>
            <div className="sample">
              <h3>후속 구성 예시 · 구현 보류</h3>
              <div className="future-header">
                <span
                  className="wordmark"
                  role="img"
                  aria-label="나들이랑"
                />
                <span>
                  <Icon name="search" />
                </span>
                <span>
                  <Icon name="menu" />
                </span>
                <NavigationLink
                  href="/login"
                  className="button primary login-placeholder"
                >
                  로그인
                </NavigationLink>
              </div>
              <div className="future-nav">
                {(
                  [
                    ["home", "홈"],
                    ["bookmark", "북마크"],
                    ["spark", "AI 추천"],
                    ["user", "내정보"],
                  ] satisfies [IconName, string][]
                ).map(([name, label]) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={futureSelection === name}
                    aria-label={`${label} 선택 상태 예시`}
                    onClick={() => setFutureSelection(name)}
                  >
                    <Icon name={name} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <p className="hint">
                북마크·상황별 AI 추천을 추가했을 때의 가이드 예시입니다. 버튼은 선 아이콘을 유지하고
                진한 초록색·라벨 700·조금 굵은 선으로 선택을 구분합니다. 북마크 저장이나 AI 추천을
                실행하지 않아요.
              </p>
            </div>
            <div className="sample menu-comparison">
              <h3>메뉴 구성 비교</h3>
              <GuideTable
                className="guide-table menu-comparison-table"
                rows={[
                  [
                    "현재 구성",
                    "상단 검색·햄버거·로그인 자리를 유지하고 하단은 홈·북마크·내정보입니다. 내정보 목록은 공지사항·FAQ·설정 순서이며 설정은 항상 마지막에 두고 정책·출처를 확인해요.",
                  ],
                  [
                    "후속 확장",
                    "북마크 저장·AI 추천은 후속이며 사용자 환경 설정은 필요가 정해지면 구현해요.",
                  ],
                  [
                    "햄버거 중심",
                    "햄버거는 유지하며 홈·내정보로 이동합니다. 중복 검색 항목만 제거했어요.",
                  ],
                ]}
              />
              <p className="hint">
                내정보·설정·FAQ·공지사항·정책 페이지에서는 하단 내정보를 선택 상태로 표시해요.
              </p>
            </div>
          </section>
          <section id="inputs">
            <h2>인풋·셀렉트</h2>
            <div className="sample stack">
              <div>
                <label htmlFor="guideInput">기본 입력</label>
                <input
                  id="guideInput"
                  placeholder="행사 또는 시설 이름"
                />
                <p className="hint">16px 본문, 높이 44px 이상 · 터치 시 확대 방지</p>
              </div>
              <div>
                <label htmlFor="guideSelect">지역 선택</label>
                <select id="guideSelect">
                  <option>전체 지역</option>
                  {[...new Set(items.map((item) => item.region_name))].map((region) => (
                    <option key={region}>{region}</option>
                  ))}
                </select>
                <p className="hint">
                  입력 높이·여백·얇은 화살표를 통일합니다. 선택 목록은 OS·브라우저 입력을 유지해요.
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
                <p
                  className="error-text"
                  id="guideErrorText"
                >
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
            <h2>날짜 선택</h2>
            <div className="sample">
              <DateField />
              <p className="hint">
                연도·월을 눌러 연도를 고릅니다. 오늘은 테두리와 ‘오늘’ 표시로 구분하며 날짜를 눌러
                선택해요.
              </p>
              <p className="hint">
                지우기는 모달 하단 왼쪽, 취소·완료는 오른쪽에 둡니다. 선택 값이 있을 때 입력 옆의
                ×로도 지울 수 있어요.
              </p>
            </div>
            <p className="hint">
              직접 제어 달력의 검토 시안입니다. 실기기·스크린리더·웹뷰 검증은 제품 적용 때
              수행합니다.
            </p>
          </section>
          <section id="buttons">
            <h2>버튼·뒤로가기</h2>
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
                <button
                  className="button secondary"
                  disabled
                >
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
                <button
                  className="back-heading-button"
                  onClick={() => setMessage("이전 화면 버튼의 스타일 예시예요.")}
                >
                  <span className="back-heading-icon">
                    <Icon name="back" />
                  </span>
                  <span>이전 화면</span>
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
                여기서는 스타일만 확인하며 페이지를 이동하지 않습니다. 서비스의 뒤로 가기는 이전
                화면·조건·스크롤로 복귀합니다. 직접 들어온 상세/정책은 검색, FAQ·공지 목록은 내정보,
                공지 상세는 목록으로 이동합니다. 최소 44px 터치 영역을 제공하고 화살표와 라벨 전체를
                눌러 이동하며 포커스 때 레이아웃 크기는 유지해요.
              </p>
            </div>
          </section>
          <section id="pagination">
            <div className="guide-section-head">
              <div>
                <h2>페이지네이션</h2>
                <p className="section-description">
                  번호와 화살표를 눌러 현재 페이지와 양 끝의 비활성 상태를 확인해 보세요.
                </p>
              </div>
              <div className="guide-width-control">
                <label htmlFor="paginationWidth">페이지네이션 예시 너비</label>
                <select
                  id="paginationWidth"
                  value={previewWidth}
                  onChange={(event) => setPreviewWidth(Number(event.target.value))}
                >
                  <option value="320">320px · 작은 화면</option>
                  <option value="390">390px · 기본</option>
                  <option value="430">430px · 넓은 화면</option>
                </select>
              </div>
            </div>
            <div className="guide-pagination-grid">
              <PaginationExample
                title="첫 페이지에서 시작"
                initialPage={1}
                width={previewWidth}
              />
              <PaginationExample
                title="중간 페이지에서 시작"
                initialPage={4}
                width={previewWidth}
              />
              <PaginationExample
                title="마지막 페이지에서 시작"
                initialPage={8}
                width={previewWidth}
              />
            </div>
            <p className="hint">
              검색 화면과 같은 44px 선택 영역과 현재 페이지 표시예요. 번호는 최대 5개, 360px
              이하에서는 주변 3개로 줄어듭니다. 결과가 한 페이지뿐이면 페이지네이션은 생략해요.
              예시의 선택은 이 영역 안에서만 바뀝니다.
            </p>
          </section>
          <section id="cards">
            <h2>카드·상태</h2>
            <p className="section-description">
              사진 또는 종류 아이콘 옆에 이름·지역·일정을 간결하게 표시합니다. 카드를 누르면 간단
              보기 시트가 올라오고, 상세 정보 보기로 개별 페이지에 이동해요. 사진 설명은 생략하고
              출처·이용 조건은 푸터의 서비스·데이터 출처에서 확인합니다. 시트는 열고 닫을 때
              부드럽게 움직이며 동작 줄이기 설정에서는 움직임을 생략해요.
            </p>
            {photoCard && (
              <OutingCard
                item={photoCard}
                sample
              />
            )}
            {realCard && (
              <OutingCard
                item={realCard}
                sample
              />
            )}
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
              <p className="small muted">
                주소·예약·언어 안내 등 단독 자료 값과 좌우 행의 왼쪽 항목명은 15px·600, 오른쪽 일반
                값과 소개·프로그램 본문은 15px·400입니다. 프로그램 번호 제목과 무료 값은 15px·600,
                그 밖의 그룹 제목은 14px·600, 가격은 15px·500, 보조 조건·문의는 13px·400입니다. 긴
                본문은 처음 5줄/더 보기·접기를 유지합니다.
              </p>
              <p className="hint">
                개인·단체·주민·무료 조건은 요금 행에서 함께 읽고, 전화 문의 같은 주석은 다음 줄의
                보통 굵기로 표시합니다. 요금 괄호·요일·기간을 보존하며 체험·셔틀은 추가 요금, 주차는
                독립 행으로 구분합니다.
              </p>
            </div>
          </section>
          <StateExamples onMessage={setMessage} />
          <section id="tokens">
            <h2>글자·간격·보조 색상</h2>
            <p className="section-description">글자·간격과 정보 상태를 구분하는 보조 색상입니다.</p>
            <div className="token-grid">
              {[
                ["본문", "#202832"],
                ["보조 글자", "#586574"],
                ["주의", "#805513"],
                ["오류", "#A92D3B"],
                ["입력 경계", "#7F8B99"],
                ["구분선", "#D6DDE5"],
              ].map(([name, color]) => (
                <div
                  className="token"
                  key={name}
                >
                  <span
                    className="swatch"
                    style={{ background: color }}
                  />
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
                  "하단 메뉴·푸터",
                  "하단 메뉴 흰 배경 · 기존 1px 구분선 · 미선택 아이콘 #9EABBC/글자 #68778B · 선택 #13543D/700 · 안내 푸터 #F3F6F2 배경",
                ],
                ["하단 안전 영역", "76px + safe-area-inset-bottom, 본문 끝 여백"],
              ]}
            />
          </section>
          <section id="brand">
            <h2>현재 로고·심볼</h2>
            <p className="section-description">
              채택한 한글 로고·두 사람 심볼을 숲 초록으로 표시합니다. 웹에서는 현재 투명 PNG 원본과
              같은 심볼의 파비콘을 사용합니다.
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
                      aria-label={label === "PC 안내" ? "PC 안내 로고" : "현재 한글 로고"}
                      style={{ width: Number(width) }}
                    />
                    <figcaption>
                      {label} {width}px
                    </figcaption>
                  </figure>
                ))}
              </div>
              <p className="hint">‘랑’ 옆점 없이 둥근 열린 받침 유지 · 현재 모양과 비율 채택</p>
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
                로고·심볼·파비콘은 같은 브랜드색을 사용합니다. 스타일이 바뀌면 함께 갱신합니다. 공개
                전 유사 상표 확인은 남아 있으며, 앱용 아이콘 크기·마스크·여백은 P23에서 준비합니다.
              </p>
            </div>
          </section>
          <section id="policies">
            <h2>정책·하단 안내</h2>
            <p className="small muted">
              정책·출처는 서비스 푸터에서 바텀시트로 열립니다. 뒤로 가기로 닫으면 보던 화면을
              유지해요.
            </p>
            <PolicyLinks variant="buttons" />
          </section>
          <section id="featurePlan">
            <h2>기능 계획 다시 보기</h2>
            <p className="section-description">
              비교는 첫 공개에서 제외하고, 북마크·AI는 보류합니다. 소셜 로그인 화면과 중계는
              구현됐으며 실제 제공자 연동은 준비 중입니다.
            </p>
            <GuideTable
              rows={[
                [
                  "실제 제공 · P12·P13·P44·P82~P84",
                  "현재 DB 자료의 홈 · 이름/지역/종류 검색 · 상세/공식 출처 · 정책 · 대표 사진 · 내정보 · FAQ · 공지사항",
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
                  "P29 북마크·P31 AI 추천은 후속. P30 소셜 로그인은 연결했으며 실제 외부 연동은 미확인. 설정은 정책·출처 조회를 제공하고 사용자 환경 설정은 실제 필요를 정한 뒤 추가",
                ],
                [
                  "필요할 때 재검토",
                  "P32 날짜/요금 필터 · 비교 · 예상 합계. 과거 기준을 자동 재도입하지 않음",
                ],
                ["웹 완성 뒤", "P23 같은 모바일 웹을 사용하는 웹뷰 앱, 확정 심볼의 앱용 아이콘"],
              ]}
            />
            <p className="hint">
              P12 조회 API·P13 웹 화면 연결 완료 → P14 검색 유입·P15 운영 준비 순서. 제품 범위는
              P28에서 확정했으며, 채택한 홈·로고로 실제 API를 연결했습니다. 카드 예시는 검토
              표본이며 화면 미리보기는 현재 DB 자료를 조회합니다.
            </p>
          </section>
        </div>
      </div>
      {message && (
        <p
          className="toast"
          role="status"
          aria-live="polite"
        >
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
            <NavigationLink
              href={homeUrl}
              onClick={() => setMenu(false)}
            >
              <Icon name="home" />홈
            </NavigationLink>
            <NavigationLink
              href="/mypage"
              onClick={() => setMenu(false)}
            >
              <Icon name="user" />
              내정보
            </NavigationLink>
          </nav>
        </Dialog>
      )}
    </div>
  );
}
