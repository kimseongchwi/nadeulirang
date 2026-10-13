import { MyPageScreen } from "./mypage-screen";
import { pageMetadata } from "@/config/seo";

export const metadata = pageMetadata(
  "/mypage",
  "내정보 · 나들이랑",
  "자주 묻는 질문과 공지사항을 확인하세요.",
  false,
);

export default function MyPage() {
  return <MyPageScreen />;
}
