"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useId,
  useState,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
  type ComponentProps,
} from "react";
import { serviceScrollTop, scrollServiceTo } from "@/components/layout/service-scroll";

// 기존 탭의 조건·이력 복귀를 유지하기 위해 저장 키와 history 속성 이름은 호환성을 보존한다.
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

function useNavigationState(today: string) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const router = useRouter();
  const [transitionPending, startTransition] = useTransition();
  const [pendingLinks, setPendingLinks] = useState<Set<string>>(() => new Set());
  const reportLinkPending = useCallback((id: string, active: boolean) => {
    setPendingLinks((previous) => {
      if (previous.has(id) === active) return previous;
      const next = new Set(previous);
      if (active) next.add(id); else next.delete(id);
      return next;
    });
  }, []);
  const pending = transitionPending || pendingLinks.size > 0;
  const [homeQuery, setHomeQuery] = useSetting(
    "outing-review-home-filters",
    "",
  );
  const [days, setDays] = useSetting("outing-review-days", "14");
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => "",
  );
  const upcomingDays = [7, 14, 30].includes(Number(days)) ? Number(days) : 14;
  const nextNavigation = useRef(false);
  const renderedUrl = useRef("");
  useEffect(() => {
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    const onPopState = () => {
      const previousUrl = renderedUrl.current;
      if (!previousUrl || previousUrl === `${location.pathname}${location.search}`) return;
      try {
        sessionStorage.setItem(`outing-review-scroll:${previousUrl}`, String(serviceScrollTop()));
      } catch {
        /* 저장 제한 환경에서도 페이지 복귀는 유지한다. */
      }
      nextNavigation.current = false;
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      history.scrollRestoration = previousRestoration;
      window.removeEventListener("popstate", onPopState);
    };
  }, []);
  const saveScroll = useCallback(() => {
    try {
      sessionStorage.setItem(
        `outing-review-scroll:${location.pathname}${location.search}`,
        String(serviceScrollTop()),
      );
    } catch {
      /* 저장 제한 환경에서는 복귀 위치를 기본 상단으로 처리한다. */
    }
    nextNavigation.current = true;
  }, []);
  const navigate = useCallback(
    (url: string, replace = false) => {
      if (url === `${location.pathname}${location.search}`) {
        scrollServiceTo(0);
        document.getElementById("main")?.focus({ preventScroll: true });
        return;
      }
      saveScroll();
      startTransition(() => {
        if (replace) router.replace(url, { scroll: false });
        else router.push(url, { scroll: false });
      });
    },
    [router, saveScroll],
  );
  const back = useCallback(() => {
    if (history.state?.reviewEntry) startTransition(() => router.back());
    else navigate("/search");
  }, [router, navigate]);
  useLayoutEffect(() => {
    const previousUrl = renderedUrl.current;
    renderedUrl.current = `${pathname}${search ? `?${search}` : ""}`;
    let frame = 0;
    if (previousUrl && previousUrl !== renderedUrl.current) {
      // 직접 이동 표시가 없는 URL 변경은 뒤로/앞으로 가기다. 해시 변경은 제외된다.
      const restore = !nextNavigation.current;
      if (nextNavigation.current)
        history.replaceState({ ...history.state, reviewEntry: true }, "");
      nextNavigation.current = false;
      const saved = Number(readSetting(`outing-review-scroll:${renderedUrl.current}`, "0"));
      const scroll = restore && Number.isFinite(saved) ? Math.max(0, saved) : 0;
      scrollServiceTo(scroll);
      frame = requestAnimationFrame(() => {
        scrollServiceTo(scroll);
        document.getElementById("main")?.focus({ preventScroll: true });
      });
    }
    return () => cancelAnimationFrame(frame);
  }, [pathname, search]);
  useEffect(() => {
    if (hash !== "#photo-credit") return;
    const frame = requestAnimationFrame(() =>
      document.getElementById("photo-credit")?.scrollIntoView({ block: "start" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [hash, pathname, search]);
  const openSheet = useCallback((value: string) => {
    history.replaceState(
      { ...history.state, reviewSheetScroll: serviceScrollTop() },
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
    if (url !== `${location.pathname}${location.search}`) saveScroll();
    // Next.js가 내부 라우터 상태를 보존하고 검색 매개변수 변경을 반영한다.
    // 검색 조건 변경은 서버 페이지를 다시 조회해야 하므로 라우터로 이동한다.
    startTransition(() => router.replace(url, { scroll: false }));
  }, [router, saveScroll]);
  return {
    today,
    pathname,
    params: new URLSearchParams(search),
    pending,
    reportLinkPending,
    refresh: () => startTransition(() => router.refresh()),
    upcomingDays,
    homeQuery,
    setHomeQuery,
    setUpcomingDays: (value: number) => setDays(String(value)),
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
type NavigationState = ReturnType<typeof useNavigationState>;
const NavigationContext = createContext<NavigationState | null>(null);
export function NavigationProvider({
  today,
  children,
}: {
  today: string;
  children: ReactNode;
}) {
  const state = useNavigationState(today);
  return (
    <NavigationContext.Provider value={state}>{children}</NavigationContext.Provider>
  );
}
export function useNavigation() {
  const state = useContext(NavigationContext);
  if (!state) throw new Error("화면 이동 Provider가 필요합니다.");
  return state;
}
export function NavigationLink({
  onNavigate,
  children,
  ...props
}: ComponentProps<typeof Link>) {
  const { saveScroll, navigate } = useNavigation();
  return (
    <Link
      {...props}
      scroll={false}
      onNavigate={(event) => {
        onNavigate?.(event);
        if (typeof props.href === "string" && props.href === `${location.pathname}${location.search}`) {
          event.preventDefault();
          navigate(props.href);
        } else saveScroll();
      }}
    >{children}<LinkPending /></Link>
  );
}
function LinkPending() {
  const { pending } = useLinkStatus();
  const { reportLinkPending } = useNavigation();
  const id = useId();
  useEffect(() => {
    reportLinkPending(id, pending);
    return () => reportLinkPending(id, false);
  }, [id, pending, reportLinkPending]);
  return null;
}
