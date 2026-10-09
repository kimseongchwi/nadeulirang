import assert from "node:assert/strict";
import { test } from "node:test";
import { feeAlternatives, feeDisplayGroups } from "../src/features/outings/fee-alternatives.ts";
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
test("사용자가 허용한 전부 무료 자료만 화면에서 생략하고 요금표·조건·원본 근거는 보존한다", () => {
  const free = [entry("MUSEUM","adultChrge","0"),entry("MUSEUM","childChrge","0"),entry("MUSEUM","yngbgsChrge","0")];
  const paid = [entry("TOUR","usefee","일반 성인 3000/일반 어린이, 청소년 2000/달성군민 성인 1500/달성군민 어린이, 청소년 1000")];
  const discount = [entry("MUSEUM","etcChrgeInfo","달성군민 50 할인, 미취학, 장애인, 국가유공자 등 조례에 따른 무료입장")];
  const input = [free,paid]; const before = structuredClone(input);
  assert.deepEqual(feeDisplayGroups(input,discount),[paid]);
  assert.deepEqual(feeDisplayGroups(input,[]),input);
  const ambiguous = [free,[entry("TOUR","usefee","유료")]];
  assert.deepEqual(feeDisplayGroups(ambiguous,discount),ambiguous);
  assert.deepEqual(feeDisplayGroups([free,paid,paid],discount),[free,paid,paid]);
  const mixed = [[...free.slice(0,2),entry("MUSEUM","yngbgsChrge","1000")],paid];
  assert.deepEqual(feeDisplayGroups(mixed,discount),mixed);
  assert.deepEqual(input,before);
});
