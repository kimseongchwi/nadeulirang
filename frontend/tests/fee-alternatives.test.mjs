import assert from "node:assert/strict";
import { test } from "node:test";
import { feeAlternatives } from "../src/features/outings/fee-alternatives.ts";
const entry = (source, field, value) => ({source,sourceKey:source,field,value,observationId:source+field});
test("요금 충돌은 선택된 연령별 요금과 다른 출처의 대상·조건을 중립적인 안내로 보존한다", () => {
  const standard = [entry("MUSEUM","adultChrge","1000"),entry("MUSEUM","childChrge","0")];
  const tour = entry("TOUR","usefee","돔하우스 5,000원(공사에 따른 휴관), 큐빅하우스 3,000원");
  const data = {item:{feeConflict:true},information:{generalFee:standard},evidence:[...standard,tour,entry("TOUR","parkingfee","무료")]};
  const before = structuredClone(data);
  assert.deepEqual(feeAlternatives(data), [standard,[tour]]);
  assert.deepEqual(data,before);
  assert.deepEqual(feeAlternatives({...data,item:{feeConflict:false}}), []);
  assert.deepEqual(feeAlternatives({...data,evidence:[...standard,entry("TOUR","usefee",null)]}), []);
  assert.deepEqual(feeAlternatives({...data,evidence:[entry("MUSEUM","adultChrge","9999"),tour]}), [standard,[tour]]);
});
