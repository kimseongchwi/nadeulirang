import { notFound } from "next/navigation";
import { adjacentNotices, findNotice } from "@/features/notices/model";
import { NoticeScreen } from "./notice-screen";
import { pageMetadata } from "@/config/seo";

export async function generateMetadata({ params }: PageProps<"/notices/[id]">) {
  const { id } = await params;
  const notice = findNotice(id);
  if (!notice) notFound();
  return pageMetadata(`/notices/${notice.id}`, `${notice.title} · 공지사항 · 나들이랑`, notice.paragraphs[0]);
}

export default async function NoticePage({ params }: PageProps<"/notices/[id]">) {
  const { id } = await params;
  const notice = findNotice(id);
  if (!notice) notFound();
  return <NoticeScreen notice={notice} {...adjacentNotices(notice.id)} />;
}
