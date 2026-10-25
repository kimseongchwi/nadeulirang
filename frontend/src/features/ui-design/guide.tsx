"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { brandPalette } from "@/config/brand";
import { DateField } from "@/features/ui-design/calendar";
import type { DialogStyle } from "@/components/ui/dialog";
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

const guideGroups = [
  {
    id: "foundations",
    title: "기본 스타일",
    status: "웹 적용",
    sections: [
      ["brand-colors", "브랜드 색상"],
      ["brand", "로고·심볼"],
      ["tokens", "글자·간격"],
    ],
  },
  {
    id: "components",
    title: "공통 UI",
    status: "스타일·동작 예시",
    sections: [
      ["buttons", "버튼·뒤로가기"],
      ["inputs", "입력·선택"],
      ["dates", "달력"],
      ["navigation", "현재 내비게이션"],
      ["future-navigation", "하단바 스타일"],
      ["cards", "카드·상태"],
      ["detail-examples", "상세 요금·빈 자료"],
      ["pagination", "페이지네이션"],
      ["states", "로딩·빈 결과·오류·404"],
    ],
  },
  {
    id: "service-screens",
    title: "실제 화면",
    status: "현재 화면",
    sections: [
      ["screens", "서비스 미리보기"],
      ["ad-placement", "광고 배치"],
    ],
  },
  {
    id: "review",
    title: "검토 중",
    status: "미적용 · 검토·보류",
    sections: [["featurePlan", "검토 상태"]],
  },
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
      <h4>{title}</h4>
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
  const { today, homeUrl } = useNavigation();
  const items = publicItems(today);
  const [previewWidth, setPreviewWidth] = useState(390);
  const [message, setMessage] = useState("");
  const [previewScreen, setPreviewScreen] = useState("홈");
  const [navigationSelection, setNavigationSelection] = useState("home");
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(timer);
  }, [message]);
  const realCard = items.find((item) => ongoing(item, today)) || items[0];
  const photoCard = items.find((item) => item.id === photoId);
  const detailCard = photoCard || realCard;
  const screens = [
    { label: "홈", src: "/" },
    { label: "검색", src: "/search" },
    { label: "내정보", src: "/mypage" },
    { label: "로그인", src: "/login" },
    { label: "FAQ", src: "/faq" },
    { label: "공지사항", src: "/notices" },
    {
      label: "상세",
      src: detailCard ? `/detail/${detailCard.id}` : "/search",
    },
  ];
  const screen = screens.find((item) => item.label === previewScreen) ?? screens[0];
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
              기본 스타일 · 공통 UI · 실제 화면 · 검토 중으로 나누어 적용 상태를 확인합니다.
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
          {guideGroups.map((group) => (
            <div
              className="guide-jump-group"
              key={group.id}
            >
              <a
                className="guide-jump-title"
                href={`#${group.id}`}
              >
                {group.title}
                <span>{group.status}</span>
              </a>
              <details>
                <summary>항목 보기</summary>{" "}
                <ul>
                  {group.sections.map(([id, label]) => (
                    <li key={id}>
                      <a href={`#${id}`}>{label}</a>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          ))}
        </nav>
        <div className="guide-content">
          <section
            className="guide-group"
            id="foundations"
            aria-labelledby="foundations-title"
          >
            <header className="guide-group-heading">
              <div className="row wrap">
                <h2 id="foundations-title">기본 스타일</h2>
                <span
                  className="guide-status"
                  data-review={false}
                >
                  웹 적용
                </span>
              </div>
              <p>
                현재 웹에 적용한 로고·색상·글자·간격 기준입니다. 로고의 공개 전 확인과 앱용
                내보내기는 별도 작업입니다.
              </p>
            </header>
            <div className="guide-board">
              <section
                id="brand-colors"
                className="guide-brand-colors"
              >
                <h3>브랜드 색상</h3>
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
                        <h4>{name}</h4>
                        <span className="brand-color-value">{color}</span>
                      </div>
                      <p>{purpose}</p>
                    </article>
                  ))}
                </div>
              </section>
              <section id="brand">
                <h3>현재 로고·심볼</h3>
                <p className="section-description">
                  채택한 한글 로고·두 사람 심볼을 숲 초록으로 표시합니다. 웹에서는 현재 투명 PNG
                  원본과 같은 심볼의 파비콘을 사용합니다.
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
                    로고·심볼·파비콘은 같은 브랜드색을 사용합니다. 스타일이 바뀌면 함께 갱신합니다.
                    공개 전 유사 상표 확인은 남아 있으며, 앱용 아이콘 크기·마스크·여백은 P23에서
                    준비합니다.
                  </p>
                </div>
              </section>
              <section id="tokens">
                <h3>글자·간격·보조 색상</h3>
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
                    ["섹션·카드", "20px / 17px · 700"],
                    ["모달·시트 상단 제목", "18px · 700 · 본문색 · 줄높이 1.5"],
                    ["본문·보조", "16px / 14px · 줄높이 1.6"],
                    ["간격", "4 · 8 · 12 · 16 · 24 · 32px"],
                    ["모서리", "검색 입력 4px · 발견 카드 18px · 홈 강조 22px · 상세 12~20px"],
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
            </div>
          </section>
          <section
            className="guide-group"
            id="components"
            aria-labelledby="components-title"
          >
            <header className="guide-group-heading">
              <div className="row wrap">
                <h2 id="components-title">공통 UI</h2>
                <span
                  className="guide-status"
                  data-review={false}
                >
                  스타일·동작 예시
                </span>
              </div>
              <p>
                서비스에 적용한 UI와 하단바·달력 스타일을 확인합니다. 카드·요금·상태 자료와 버튼
                동작은 가이드 표본입니다.
              </p>
            </header>
            <div className="guide-board">
              <section id="buttons">
                <h3>버튼·뒤로가기</h3>
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
                  </div>
                  <p className="hint">
                    여기서는 스타일만 확인하며 페이지를 이동하지 않습니다. 서비스의 뒤로 가기는 이전
                    화면·조건·스크롤로 복귀합니다. 직접 들어온 상세/정책은 검색, FAQ·공지 목록은
                    내정보, 공지 상세는 목록으로 이동합니다. 최소 44px 터치 영역을 제공하고 화살표와
                    라벨 전체를 눌러 이동하며 포커스 때 레이아웃 크기는 유지해요.
                  </p>
                </div>
              </section>
              <section id="inputs">
                <h3>인풋·셀렉트</h3>
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
                      입력 높이·여백·얇은 화살표를 통일합니다. 선택 목록은 OS·브라우저 입력을
                      유지해요.
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
                <h3>날짜 선택</h3>
                <div className="sample">
                  <DateField />
                  <p className="hint">
                    연도·월을 눌러 연도를 고릅니다. 오늘은 원형 테두리로 구분하며 날짜를 눌러
                    선택해요.
                  </p>
                  <p className="hint">
                    지우기는 모달 하단 왼쪽, 취소·완료는 오른쪽에 둡니다. 선택 값이 있을 때 입력
                    옆의 ×로도 지울 수 있어요.
                  </p>
                </div>
                <p className="hint">
                  달력은 공통 UI 예시이며 서비스 날짜 필터 도입 계획은 제거했습니다.
                  실기기·스크린리더·웹뷰 확인은 남아 있습니다.
                </p>
              </section>
              <section id="navigation">
                <h3>상단·하단 내비게이션</h3>
                <p className="section-description">
                  검색은 상단, 자주 묻는 질문과 공지사항은 하단 내정보에서 열어요.
                </p>
                <div className="sample">
                  <h4>지금의 구성</h4>
                  <dl className="guide-navigation-facts">
                    <div>
                      <dt>상단</dt>
                      <dd>로고 · 검색 · 로그인</dd>
                    </div>
                    <div>
                      <dt>하단</dt>
                      <dd>홈 · 북마크 · 내정보</dd>
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
                    로그인은 카카오·네이버·구글 계정으로 진행해요. 외부 설정과 정책 확인 후 사용할
                    수 있으며 북마크 저장·AI 추천은 보류 중이고 사용자 환경 설정은 미정이에요.
                  </p>
                </div>
              </section>
              <section id="future-navigation">
                <h3>하단바 스타일</h3>
                <p className="section-description">
                  하단 메뉴의 아이콘·이름·선택 표시와 정책·출처 안내를 함께 확인합니다. 아래
                  버튼으로 선택 모양을 확인할 수 있어요.
                </p>
                <div className="sample">
                  <h4>아이콘·이름·선택 표시</h4>
                  <div className="future-header">
                    <span
                      className="wordmark"
                      role="img"
                      aria-label="나들이랑"
                    />
                    <span>
                      <Icon name="search" />
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
                        aria-pressed={navigationSelection === name}
                        aria-label={`${label} 선택 상태 예시`}
                        onClick={() => setNavigationSelection(name)}
                      >
                        <Icon name={name} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="hint">
                    선 아이콘·진한 초록색·라벨 700·조금 굵은 선으로 선택을 구분합니다. 북마크
                    저장·AI 추천 기능은 아직 연결하지 않았어요.
                  </p>
                </div>
                <div
                  id="policies"
                  className="sample"
                >
                  <h4>정책·하단 안내</h4>
                  <p className="small muted">
                    정책·출처는 서비스 푸터에서 바텀시트로 열립니다. 뒤로 가기로 닫으면 보던 화면을
                    유지해요. 열기 UI는 적용됐으며 실제 운영 정책은 공개 전 검토 대상입니다.
                  </p>
                  <PolicyLinks variant="buttons" />
                </div>
                <div className="sample menu-comparison">
                  <h4>메뉴 연결 상태</h4>
                  <GuideTable
                    className="guide-table menu-comparison-table"
                    rows={[
                      [
                        "현재 구성",
                        "상단은 로고·검색·로그인, 하단은 홈·북마크·내정보입니다. 내정보 목록은 공지사항·FAQ·설정 순서이며 설정은 항상 마지막에 두고 정책·출처를 확인해요.",
                      ],
                      [
                        "미연결 기능",
                        "북마크 저장·AI 추천은 아직 연결되지 않았으며 사용자 환경 설정은 필요가 정해지면 구현해요.",
                      ],
                    ]}
                  />
                  <p className="hint">
                    내정보·설정·FAQ·공지사항·정책 페이지에서는 하단 내정보를 선택 상태로 표시해요.
                  </p>
                </div>
              </section>
              <section id="cards">
                <h3>카드·상태</h3>
                <p className="section-description">
                  사진 또는 종류 아이콘 옆에 이름·지역·일정을 간결하게 표시합니다. 카드를 누르면
                  간단 보기 시트가 올라오고, 상세 정보 보기로 개별 페이지에 이동해요. 사진 설명은
                  생략하고 출처·이용 조건은 푸터의 서비스·데이터 출처에서 확인합니다. 시트는 열고
                  닫을 때 부드럽게 움직이며 동작 줄이기 설정에서는 움직임을 생략해요.
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
                  <h4>무료·유료·미확인 · 스타일 예시</h4>
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
                  <h4>상세 본문·조건 안내</h4>
                  <p className="small muted">
                    주소·예약·언어 안내 등 단독 자료 값과 좌우 행의 왼쪽 항목명은 15px·600, 오른쪽
                    일반 값과 소개·프로그램 본문은 15px·400입니다. 프로그램 번호 제목과 무료 값은
                    15px·600, 그 밖의 그룹 제목은 14px·600, 가격은 15px·500, 보조 조건·문의는
                    13px·400입니다. 긴 본문은 처음 5줄/더 보기·접기를 유지합니다.
                  </p>
                  <p className="hint">
                    개인·단체·주민·무료 조건은 요금 행에서 함께 읽고, 전화 문의 같은 주석은 다음
                    줄의 보통 굵기로 표시합니다. 요금 괄호·요일·기간을 보존하며 체험·셔틀은 추가
                    요금, 주차는 독립 행으로 구분합니다.
                  </p>
                </div>
              </section>
              <DetailExamples />
              <section id="pagination">
                <div className="guide-section-head">
                  <div>
                    <h3>페이지네이션</h3>
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
              <StateExamples onMessage={setMessage} />
            </div>
          </section>
          <section
            className="guide-group"
            id="service-screens"
            aria-labelledby="service-screens-title"
          >
            <header className="guide-group-heading">
              <div className="row wrap">
                <h2 id="service-screens-title">실제 화면</h2>
                <span
                  className="guide-status"
                  data-review={false}
                >
                  현재 화면
                </span>
              </div>
              <p>
                현재 서비스 페이지를 직접 불러옵니다. 화면 구현과 실제 제공자 로그인·공개 운영
                검증은 구분하며 정책 본문은 운영 전 검토용입니다.
              </p>
            </header>
            <div className="guide-board">
              <section
                id="screens"
                className="guide-screens"
              >
                <div className="guide-section-head">
                  <div>
                    <h3>서비스 화면 미리보기</h3>
                    <p className="section-description">
                      선택한 서비스 화면과 오른쪽 광고 목록을 함께 봅니다. 각 화면 안에서 스크롤할
                      수 있어요.
                    </p>
                  </div>
                  <div className="guide-width-control">
                    <label htmlFor="previewScreen">미리 볼 화면</label>
                    <select
                      id="previewScreen"
                      value={previewScreen}
                      onChange={(event) => setPreviewScreen(event.target.value)}
                    >
                      {screens.map((item) => (
                        <option
                          key={item.label}
                          value={item.label}
                        >
                          {item.label}
                        </option>
                      ))}
                    </select>
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
                  </div>
                </div>
                <div className="guide-home-notes">
                  <p>진행 중(종료일순) → 곧 시작(시작일순) → 상설(이름순) · 섹션별 최대 3곳</p>
                  <p>더 보기는 선택한 조건을 유지합니다.</p>
                </div>
                <div className="guide-screen-pair">
                  <figure className="guide-screen">
                    <figcaption>
                      <strong>{screen.label}</strong>
                      <a
                        href={screen.src}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${screen.label} 새 탭으로 보기`}
                      >
                        새 탭으로 보기
                        <Icon name="next" />
                      </a>
                    </figcaption>
                    <div className="guide-preview-frame">
                      <iframe
                        key={screen.src}
                        src={screen.src}
                        title={`모바일 ${screen.label} 미리보기`}
                        loading="lazy"
                      />
                    </div>
                  </figure>
                  <figure
                    id="ad-placement"
                    className="guide-screen guide-ad-screen"
                  >
                    <figcaption>
                      <strong>광고</strong>
                      <span className="small muted">목록 중간 배치</span>
                    </figcaption>
                    <AdPlacementPreview result={adPreview} />
                  </figure>
                </div>
              </section>
            </div>
          </section>
          <section
            className="guide-group"
            id="review"
            aria-labelledby="review-title"
          >
            <header className="guide-group-heading">
              <div className="row wrap">
                <h2 id="review-title">검토 중</h2>
                <span
                  className="guide-status"
                  data-review={true}
                >
                  미적용 · 검토·보류
                </span>
              </div>
              <p>아직 적용하지 않은 기능과 남은 확인을 정리합니다.</p>
            </header>
            <div className="guide-board">
              <section id="featurePlan">
                <h3>검토 상태와 남은 확인</h3>
                <p className="section-description">
                  스타일 채택과 기능 도입·운영 검증 완료는 구분합니다. 세부 범위·선행 작업·완료
                  조건은 저장소 PLAN.md와 DESIGN.md를 따릅니다.
                </p>
                <GuideTable
                  rows={[
                    [
                      "남은 확인 · P27",
                      "달력은 공통 UI 예시로 유지하며 실제 낭독·기기 검증은 남아 있습니다. 방문 날짜 필터의 도입 계획은 제거했습니다.",
                    ],
                    [
                      "구현 보류 · P29·P31",
                      "로그인 관련 기능인 북마크 저장·AI 추천은 보류합니다. 사용자 환경 설정은 필요가 정해진 뒤 판단합니다.",
                    ],
                    [
                      "웹 적용 후 남은 확인",
                      "실기기·웹뷰 검증(P23), 실제 운영 정책·공개 환경 검증(P15)은 별도로 남아 있습니다.",
                    ],
                  ]}
                />
              </section>
            </div>
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
    </div>
  );
}
