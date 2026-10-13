import { pageMetadata } from "@/config/seo";
import { SettingsScreen } from "./settings-screen";

export const metadata = pageMetadata("/settings", "설정 · 나들이랑", "개인정보처리방침과 이용약관, 서비스·데이터 출처를 확인하세요.", false);

export default function SettingsPage() { return <SettingsScreen />; }
