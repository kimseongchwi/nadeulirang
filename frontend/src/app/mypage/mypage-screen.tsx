import { Icon } from "@/components/ui/icons";
import { NavigationLink } from "@/providers/navigation-provider";

export function MyPageScreen() {
  return <>
    <div className="intro">
      <h1 className="mypage-title" aria-label="내정보">내정<span>보</span></h1>
    </div>
    <nav className="support-links mypage-links" aria-label="내정보 메뉴">
      <NavigationLink href="/login" className="mypage-profile">
        <span className="mypage-avatar"><Icon name="user" /></span>
        <span className="mypage-profile-label">로그인하러 가기</span>
      </NavigationLink>
      <NavigationLink href="/notices">공지사항</NavigationLink>
      <NavigationLink href="/faq">자주 묻는 질문</NavigationLink>
      <NavigationLink href="/settings">설정</NavigationLink>
    </nav>
  </>;
}
