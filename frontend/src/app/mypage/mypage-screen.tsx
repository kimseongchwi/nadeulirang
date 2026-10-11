import { Icon } from "@/components/ui/icons";
import { NavigationLink } from "@/providers/navigation-provider";

export function MyPageScreen() {
  return <>
    <div className="intro">
      <h1 className="mypage-title" aria-label="내정보">내정<span>보</span></h1>
    </div>
    <nav className="support-links" aria-label="내정보 메뉴">
      <NavigationLink href="/faq"><span>자주 묻는 질문</span><Icon name="next" /></NavigationLink>
      <NavigationLink href="/notices"><span>공지사항</span><Icon name="next" /></NavigationLink>
      <button type="button" disabled title="설정 기능 준비 중"><span>설정</span><span className="support-pending">준비 중</span></button>
    </nav>
  </>;
}
