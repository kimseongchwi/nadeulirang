import { latestNotices } from "@/features/notices/model";
import { NoticesScreen } from "./notices-screen";

export const metadata = {
  title: "공지사항 · 나들이랑",
  description: "나들이랑의 서비스 공지사항을 확인하세요.",
};

export default function NoticesPage() {
  return <NoticesScreen items={latestNotices()} />;
}
