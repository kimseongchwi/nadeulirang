"use client";

import { useState } from "react";
import Image from "next/image";
import { providers, startSocial, useAuth, type Provider } from "@/features/auth/client";
import { NavigationLink } from "@/providers/navigation-provider";

const labels: Record<Provider, string> = { kakao: "카카오 로그인", naver: "네이버 로그인", google: "Google로 로그인" };

export function LoginScreen() {
  const { options, member, loading, message, setMessage } = useAuth({ silentLoad: true });
  const [busy, setBusy] = useState<Provider | null>(null);
  const [agreed, setAgreed] = useState(false);
  async function login(provider: Provider) {
    setBusy(provider); setMessage("");
    try { await startSocial(provider, "login", agreed && options ? options : undefined); }
    catch { setMessage("로그인을 완료하지 못했습니다. 잠시 후 다시 시도해주세요."); setBusy(null); }
  }
  const policyReady = Boolean(options?.termsVersion && options.privacyVersion);
  return <section className="login-panel" aria-labelledby="login-title" aria-busy={loading || busy !== null}>
    <div className="login-heading"><h1 id="login-title">로그인</h1><p>자주 쓰는 계정으로 로그인하세요.</p></div>
    {member ? <div className="login-member"><p>{member.nickname}님, 반가워요.</p><NavigationLink href="/" className="button primary">나들이 둘러보기</NavigationLink></div> : <>
      <div className="social-buttons">
        {providers.map((provider) => {
          const available = Boolean(options?.providers.includes(provider));
          return <button key={provider} type="button" className={`social-button social-${provider}`} aria-label={busy === provider ? `${labels[provider]}, 이동 중` : labels[provider]} aria-busy={busy === provider} disabled={loading || busy !== null || !available} onClick={() => void login(provider)}>
            {provider === "naver" ? <Image className="naver-login-original" src="/images/naver-login.png" alt="" width={230} height={56} unoptimized /> : <>
              <Image src={provider === "kakao" ? "/images/kakao-symbol.svg" : "/images/google-g.png"} alt="" width={20} height={20} unoptimized />
              <span>{labels[provider]}</span>
            </>}
          </button>;
        })}
      </div>
      {policyReady && <label className="login-consent"><input type="checkbox" checked={agreed} disabled={busy !== null} onChange={(event) => setAgreed(event.target.checked)} /><span>처음 이용한다면 <NavigationLink href="/policy/terms">이용약관</NavigationLink>과 <NavigationLink href="/policy/privacy">개인정보 처리방침</NavigationLink>에 동의해주세요.</span></label>}
    </>}
    {message && <p className="auth-message" role="status" aria-live="polite">{message}</p>}
    {!member && <NavigationLink href="/" className="login-browse">로그인 없이 둘러보기</NavigationLink>}
  </section>;
}
