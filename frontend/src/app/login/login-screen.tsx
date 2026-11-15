"use client";

import { useState } from "react";
import Image from "next/image";
import { startKakaoLogin, useAuth } from "@/features/auth/client";
import { NavigationLink } from "@/providers/navigation-provider";

export function LoginScreen() {
  const { options, member, loading, message, setMessage } = useAuth({ silentLoad: true });
  const [busy, setBusy] = useState(false);
  async function login() {
    setBusy(true);
    setMessage("");
    try {
      await startKakaoLogin();
    } catch {
      setMessage("로그인을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.");
      setBusy(false);
    }
  }
  return (
    <section
      className="login-panel"
      aria-labelledby="login-title"
      aria-busy={loading || busy}
    >
      <div className="login-heading">
        <h1 id="login-title">로그인</h1>
      </div>
      {member ? (
        <div className="login-member">
          <p>{member.nickname}님, 반가워요.</p>
          <NavigationLink
            href="/"
            className="button primary"
          >
            나들이 둘러보기
          </NavigationLink>
        </div>
      ) : (
        <button
          type="button"
          className="social-button social-kakao"
          aria-label={busy ? "카카오 로그인, 이동 중" : undefined}
          aria-busy={busy}
          disabled={loading || busy || !options?.providers.includes("kakao")}
          onClick={() => void login()}
        >
          <Image
            src="/images/kakao-symbol.svg"
            alt=""
            width={20}
            height={20}
            unoptimized
          />
          <span>카카오 로그인</span>
        </button>
      )}
      {message && (
        <p
          className="auth-message"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      )}
      {!member && (
        <NavigationLink
          href="/"
          className="login-browse"
        >
          로그인 없이 둘러보기
        </NavigationLink>
      )}
    </section>
  );
}
