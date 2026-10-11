import assert from "node:assert/strict";
import { test } from "node:test";
import { adjacentNotices, findNotice, latestNotices, noticeDate } from "../src/features/notices/model.ts";

test("공지는 게시일 역순과 같은 날짜의 ID 역순으로 정렬하며 원본을 보존한다", () => {
  const items = Object.freeze([
    { id: 50, publishedOn: "2026-09-30" },
    { id: 2, publishedOn: "2026-10-11" },
    { id: 10, publishedOn: "2026-10-11" },
  ]);
  assert.deepEqual(latestNotices(items).map((item) => item.id), [10, 2, 50]);
  assert.deepEqual(items.map((item) => item.id), [50, 2, 10]);
  assert.equal(noticeDate("2026-10-11"), "2026.10.11");
});

test("빈 공지 목록을 보존하고 정확한 ID 주소만 공지로 조회한다", () => {
  assert.deepEqual(latestNotices([]), []);
  assert.equal(findNotice("1")?.id, 1);
  for (const id of ["missing", "constructor", "__proto__", "toString", "0", "-1", "01", "1.0", "1e0"]) assert.equal(findNotice(id), undefined);
});

test("이전·다음 공지는 ID 간격이 아닌 목록 순서로 연결하고 처음·마지막 경계를 보존한다", () => {
  const items = Object.freeze([
    { id: 50, publishedOn: "2026-09-30" },
    { id: 2, publishedOn: "2026-10-11" },
    { id: 10, publishedOn: "2026-10-11" },
  ]);
  const middle = adjacentNotices(2, items);
  assert.equal(middle.previous?.id, 50);
  assert.equal(middle.next?.id, 10);
  assert.equal(adjacentNotices(10, items).next, undefined);
  assert.equal(adjacentNotices(10, items).previous?.id, 2);
  assert.equal(adjacentNotices(50, items).previous, undefined);
  assert.equal(adjacentNotices(50, items).next?.id, 2);
  assert.deepEqual(items.map((item) => item.id), [50, 2, 10]);
});

test("한 건·빈 목록·없는 현재 글에는 이전·다음 공지를 만들지 않는다", () => {
  const empty = { previous: undefined, next: undefined };
  assert.deepEqual(adjacentNotices(1, [{ id: 1, publishedOn: "2026-10-11" }]), empty);
  assert.deepEqual(adjacentNotices(1, []), empty);
  assert.deepEqual(adjacentNotices(99, [{ id: 1, publishedOn: "2026-10-11" }]), empty);
});
