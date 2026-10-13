import { BackHeading } from "@/components/layout/back-heading";
import { PolicyLinks } from "@/features/policies/policy-links";

export function SettingsScreen() {
  return (
    <>
      <BackHeading
        title="설정"
        compact
        fallbackHref="/mypage"
      />
      <nav aria-label="설정 메뉴">
        <PolicyLinks variant="list" />
      </nav>
    </>
  );
}
