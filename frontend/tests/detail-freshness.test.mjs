import assert from "node:assert/strict";
import { test } from "node:test";
import { detailRefreshNeeded } from "../src/features/outings/detail-freshness.ts";
test("자료별 경고는 선택 원천의 최신 실패·오래됨만 표시하고 해소·비선택 실패를 제외한다", () => {
  const entry = {source:"TOUR",sourceKey:"1",stale:false};
  const source = {source:"TOUR",sourceKey:"1",stale:false,checkedAt:"2026-10-09T00:00:00Z",lastFailureAt:"2026-10-08T00:00:00Z"};
  const data = {sources:[source]};
  assert.equal(detailRefreshNeeded(data,[entry]),false);
  assert.equal(detailRefreshNeeded({sources:[{...source,lastFailureAt:source.checkedAt}]},[entry]),true);
  assert.equal(detailRefreshNeeded({sources:[{...source,checkedAt:null}]},[entry]),true);
  assert.equal(detailRefreshNeeded({sources:[{...source,stale:true}]},[{...entry,sourceKey:"다른 원천"}]),false);
  assert.equal(detailRefreshNeeded(data,[{...entry,stale:true}]),true);
  assert.equal(detailRefreshNeeded({sources:[{...source,stale:true}]},[]),false);
});
