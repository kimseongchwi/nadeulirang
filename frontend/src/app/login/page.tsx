import { pageMetadata } from "@/config/seo";
import { LoginScreen } from "./login-screen";

export const metadata = pageMetadata("/login", "로그인 · 나들이랑", "카카오·네이버·Google 계정으로 간편하게 로그인하세요.", false);

export default function LoginPage() { return <LoginScreen />; }
