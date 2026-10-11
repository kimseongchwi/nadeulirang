export interface Notice {
  id: number;
  title: string;
  publishedOn: string;
  paragraphs: readonly string[];
}

// 실제로 게시할 공지만 서울 날짜(YYYY-MM-DD)와 변경하지 않는 고유 ID로 등록한다.
export const notices: readonly Notice[] = [
  {
    id: 1,
    title: "자주 묻는 질문 페이지가 생겼어요",
    publishedOn: "2026-10-11",
    paragraphs: [
      "나들이랑에 자주 묻는 질문 페이지를 추가했어요.",
      "검색 방법부터 행사 일정, 요금, 예약과 자료 출처까지 이용하면서 궁금할 수 있는 내용을 모았어요.",
      "화면 아래 ‘내정보’에서 ‘자주 묻는 질문’을 눌러 확인할 수 있어요.",
    ],
  },
];

export function latestNotices(items: readonly Notice[] = notices): Notice[] {
  return [...items].sort((left, right) =>
    right.publishedOn.localeCompare(left.publishedOn) || right.id - left.id,
  );
}

export function findNotice(id: string): Notice | undefined {
  return notices.find((notice) => String(notice.id) === id);
}

export function adjacentNotices(id: number, items: readonly Notice[] = notices) {
  const ordered = latestNotices(items);
  const index = ordered.findIndex((notice) => notice.id === id);
  return {
    previous: index < 0 ? undefined : ordered[index + 1],
    next: index <= 0 ? undefined : ordered[index - 1],
  };
}

export function noticeDate(publishedOn: string): string {
  const [year, month, day] = publishedOn.split("-");
  return `${year}.${month}.${day}`;
}
