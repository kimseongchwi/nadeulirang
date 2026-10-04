export const policyTitles = {
  privacy: "개인정보처리방침",
  terms: "이용약관",
  about: "서비스·데이터 출처",
};
export type PolicyType = keyof typeof policyTitles;
export function isPolicyType(value: string): value is PolicyType {
  return Object.hasOwn(policyTitles, value);
}
