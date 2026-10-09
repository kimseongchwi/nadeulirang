"use client";

import { useState, type ReactNode } from "react";
import { brandPalette } from "@/config/brand";
import { Dialog, type DialogStyle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icons";
import { policyTitles, type PolicyType } from "@/features/policies/model";
import { NavigationLink, useNavigation } from "@/providers/navigation-provider";
import { PolicyLinks } from "@/features/policies/policy-links";
import { PolicySheet } from "@/features/policies/policy-sheet";
import { GuideDevTools } from "@/features/ui-design/guide-dev-tools";
import { NavigationProgress } from "./navigation-progress";

export function SiteShell({ children }: { children: ReactNode }) {
  const { pathname, homeUrl, searchUrl, hash, pending } = useNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const guide = pathname === "/ui-design";
  const style: DialogStyle = {};
  for (const [key, value] of Object.entries(brandPalette))
    style[`--${key}`] = value;
  const navigation = [
    [homeUrl, "home", "홈"],
    [searchUrl, "search", "검색"],
  ] as const;
  return (
    <div
      className={`service-root${guide ? " guide-mode" : ""}`}
      style={style}
      data-nav="combined"
    >
      <GuideDevTools guide={guide} />
      <a href="#main" className="skip">
        본문 바로가기
      </a>
      <div className="shell">
        {!guide && (
          <aside className="pc-intro" aria-label="나들이랑 소개">
            <NavigationLink href={homeUrl} className="brand">
              <span className="wordmark" role="img" aria-label="나들이랑" />
            </NavigationLink>
            <p className="eyebrow">가까운 하루, 새로운 발견</p>
            <h2>
              어디든 좋은 날,
              <br />
              함께 나들이랑.
            </h2>
            <p className="lead">
              가까운 곳부터 새로운 곳까지,
              <br />마음이 가는 나들이를 찾아보세요.
              <br />
              가고 싶은 곳의 정보를 살펴봐요.
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
              <a href="/ui-design" className="local-guide-link" target="_blank" rel="noopener noreferrer" aria-label="UI 가이드 보기, 새 탭">
                UI 가이드 보기 <Icon name="next" />
              </a>
            )}
          </aside>
        )}
        <div className="service">
          <div className="service-scroll">
            <div className="service-content">
            {!guide && (
              <>
                <header className="service-header">
                  <NavigationLink href={homeUrl} className="brand">
                    <span
                      className="wordmark"
                      role="img"
                      aria-label="나들이랑 홈"
                    />
                  </NavigationLink>
                  <div className="header-actions">
                    <NavigationLink
                      href={pathname === "/" ? searchUrl : "/search"}
                      className="icon-button"
                      aria-label="검색 페이지 열기"
                    >
                      <Icon name="search" />
                    </NavigationLink>
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
              {children}
            </main>
            </div>
            {!guide && (
              <footer className="service-footer">
                <div className="footer-intro">
                  <NavigationLink
                    href={homeUrl}
                    className="brand"
                    aria-label="나들이랑 홈으로 이동"
                  >
                    <span className="wordmark" role="img" aria-label="나들이랑" />
                  </NavigationLink>
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
              <NavigationLink
                href={homeUrl}
                aria-current={pathname === "/" ? "page" : undefined}
              >
                <span className="nav-icon">
                  <Icon name="home" filled={pathname === "/"} />
                </span>
                홈
              </NavigationLink>
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
      {pending && <NavigationProgress />}
      <Dialog
        open={menuOpen}
        id="menuDialog"
        title="메뉴"
        className="menu-dialog"
        onClose={() => setMenuOpen(false)}
      >
        <nav aria-label="전체 메뉴">
          {navigation.map(([href, name, label]) => (
            <NavigationLink
              key={name}
              href={href}
              onClick={() => setMenuOpen(false)}
            >
              <Icon name={name} />
              <span>{label}</span>
              <span className="menu-chevron">
                <Icon name="next" />
              </span>
            </NavigationLink>
          ))}
        </nav>
      </Dialog>
      {(Object.keys(policyTitles) as PolicyType[]).map((type) => (
        <PolicySheet key={type} type={type} open={hash === `#policy-${type}`} />
      ))}
    </div>
  );
}
