import { BackHeading } from "@/components/layout/back-heading";
import { noticeDate, type Notice } from "@/features/notices/model";
import { NavigationLink } from "@/providers/navigation-provider";

export function NoticeScreen({
  notice,
  previous,
  next,
}: {
  notice: Notice;
  previous?: Notice;
  next?: Notice;
}) {
  return (
    <article className="notice-article">
      <BackHeading
        title="공지사항"
        labelOnly
        fallbackHref="/notices"
      />
      <div className="intro">
        <h1>{notice.title}</h1>
        <time dateTime={notice.publishedOn}>{noticeDate(notice.publishedOn)}</time>
      </div>
      <div className="notice-body">
        {notice.paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      <nav
        className="notice-navigation"
        aria-label="공지 글 이동"
      >
        <div className="notice-neighbors">
          {(
            [
              ["이전 글", previous],
              ["다음 글", next],
            ] as const
          ).map(([label, item]) =>
            item ? (
              <NavigationLink
                key={label}
                href={`/notices/${item.id}`}
              >
                <span className="notice-neighbor-label">{label}</span>
                <span>{item.title}</span>
              </NavigationLink>
            ) : (
              <div
                key={label}
                className="notice-neighbor-empty"
              >
                <span className="notice-neighbor-label">{label}</span>
                <span>{label}이 없어요.</span>
              </div>
            ),
          )}
        </div>
        <div className="notice-list-action">
          <NavigationLink
            href="/notices"
            className="button secondary"
            aria-label="공지사항 목록으로 이동"
          >
            목록
          </NavigationLink>
        </div>
      </nav>
    </article>
  );
}
