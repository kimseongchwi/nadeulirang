import { NavigationLink } from "@/providers/navigation-provider";

export default function NotFoundPage() {
  return (
    <div className="empty">
      <h1>찾을 수 없는 페이지예요.</h1>
      <NavigationLink href="/">홈으로 돌아가기</NavigationLink>
    </div>
  );
}
