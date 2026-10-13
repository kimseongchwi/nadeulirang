"use client";

import { useCallback, useEffect, useState } from "react";

export const providers = ["kakao", "naver", "google"] as const;
export type Provider = typeof providers[number];
type Options = { termsVersion: string; privacyVersion: string; providers: Provider[] };
type Member = { nickname: string; methods: { provider: Provider }[] };

function isProvider(value: unknown): value is Provider {
  return value === "kakao" || value === "naver" || value === "google";
}
function isOptions(value: unknown): value is Options {
  return typeof value === "object" && value !== null && "termsVersion" in value && typeof value.termsVersion === "string" &&
    "privacyVersion" in value && typeof value.privacyVersion === "string" && "providers" in value && Array.isArray(value.providers) && value.providers.every(isProvider);
}
function isMember(value: unknown): value is Member {
  return typeof value === "object" && value !== null && "nickname" in value && typeof value.nickname === "string" &&
    "methods" in value && Array.isArray(value.methods) && value.methods.every((method: unknown) =>
      typeof method === "object" && method !== null && "provider" in method && isProvider(method.provider));
}
async function read(path: string): Promise<unknown> {
  const response = await fetch(`/api/auth/${path}`, { cache: "no-store", credentials: "same-origin" });
  if (response.status === 401 && path === "me") return null;
  if (!response.ok) throw new Error("로그인 정보를 불러오지 못했습니다. 다시 시도하세요.");
  return response.json();
}
export async function mutate(path: string, body: Record<string, unknown> = {}): Promise<unknown> {
  const csrf = await read("csrf");
  if (typeof csrf !== "object" || csrf === null || !("token" in csrf) || typeof csrf.token !== "string") throw new Error("인증을 준비하지 못했습니다.");
  const response = await fetch(`/api/auth/${path}`, { method: "POST", cache: "no-store", credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf.token }, body: JSON.stringify(body) });
  const value: unknown = await response.json();
  if (!response.ok) throw new Error(typeof value === "object" && value !== null && "message" in value && typeof value.message === "string" ? value.message : "요청을 완료하지 못했습니다.");
  return value;
}
export async function startSocial(provider: Provider, mode: string, consent?: Options) {
  const value = await mutate(`oauth/${provider}/start`, { mode, termsVersion: consent?.termsVersion ?? "", privacyVersion: consent?.privacyVersion ?? "" });
  if (typeof value !== "object" || value === null || !("redirect" in value) || value.redirect !== `/api/auth/oauth2/authorization/${provider}`) throw new Error("인증 이동 주소를 확인하지 못했습니다.");
  window.location.assign(value.redirect);
}
export function useAuth({ silentLoad = false }: { silentLoad?: boolean } = {}) {
  const [options, setOptions] = useState<Options | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const refresh = useCallback(async () => {
    const [settings, current] = await Promise.all([read("options"), read("me")]);
    if (!isOptions(settings) || (current !== null && !isMember(current))) throw new Error("로그인 정보를 확인하지 못했습니다.");
    return { settings, current };
  }, []);
  useEffect(() => {
    let active = true;
    const fragment = window.location.hash;
    if (fragment) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    refresh().then(({ settings, current }) => {
      if (!active) return;
      setOptions(settings); setMember(current);
      if (fragment === "#error") setMessage("소셜 인증을 완료하지 못했습니다. 다시 시도하세요.");
      else if (fragment === "#completed") setMessage(current ? "인증을 완료했습니다." : "계정 처리를 완료했습니다.");
    }).catch((error: unknown) => { if (active && !silentLoad) setMessage(error instanceof Error ? error.message : "로그인 정보를 확인하지 못했습니다."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh, silentLoad]);
  return { options, member, loading, message, setMessage };
}
