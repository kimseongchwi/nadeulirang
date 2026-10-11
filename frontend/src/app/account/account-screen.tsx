"use client";

import { useEffect, useState, type FormEvent } from "react";
import { NavigationLink } from "@/providers/navigation-provider";

type Options = { termsVersion: string; privacyVersion: string; providers: string[] };
type Method = { provider: string; email: string | null; verified: boolean };
type Member = { nickname: string; role: string; methods: Method[] };
type Proof = { purpose: string; token: string };

async function read(path: string): Promise<unknown> {
  const response = await fetch(`/api/auth/${path}`, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) {
    if (response.status === 401 && path === "me") return null;
    throw new Error("인증 서비스를 사용할 수 없습니다. 잠시 뒤 다시 시도하세요.");
  }
  return response.json();
}

function isOptions(value: unknown): value is Options {
  return typeof value === "object" && value !== null && "termsVersion" in value && typeof value.termsVersion === "string" &&
    "privacyVersion" in value && typeof value.privacyVersion === "string" && "providers" in value && Array.isArray(value.providers) &&
    value.providers.every((provider: unknown) => provider === "kakao" || provider === "naver");
}
function isMember(value: unknown): value is Member {
  return typeof value === "object" && value !== null && "nickname" in value && typeof value.nickname === "string" &&
    "role" in value && typeof value.role === "string" && "methods" in value && Array.isArray(value.methods) &&
    value.methods.every((method: unknown) => typeof method === "object" && method !== null && "provider" in method &&
      typeof method.provider === "string" && ["local", "kakao", "naver"].includes(method.provider) && "verified" in method && typeof method.verified === "boolean" &&
      "email" in method && (method.email === null || typeof method.email === "string"));
}

async function mutate(path: string, body: Record<string, unknown>, method = "POST"): Promise<unknown> {
  const proof = await read("csrf");
  if (typeof proof !== "object" || proof === null || !("token" in proof) || typeof proof.token !== "string") throw new Error("인증을 준비하지 못했습니다.");
  const response = await fetch(`/api/auth/${path}`, { method, cache: "no-store", credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": proof.token }, body: JSON.stringify(body) });
  const value: unknown = await response.json();
  if (!response.ok) {
    const message = typeof value === "object" && value !== null && "message" in value && typeof value.message === "string" ? value.message : "요청을 완료하지 못했습니다.";
    throw new Error(message);
  }
  return value;
}

export function AccountScreen() {
  const [options, setOptions] = useState<Options | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [proof, setProof] = useState<Proof | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);

  async function refresh() {
    const [settings, current] = await Promise.all([read("options"), read("me")]);
    if (!isOptions(settings) || (current !== null && !isMember(current))) throw new Error("계정 정보를 확인하지 못했습니다.");
    setOptions(settings); setMember(current);
  }
  useEffect(() => {
    let active = true;
    Promise.all([read("options"), read("me")]).then(([settings, current]) => {
      if (!active) return;
      if (!isOptions(settings) || (current !== null && !isMember(current))) throw new Error("계정 정보를 확인하지 못했습니다.");
      setOptions(settings); setMember(current);
      const fragment = window.location.hash.slice(1);
      const match = /^(EMAIL_VERIFY|PASSWORD_RESET|LOCAL_LINK):([A-Za-z0-9_-]{43})$/.exec(fragment);
      if (match) { setProof({ purpose: match[1], token: match[2] }); window.history.replaceState(window.history.state, "", window.location.pathname); }
      else if (fragment === "error") setMessage("소셜 인증을 완료하지 못했습니다. 연결 상태를 확인하고 다시 시도하세요.");
      else if (fragment === "completed") setMessage("소셜 인증 처리를 완료했습니다.");
    }).catch(() => { if (active) setMessage("계정 정보를 불러오지 못했습니다. 새로고침해 다시 시도하세요."); });
    return () => { active = false; };
  }, []);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true); setMessage("");
    try { await action(); await refresh(); setMessage(success); }
    catch (error) { setMessage(error instanceof Error ? error.message : "요청을 완료하지 못했습니다."); }
    finally { setBusy(false); }
  }
  function submit(path: string, success: string, extra: Record<string, unknown> = {}) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault(); const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      void run(async () => { await mutate(path, { ...data, ...extra }); form.reset(); if (path === "token/consume") setProof(null); }, success);
    };
  }
  async function social(provider: string, mode: string) {
    await run(async () => {
      const value = await mutate(`oauth/${provider}/start`, { mode, termsVersion: agreed ? options?.termsVersion : "", privacyVersion: agreed ? options?.privacyVersion : "" });
      if (typeof value !== "object" || value === null || !("redirect" in value) || value.redirect !== `/api/auth/oauth2/authorization/${provider}`)
        throw new Error("인증 이동 주소를 확인하지 못했습니다.");
      window.location.assign(value.redirect);
    }, "소셜 인증으로 이동합니다.");
  }
  const ready = Boolean(options?.termsVersion && options?.privacyVersion);
  const names: Record<string, string> = { local: "이메일", kakao: "카카오", naver: "네이버" };
  return <>
    <div className="intro"><h1>로그인·계정 관리</h1></div>
    <div>
      <p role="status" aria-live="polite">{message}</p>
      {!options && !message && <p>계정 정보를 확인하고 있습니다.</p>}
      <fieldset disabled={busy || !options} style={{ minWidth: 0, border: 0, padding: 0, margin: 0 }}>
        {proof && <form onSubmit={submit("token/consume", "인증이 완료되었습니다. 로그인 상태를 확인하세요.", proof)}>
          <h2>{proof.purpose === "PASSWORD_RESET" ? "비밀번호 재설정" : "이메일 인증"}</h2>
          {proof.purpose === "PASSWORD_RESET" && <label>새 비밀번호 <input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required /></label>}
          <button type="submit" className="button primary">인증 완료</button>
          <button type="button" onClick={() => setProof(null)}>인증 닫기</button>
        </form>}
        {!member ? <>
          <form onSubmit={submit("login", "로그인했습니다.")}>
            <h2>이메일 로그인</h2>
            <label>이메일 <input name="email" type="email" autoComplete="username" required /></label>
            <label>비밀번호 <input name="password" type="password" autoComplete="current-password" required /></label>
            <button type="submit" className="button primary">로그인</button>
          </form>
          <label><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} disabled={!ready} style={{ width: "auto", minHeight: 0 }} />
            <NavigationLink href="/policy/terms">이용약관</NavigationLink>과 <NavigationLink href="/policy/privacy">개인정보 처리 내용</NavigationLink>을 확인하고 가입에 동의합니다.</label>
          {!ready && <p>가입 정책을 준비 중입니다. 기존 회원 로그인은 이용할 수 있습니다.</p>}
          {options?.providers.map((provider) => <button key={provider} type="button" onClick={() => void social(provider, "login")}>{names[provider]} 로그인</button>)}
          <details><summary>이메일 회원가입</summary>
            <form onSubmit={submit("register", "인증 메일을 확인하세요.", { termsVersion: options?.termsVersion, privacyVersion: options?.privacyVersion })}>
              <label>닉네임 <input name="nickname" maxLength={40} autoComplete="nickname" required /></label>
              <label>이메일 <input name="email" type="email" autoComplete="email" required /></label>
              <label>비밀번호 <input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required /></label>
              <p>12자 이상, UTF-8 기준 72바이트 이하로 입력하세요.</p>
              <button type="submit" disabled={!ready || !agreed}>가입·인증 메일 받기</button>
            </form>
          </details>
          <details><summary>이메일 인증·비밀번호 복구</summary>
            <form onSubmit={submit("email/resend", "인증이 필요한 계정이면 메일을 보냈습니다.")}>
              <label>인증할 이메일 <input name="email" type="email" autoComplete="email" required /></label><button type="submit">인증 메일 다시 받기</button>
            </form>
            <form onSubmit={submit("password/reset-request", "복구 가능한 계정이면 메일을 보냈습니다.")}>
              <label>복구할 이메일 <input name="email" type="email" autoComplete="email" required /></label><button type="submit">비밀번호 재설정 메일 받기</button>
            </form>
          </details>
        </> : <>
          <h2>{member.nickname}</h2>
          <p>권한: {member.role}</p>
          <form onSubmit={submit("reauthenticate", "재인증했습니다. 5분 안에 계정 변경을 진행하세요.")}>
            <label>현재 비밀번호 <input name="password" type="password" autoComplete="current-password" required /></label><button type="submit">이메일 재인증</button>
          </form>
          <h3>연결된 로그인 수단</h3>
          {member.methods.map((method) => <div key={method.provider}>
            <p>{names[method.provider]} {method.email} {method.verified ? "인증됨" : "인증 대기"}</p>
            {method.provider !== "local" && <button type="button" onClick={() => void social(method.provider, "reauth")}>재인증</button>}
            <button type="button" onClick={() => method.provider === "local" ? void run(() => mutate("methods/local/unlink", {}), "연결을 해제했습니다. 다시 로그인하세요.") : void social(method.provider, "unlink")}>연결 해제</button>
          </div>)}
          {options?.providers.filter((provider) => !member.methods.some((method) => method.provider === provider)).map((provider) =>
            <button key={provider} type="button" onClick={() => void social(provider, "link")}>{names[provider]} 연결</button>)}
          {!member.methods.some((method) => method.provider === "local") ?
            <form onSubmit={submit("local/link", "인증 메일을 확인하세요. 확인 전에 기존 수단으로 재인증해야 할 수 있습니다.")}>
              <h3>이메일 로그인 추가</h3>
              <label>이메일 <input name="email" type="email" autoComplete="email" required /></label>
              <label>비밀번호 <input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required /></label>
              <button type="submit">이메일 인증 요청</button>
            </form> :
            <form onSubmit={submit("password/change", "비밀번호를 변경하고 모든 로그인을 종료했습니다.")}>
              <h3>비밀번호 변경</h3>
              <label>현재 비밀번호 <input name="currentPassword" type="password" autoComplete="current-password" required /></label>
              <label>새 비밀번호 <input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required /></label>
              <button type="submit">비밀번호 변경</button>
            </form>}
          <button type="button" onClick={() => void run(() => mutate("logout", {}), "로그아웃했습니다.")}>로그아웃</button>
          <button type="button" onClick={() => void run(() => mutate("sessions/end-all", {}), "모든 로그인을 종료했습니다.")}>모든 기기 로그아웃</button>
          <details><summary>회원 탈퇴</summary><p>회원 정보와 로그인 수단을 삭제합니다. 소셜 수단이 여러 개라면 다른 연결을 먼저 해제하세요.</p>
            {member.methods.some((method) => method.provider !== "local") ? member.methods.filter((method) => method.provider !== "local").map((method) =>
              <button key={method.provider} type="button" onClick={() => { if (window.confirm("회원 정보를 삭제하고 탈퇴할까요?")) void social(method.provider, "withdraw"); }}>{names[method.provider]} 인증 후 탈퇴</button>) :
              <button type="button" onClick={() => { if (window.confirm("회원 정보를 삭제하고 탈퇴할까요?")) void run(() => mutate("me", {}, "DELETE"), "탈퇴했습니다."); }}>회원 탈퇴</button>}
          </details>
        </>}
      </fieldset>
    </div>
  </>;
}
