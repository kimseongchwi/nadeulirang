import { pageMetadata } from "@/config/seo";
import { AccountScreen } from "./account-screen";

export const metadata = pageMetadata("/account", "로그인·계정 관리 · 나들이랑", "회원 인증과 연결된 로그인 수단을 관리하세요.", false);

export default function AccountPage() { return <AccountScreen />; }
