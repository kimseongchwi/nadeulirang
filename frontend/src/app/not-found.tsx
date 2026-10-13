import { NavigationLink } from "@/providers/navigation-provider";
import { EmptyState } from "@/components/ui/feedback";

export default function NotFoundPage() {
  return (
    <EmptyState
      placement="page"
      title="찾을 수 없는 페이지예요."
      titleAs="h1"
    >
      <NavigationLink
        href="/"
        className="button primary"
      >
        홈으로 돌아가기
      </NavigationLink>
    </EmptyState>
  );
}
