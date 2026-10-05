import { ReviewLink } from "@/providers/review-provider";

export default function NotFoundPage() {
  return (
    <div className="empty">
      <h1>찾을 수 없는 페이지예요.</h1>
      <ReviewLink href="/">홈으로 돌아가기</ReviewLink>
    </div>
  );
}
