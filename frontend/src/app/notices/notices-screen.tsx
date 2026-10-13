import { Icon } from "@/components/ui/icons";
import { BackHeading } from "@/components/layout/back-heading";
import { EmptyState } from "@/components/ui/feedback";
import { NavigationLink } from "@/providers/navigation-provider";
import { noticeDate, type Notice } from "@/features/notices/model";

export function NoticesScreen({ items }: { items: readonly Notice[] }) {
  return (
    <div className="notices-screen">
      <BackHeading
        title="공지사항"
        compact
        fallbackHref="/mypage"
      />
      {items.length ? (
        <ul className="notice-list">
          {items.map((notice) => (
            <li key={notice.id}>
              <NavigationLink href={`/notices/${notice.id}`}>
                <span>
                  <strong>{notice.title}</strong>
                  <time dateTime={notice.publishedOn}>{noticeDate(notice.publishedOn)}</time>
                </span>
                <Icon name="next" />
              </NavigationLink>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          placement="page"
          title="아직 등록된 공지사항이 없어요."
        />
      )}
    </div>
  );
}
