import {
  AddressInformation,
  AdmissionInformation,
  EvidenceList,
  HoursInformation,
  UnknownValue,
} from "@/features/outings/evidence";
import { routeFeeBlocks } from "@/features/outings/fee-blocks";
import { ExpandableDetailText } from "@/features/outings/expandable-detail-text";
import type { Evidence } from "@/features/outings/api-types";

const feeSample = (field: string, value: string): Evidence => ({
  field,
  value,
  source: "TOUR",
  sourceKey: "가이드",
  url: "https://www.data.go.kr/data/15101578/openapi.do",
  sourceReference: null,
  collectedAt: "2026-10-09T00:00:00Z",
  checkedAt: "2026-10-09T00:00:00Z",
  stale: false,
  observationId: "가이드",
});

export function DetailExamples() {
  return (
    <section
      id="detail-examples"
      className="guide-detail-examples"
    >
      <h2>상세 요금·빈 자료 예시</h2>
      <p className="section-description">
        표시 검토용 표본입니다. 공통 출처·이용 조건은 푸터에서 확인합니다. 서로 다른 요금 자료는 각
        묶음의 항목·조건과 여백으로 구분합니다. 사용자 선택에 따른 대상별 요금표 사례는 별도 전부
        무료 자료를 화면에서 생략합니다. 실제 상세 갤러리는 위 미리보기를 사용해요.
      </p>
      <div className="guide-detail-grid">
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>입장료 안내 · 그룹 표본</dt>
              <dd>
                <EvidenceList
                  presentation="fee"
                  values={[
                    feeSample(
                      "usefee",
                      "[개인]- 일반 1,500원- 청소년 1,000원- 어린이 800원[단체(10인 이상)]- 일반 1,000원- 청소년 700원- 어린이 500원 [개인/단체 도민]- 일반 750원- 청소년 500원- 어린이 400원",
                    ),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>체험·추가 요금 · 복합 표본</dt>
              <dd>
                <EvidenceList
                  presentation="fee"
                  values={[
                    feeSample(
                      "etcChrgeInfo",
                      "단체 관람료 1000원+교육체험(보호자 입장권 2000원+아트키친 타일액자 10000원+소품 15000원+컬러링세라믹 10000원)+무료(유치원생~초등학생)",
                    ),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>체험·추가 요금 · 무료 조건</dt>
              <dd>
                <EvidenceList
                  presentation="fee"
                  values={[feeSample("etcChrgeInfo", "무료(김치체험학교 유료)")]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>입장료 안내 · 항목 구분</dt>
              <dd>
                <EvidenceList
                  presentation="fee"
                  values={[
                    feeSample("usefee", "돔하우스 5,000원(공사에 따른 휴관)- 큐빅하우스 3,000원"),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>주차 요금</dt>
              <dd>
                <EvidenceList
                  presentation="fee"
                  showLabels={false}
                  values={[feeSample("parkingfee", "무료")]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>입장료 안내 · 요금/무료 조건</dt>
              <dd>
                <EvidenceList
                  presentation="fee"
                  values={[
                    feeSample(
                      "usefee",
                      "[이용요금]\n- 개인 5,000원\n- 소인 및 경로우대자 4,500원\n- 곡성군민, 국가유공자, 장애인 무료\n- 단체(대인 30명 이상 / 소인·경로 15명 이상) : 대인 4,500원 / 소인 4,000원\n- 축제 기간 중 초등학생 이하 무료 입장",
                    ),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>운영 시간 · 기간/입장 마감</dt>
              <dd>
                <HoursInformation
                  values={[
                    feeSample(
                      "usetime",
                      "[1월~2월/11월~12월]09:00~17:00 (입장마감 16:00)[3월~5월/9월~10월]09:00~18:00 (입장마감 17:00)",
                    ),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>운영 시간 · 평일/휴일</dt>
              <dd>
                <HoursInformation
                  values={[
                    feeSample("weekdayOperOpenHhmm", "09:00"),
                    feeSample("weekdayOperColseHhmm", "17:00"),
                    feeSample("holidayOperOpenHhmm", "10:00"),
                    feeSample("holidayCloseOpenHhmm", "18:00"),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>운영 시간 · 1부/2부</dt>
              <dd>
                <HoursInformation
                  values={[feeSample("usetimefestival", "1부 - 18:20~20:10 / 2부 - 19:30~21:20")]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>운영 시간 · 월별 관람/체험</dt>
              <dd>
                <HoursInformation
                  values={[
                    feeSample(
                      "usetimeculture",
                      "[관람시간]<br>\n- 3월~11월 10:00~18:00<br>\n- 12월~2월 10:00~17:00<br>\n※ 관람 시 종료 40분 전까지 입장<br>\n[체험시간]<br>\n- 10:00~16:00<br>\n※ 체험 시 종료 1시간 전까지 입장",
                    ),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>운영 시간 · 계절별 회차 시각</dt>
              <dd>
                <HoursInformation
                  values={[
                    feeSample(
                      "playtime",
                      "- 하절기(3월~9월) 20:00, 22:00- 동절기(10월~2월) 19:00, 21:00",
                    ),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>휴관·휴무</dt>
              <dd>
                <EvidenceList
                  presentation="closedDays"
                  values={[
                    feeSample(
                      "restdate",
                      "매주 화요일 ※ 단, 정기휴일이 공휴일 및 대체공휴일과 겹칠 경우에는 개방하며, 그 다음의 첫 번째 비공휴일이 정기휴일임",
                    ),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>휴관·휴무 · 별도 항목</dt>
              <dd>
                <EvidenceList
                  presentation="closedDays"
                  values={[
                    feeSample(
                      "restdateculture",
                      "매주 토요일~일요일 / 1월 1일 / 설·추석 연휴 / 법정 공휴일",
                    ),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>입장료 안내 · 대상/개인/단체</dt>
              <dd>
                <EvidenceList
                  presentation="fee"
                  facilityName="강릉 오죽헌·시립박물관"
                  values={[
                    feeSample(
                      "usefee",
                      "[오죽헌·시립박물관]- 어른 : 개인 3,000원 / 단체 2,000원- 청소년·군인 : 개인 2,000원 / 단체 1,500원- 어린이 : 개인 1,000원 / 단체 500원※ 무료 : 만65세 이상 / 강릉 시민 본인 / 만 6세 이하 미취학 아동※ 단체 : 30명 이상",
                    ),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>주차 요금 · 기본/초과</dt>
              <dd>
                <EvidenceList
                  presentation="fee"
                  showLabels={false}
                  values={[
                    feeSample(
                      "parkingfee",
                      "[소형차] 기본 1시간 3,000원 / 초과 시 매 10분마다 800원[중·대형차] 기본 1시간 5,000원 / 초과 시 매 10분마다 800원",
                    ),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>주소</dt>
              <dd>
                <AddressInformation
                  values={[
                    feeSample("rdnmadr", "서울특별시 종로구 사직로 161"),
                    feeSample("addr2", "광화문 입구"),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>한국어안내서비스</dt>
              <dd>
                <EvidenceList
                  presentation="service"
                  showLabels={false}
                  values={[
                    feeSample(
                      "infotext",
                      "가능(화요일~일요일 10:00~17:00)※ 전화 문의 : 063-626-1330",
                    ),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>외국어안내서비스 · 언어/예약 조건</dt>
              <dd>
                <EvidenceList
                  presentation="service"
                  showLabels={false}
                  values={[
                    feeSample(
                      "infotext",
                      "가능(한국어, 영어(사전 예약), 단체 유료)※ 전화 문의 : 063-626-1330",
                    ),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>연락처 · 빈 자료</dt>
              <dd>
                <UnknownValue />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>운영 시간 · 하절기/동절기</dt>
              <dd>
                <HoursInformation
                  values={[
                    feeSample(
                      "usetimeculture",
                      "- 하절기(3~10월) 09:00~18:00- 동절기(11~2월) 09:00~17:00",
                    ),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>예약 안내 · 내국인</dt>
              <dd>
                <EvidenceList
                  values={
                    routeFeeBlocks({
                      notes: [
                        feeSample("infoname", "내국인예약안내"),
                        feeSample("infotext", "가능"),
                      ],
                    }).reservation || []
                  }
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>예약 안내 · 단체 사전예약</dt>
              <dd>
                <EvidenceList
                  values={
                    routeFeeBlocks({
                      notes: [
                        feeSample("infoname", "내국인예약안내"),
                        feeSample("infotext", "단체 사전 전화예약"),
                      ],
                    }).reservation || []
                  }
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>예약 안내 · 접수 조건</dt>
              <dd>
                <EvidenceList
                  values={[feeSample("infotext", "전화 예약 가능(관람 당일 30분 전 접수 가능)")]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>연락처 · 기관별 전화</dt>
              <dd>
                <EvidenceList
                  presentation="contact"
                  values={[
                    feeSample(
                      "infocenterculture",
                      "거제시청 농업정책과 055-639-6311거제시농업개발원 0507-1344-6421",
                    ),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>연락처 · 운영기관/시설</dt>
              <dd>
                <EvidenceList
                  presentation="contact"
                  values={[
                    feeSample("operPhoneNumber", "053-659-4900"),
                    feeSample("phoneNumber", "053-668-2796"),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>입장료 안내 · 서로 다른 자료</dt>
              <dd>
                <AdmissionInformation
                  values={[]}
                  alternatives={[
                    [
                      feeSample("adultChrge", "1000"),
                      feeSample("childChrge", "0"),
                      feeSample("yngbgsChrge", "1000"),
                    ],
                    [
                      feeSample(
                        "usefee",
                        "- 돔하우스 5,000원(공사에 따른 휴관)- 큐빅하우스 3,000원※ 요금 감경 대상자 및 자세한 안내는 홈페이지 참조",
                      ),
                    ],
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts">
            <div>
              <dt>입장료 안내 · 대상별 요금표 우선</dt>
              <dd>
                <AdmissionInformation
                  values={[]}
                  alternatives={[
                    [
                      feeSample("adultChrge", "0"),
                      feeSample("childChrge", "0"),
                      feeSample("yngbgsChrge", "0"),
                    ],
                    [
                      feeSample(
                        "usefee",
                        "일반 성인 3000/일반 어린이, 청소년 2000/달성군민 성인 1500/달성군민 어린이, 청소년 1000",
                      ),
                    ],
                  ]}
                  discount={[
                    feeSample(
                      "etcChrgeInfo",
                      "달성군민 50 할인, 미취학, 장애인, 국가유공자 등 조례에 따른 무료입장",
                    ),
                  ]}
                />
              </dd>
            </div>
            <div>
              <dt>할인 안내</dt>
              <dd>
                <EvidenceList
                  values={[
                    feeSample(
                      "etcChrgeInfo",
                      "달성군민 50 할인, 미취학, 장애인, 국가유공자 등 조례에 따른 무료입장",
                    ),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <h3>공식 안내</h3>
          <a
            className="source-link detail-official-link"
            href="https://www.data.go.kr/data/15101578/openapi.do"
            target="_blank"
            rel="noopener noreferrer"
          >
            <strong>홈페이지 보기</strong>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="sample">
          <dl className="detail-facts detail-programs">
            <div>
              <dt>행사 내용 · 연속 번호/변경 안내</dt>
              <dd>
                <ExpandableDetailText
                  label="행사 내용 · 연속 번호/변경 안내"
                  emphasizeHeadings
                  values={[
                    feeSample(
                      "program",
                      "1. 도슭수라상 체험\n2. 경복궁 야간탐방\n- 탐방로: 계조당→외소주방→자경전→집옥재&팔우정→건청궁→향원정\n※ 상황에 따라 동선은 변경될 수 있습니다.",
                    ),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
        <div className="sample">
          <dl className="detail-facts detail-programs">
            <div>
              <dt>행사 내용 · 전시 기간/매주 공연</dt>
              <dd>
                <ExpandableDetailText
                  label="행사 내용 · 전시 기간/매주 공연"
                  emphasizeHeadings
                  values={[
                    feeSample(
                      "program",
                      "- 주요 프로그램 : 상설전시 / 기획전시 / 공연\n\n1. 상설전시 2026.06.04.~2026.12.31\n2. 기획전시 2026.07.15.~2026.12.31.\n3. 공연 매주 수요일 12:10",
                    ),
                  ]}
                />
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
