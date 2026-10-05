import assert from "node:assert/strict";
import { test } from "node:test";
import { sheetBounds, sheetDragHeight, sheetDragTarget } from "../src/components/ui/sheet-drag.ts";

test("시트의 위쪽 확장·아래쪽 축소·충분한 아래쪽 닫기를 구분한다", () => {
  const bounds = sheetBounds(800, 500);
  assert.equal(sheetDragTarget(500, -80, bounds, false), "expanded");
  assert.equal(sheetDragTarget(760, 80, bounds, true), "collapsed");
  assert.equal(sheetDragTarget(500, 151, bounds, false), "close");
  assert.equal(sheetDragTarget(500, 150, bounds, false), "collapsed");
  assert.equal(sheetDragTarget(760, 411, bounds, true), "close");
  assert.equal(sheetDragTarget(500, 8, bounds, false), "collapsed");
  assert.equal(sheetDragTarget(760, -8, bounds, true), "expanded");
  assert.equal(sheetDragTarget(500, -48, bounds, false), "collapsed");
  assert.equal(sheetDragTarget(500, -49, bounds, false), "expanded");
  assert.equal(sheetDragTarget(760, 48, bounds, true), "expanded");
  assert.equal(sheetDragTarget(760, 49, bounds, true), "collapsed");
});
test("끌어 내리는 미리보기는 최소 높이를 보존하고 넘은 거리는 시트를 아래로 옮긴다", () => {
  const bounds = sheetBounds(800, 500);
  assert.deepEqual(sheetDragHeight(500, 400, bounds), { height: 180, offset: 80 });
  assert.deepEqual(sheetDragHeight(500, -1000, bounds), { height: 760, offset: 0 });
  assert.deepEqual(sheetDragHeight(500, 50, bounds), { height: 450, offset: 0 });
});
test("짧은 화면에서도 최소·기본·확장 높이가 서비스 영역을 넘지 않는다", () => {
  const bounds = sheetBounds(120, 500);
  assert.deepEqual(bounds, { minimum: 114, collapsed: 114, expanded: 114 });
  assert.deepEqual(sheetBounds(0, 0), { minimum: 0, collapsed: 0, expanded: 0 });
});
