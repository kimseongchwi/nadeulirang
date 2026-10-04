"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
  type ComponentProps,
} from "react";
import { publicItems } from "@/features/outings/model";

const storageEvent = "outing-review-settings";
function subscribeSettings(listener: () => void) {
  window.addEventListener(storageEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(storageEvent, listener);
    window.removeEventListener("storage", listener);
  };
}
function readSetting(key: string, fallback: string) {
  try {
    return sessionStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
function writeSetting(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* 저장을 사용할 수 없어도 화면 이동을 유지한다. */
  }
  window.dispatchEvent(new Event(storageEvent));
}
function useSetting(key: string, fallback: string) {
  const value = useSyncExternalStore(
    subscribeSettings,
    () => readSetting(key, fallback),
    () => fallback,
  );
  const setValue = useCallback(
    (next: string) => writeSetting(key, next),
    [key],
  );
  return [value, setValue] as const;
}
function subscribeHash(listener: () => void) {
  window.addEventListener("hashchange", listener);
  window.addEventListener("popstate", listener);
  return () => {
    window.removeEventListener("hashchange", listener);
    window.removeEventListener("popstate", listener);
  };
}

function useReviewState(today: string) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const router = useRouter();
  const [homeQuery, setHomeQuery] = useSetting(
    "outing-review-home-filters",
    "",
  );
  const [days, setDays] = useSetting("outing-review-days", "14");
  const [width, setWidth] = useSetting("outing-review-width", "480");
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => "",
  );
  const upcomingDays = [7, 14, 30].includes(Number(days)) ? Number(days) : 14;
  const serviceWidth = width === "520" ? 520 : 480;
  const nextNavigation = useRef(false);
  const renderedUrl = useRef("");
  const saveScroll = useCallback(() => {
    try {
      sessionStorage.setItem(
        `outing-review-scroll:${location.pathname}${location.search}`,
        String(window.scrollY),
      );
    } catch {
      /* 저장 제한 환경에서는 Next.js의 복귀 처리를 사용한다. */
    }
    nextNavigation.current = true;
  }, []);
  const navigate = useCallback(
    (url: string, replace = false) => {
      if (url === `${location.pathname}${location.search}`) {
        window.scrollTo(0, 0);
        return;
      }
      saveScroll();
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [router, saveScroll],
  );
  const back = useCallback(() => {
    if (history.state?.reviewEntry) router.back();
    else navigate("/search");
  }, [router, navigate]);
  useEffect(() => {
    const previousUrl = renderedUrl.current;
    renderedUrl.current = `${pathname}${search ? `?${search}` : ""}`;
    let frame = 0;
    if (previousUrl && previousUrl !== renderedUrl.current) {
      // 직접 이동 표시가 없는 URL 변경은 뒤로/앞으로 가기다. 해시 변경은 제외된다.
      const restore = !nextNavigation.current;
      if (nextNavigation.current)
        history.replaceState({ ...history.state, reviewEntry: true }, "");
      nextNavigation.current = false;
      frame = requestAnimationFrame(() => {
        const scroll = restore
          ? Number(
              readSetting(
                `outing-review-scroll:${pathname}${search ? `?${search}` : ""}`,
                "0",
              ),
            )
          : 0;
        window.scrollTo(0, scroll);
        document.getElementById("main")?.focus({ preventScroll: true });
      });
    }
    return () => cancelAnimationFrame(frame);
  }, [pathname, search]);
  const openSheet = useCallback((value: string) => {
    history.replaceState(
      { ...history.state, reviewSheetScroll: window.scrollY },
      "",
    );
    history.pushState(
      { ...history.state, reviewSheet: true },
      "",
      `${location.pathname}${location.search}${value}`,
    );
    window.dispatchEvent(new Event("hashchange"));
  }, []);
  const closeSheet = useCallback(() => {
    if (history.state?.reviewSheet) history.back();
    else {
      history.replaceState(
        history.state,
        "",
        `${location.pathname}${location.search}`,
      );
      window.dispatchEvent(new Event("hashchange"));
    }
  }, []);
  const replaceSheet = useCallback((url: string) => {
    nextNavigation.current = url !== `${location.pathname}${location.search}`;
    // Next.js가 내부 라우터 상태를 보존하고 검색 매개변수 변경을 반영한다.
    history.replaceState({ reviewSheet: false, reviewEntry: true }, "", url);
    window.dispatchEvent(new Event("hashchange"));
    window.scrollTo(0, 0);
  }, []);
  return {
    today,
    pathname,
    params: new URLSearchParams(search),
    items: publicItems(today),
    upcomingDays,
    serviceWidth,
    homeQuery,
    setHomeQuery,
    setUpcomingDays: (value: number) => setDays(String(value)),
    setServiceWidth: (value: number) => setWidth(String(value)),
    homeUrl: `/${homeQuery ? `?${homeQuery}` : ""}`,
    searchUrl: `/search${homeQuery ? `?${homeQuery}` : ""}`,
    hash,
    saveScroll,
    navigate,
    back,
    openSheet,
    closeSheet,
    replaceSheet,
  };
}
type ReviewState = ReturnType<typeof useReviewState>;
const ReviewContext = createContext<ReviewState | null>(null);
export function ReviewProvider({
  today,
  children,
}: {
  today: string;
  children: ReactNode;
}) {
  const state = useReviewState(today);
  return (
    <ReviewContext.Provider value={state}>{children}</ReviewContext.Provider>
  );
}
export function useReview() {
  const state = useContext(ReviewContext);
  if (!state) throw new Error("검토 화면 Provider가 필요합니다.");
  return state;
}
export function ReviewLink({
  onNavigate,
  ...props
}: ComponentProps<typeof Link>) {
  const { saveScroll } = useReview();
  return (
    <Link
      {...props}
      scroll={false}
      onNavigate={(event) => {
        onNavigate?.(event);
        if (
          typeof props.href !== "string" ||
          props.href !== `${location.pathname}${location.search}`
        )
          saveScroll();
      }}
    />
  );
}
