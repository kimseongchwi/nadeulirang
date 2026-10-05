"use client";

import { useState, type ReactNode } from "react";
import { brandPalette } from "@/config/brand";
import { ReviewDialog, type ReviewStyle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icons";
import { policyTitles, type PolicyType } from "@/features/policies/model";
import { ReviewLink, useReview } from "@/providers/review-provider";
import { PolicyLinks } from "@/features/policies/policy-links";
import { PolicySheet } from "@/features/policies/policy-sheet";
import { ReviewDevTools } from "@/components/layout/review-dev-tools";

export function ReviewShell({ children }: { children: ReactNode }) {
  const { pathname, homeUrl, searchUrl, hash, pending } = useReview();
  const [menuOpen, setMenuOpen] = useState(false);
  const guide = pathname === "/ui-design";
  const style: ReviewStyle = {};
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
      <ReviewDevTools guide={guide} />
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
            <h2>
              어디든 좋은 날,
              <br />
              함께 나들이랑.
            </h2>
            <p className="lead">
              지금 만날 수 있는 전시부터
              <br />곧 시작할 축제까지.
              <br />
              마음이 가는 곳을 천천히 찾아보세요.
            </p>
            <ol className="steps">
              {[
                [
                  "가볍게 둘러봐요",
                  "진행 중이거나 곧 시작하는 나들이를 만나보세요.",
                ],
                [
                  "마음에 드는 곳을 살펴봐요",
                  "카드로 간단히 보고, 상세에서 더 알아봐요.",
                ],
                [
                  "방문 정보를 한눈에",
                  "주소·운영 시간·요금 정보를 살펴봐요.",
                ],
              ].map(([title, text]) => (
                <li key={title}>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
            {process.env.NODE_ENV === "development" && (
              <ReviewLink href="/ui-design" className="local-guide-link">
                UI 가이드 보기 <Icon name="next" />
              </ReviewLink>
            )}
          </aside>
        )}
        <div className="service">
          <div className="service-scroll">
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
              </>
            )}
            <main id="main" tabIndex={-1} aria-busy={pending}>
              {pending && <span className="navigation-loading" role="status">나들이를 불러오고 있어요…</span>}
              {children}
            </main>
            {!guide && (
              <footer className="service-footer">
                <div className="footer-intro">
                  <span className="wordmark" role="img" aria-label="나들이랑" />
                  <p className="footer-tagline">가까운 하루, 새로운 발견</p>
                  <p className="footer-description">
                    마음이 가는 곳을 발견하고,
                    <br />가고 싶은 곳의 정보를 살펴봐요.
                  </p>
                </div>
                <nav className="footer-policy-nav" aria-label="서비스 안내">
                  <PolicyLinks variant="footer" />
                </nav>
                <div className="footer-meta">
                  <p>© 2026 나들이랑</p>
                </div>
              </footer>
            )}
          </div>
          {!guide && (
            <nav
              id="bottomNav"
              className="bottom-nav"
              aria-label="주요 페이지"
            >
              <ReviewLink
                href={homeUrl}
                aria-current={pathname === "/" ? "page" : undefined}
              >
                <span className="nav-icon">
                  <Icon name="home" />
                </span>
                홈
              </ReviewLink>
              <button
                type="button"
                disabled
                title="북마크 기능 준비 중"
                aria-label="북마크, 준비 중"
              >
                <span className="nav-icon">
                  <Icon name="bookmark" />
                </span>
                북마크
              </button>
            </nav>
          )}
        </div>
      </div>
      <ReviewDialog
        open={menuOpen}
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
      {(Object.keys(policyTitles) as PolicyType[]).map((type) => (
        <PolicySheet key={type} type={type} open={hash === `#policy-${type}`} />
      ))}
    </div>
  );
}
