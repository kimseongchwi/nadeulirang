import { latestNotices } from "@/features/notices/model";
import { NoticesScreen } from "./notices-screen";
import { pageMetadata } from "@/config/seo";

export const metadata = pageMetadata("/notices", "공지사항 · 나들이랑", "나들이랑의 서비스 공지사항을 확인하세요.");

export default function NoticesPage() {
  return <NoticesScreen items={latestNotices()} />;
}
