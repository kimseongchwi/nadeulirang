"use client";

import { useState, type ReactNode } from "react";
import { brandPalette } from "@/config/brand";
import { ReviewDialog, type ReviewStyle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icons";
import { isPolicyType } from "@/features/policies/model";
import { ReviewLink, useReview } from "@/providers/review-provider";
import { HomeFilter } from "@/features/outings/home-filter";
import { PolicyLinks } from "@/features/policies/policy-links";
import { PolicySheet } from "@/features/policies/policy-sheet";

export function ReviewShell({ children }: { children: ReactNode }) {
  const { pathname, homeUrl, searchUrl, hash, serviceWidth } = useReview();
  const [menuOpen, setMenuOpen] = useState(false);
  const guide = pathname === "/ui-design";
  const type = hash.replace(/^#policy-/, "");
  const style: ReviewStyle = {
    "--service-width": `${serviceWidth}px`,
    "--shell-width": `${384 + serviceWidth}px`,
  };
  for (const [key, value] of Object.entries(brandPalette))
    style[`--${key}`] = value;
  const navigation = [
    [homeUrl, "home", "홈"],
    [searchUrl, "search", "검색"],
  ] as const;
  return (
    <div
      className={`review-root${guide ? " guide-mode" : ""}`}
      style={style}
      data-nav="combined"
    >
      <a href="#main" className="skip">
        본문 바로가기
      </a>
      <div className="shell">
        {!guide && (
          <aside className="pc-intro" aria-label="나들이랑 소개">
            <ReviewLink href={homeUrl} className="brand">
              <span className="wordmark" role="img" aria-label="나들이랑" />
            </ReviewLink>
            <p className="eyebrow">가까운 하루, 새로운 발견</p>
            <h1>
              어디든 좋은 날,
              <br />
              함께 나들이랑.
            </h1>
            <p className="lead">
              지금 만날 수 있는 전시부터
              <br />곧 시작할 축제까지.
              <br />
              마음이 가는 곳을 천천히 찾아보세요.
            </p>
            <ol className="steps">
              {[
                [
                  "새로운 나들이를 발견해요",
                  "진행 중인 기간 행사와 다가오는 일정을 둘러봐요.",
                ],
                [
                  "마음에 드는 곳을 찾아봐요",
                  "지역과 종류로 관심 있는 곳을 찾아요.",
                ],
                [
                  "출발 전, 한 번 더 확인해요",
                  "휴무·요금·예약은 공식 안내에서 확인해요.",
                ],
              ].map(([title, text]) => (
                <li key={title}>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
            <div className="pc-links">
              <PolicyLinks />
              <p className="tiny muted">© 2026 나들이랑 · 정책·로고 확정 전</p>
            </div>
          </aside>
        )}
        <div className="service">
          {!guide && (
            <>
              <header className="service-header">
                <ReviewLink href={homeUrl} className="brand">
                  <span
                    className="wordmark"
                    role="img"
                    aria-label="나들이랑 홈"
                  />
                </ReviewLink>
                <div className="header-actions">
                  <ReviewLink
                    href={pathname === "/" ? searchUrl : "/search"}
                    className="icon-button"
                    aria-label="검색 페이지 열기"
                  >
                    <Icon name="search" />
                  </ReviewLink>
                  <button
                    className="icon-button"
                    onClick={() => setMenuOpen(true)}
                    aria-label="보조 메뉴 열기"
                    aria-haspopup="dialog"
                  >
                    <Icon name="menu" />
                  </button>
                  <button
                    className="button primary login-placeholder"
                    disabled
                    title="로그인 기능 준비 중"
                  >
                    로그인
                  </button>
                </div>
              </header>
              <div className="review-banner">
                검토 시안 · 로고·스타일 미확정
              </div>
            </>
          )}
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          {!guide && (
            <>
              <footer>
                <p className="footer-brand">나들이랑</p>
                <p className="small muted">
                  나들이를 발견하고, 출발 전 정보를 확인해요.
                </p>
                <PolicyLinks />
                <p className="tiny muted">
                  © 2026 나들이랑 · 운영 정책 준비 중
                </p>
              </footer>
              <nav
                id="bottomNav"
                className="bottom-nav"
                aria-label="주요 페이지"
              >
                {navigation.map(([href, name, label]) => (
                  <ReviewLink
                    key={name}
                    href={href}
                    aria-current={
                      pathname === href.split("?")[0] ? "page" : undefined
                    }
                  >
                    <span className="nav-icon">
                      <Icon name={name} />
                    </span>
                    {label}
                  </ReviewLink>
                ))}
              </nav>
            </>
          )}
        </div>
      </div>
      {menuOpen && (
        <ReviewDialog
          open
          id="menuDialog"
          title="메뉴"
          className="menu-dialog"
          onClose={() => setMenuOpen(false)}
        >
          <nav aria-label="전체 메뉴">
            {navigation.map(([href, name, label]) => (
              <ReviewLink
                key={name}
                href={href}
                onClick={() => setMenuOpen(false)}
              >
                <Icon name={name} />
                <span>{label}</span>
                <span className="menu-chevron">
                  <Icon name="next" />
                </span>
              </ReviewLink>
            ))}
          </nav>
        </ReviewDialog>
      )}
      {pathname === "/" && hash === "#filters" && <HomeFilter />}
      {hash.startsWith("#policy-") && isPolicyType(type) && (
        <PolicySheet type={type} />
      )}
    </div>
  );
}
