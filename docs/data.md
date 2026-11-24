# 공공데이터 원천과 데이터 규칙

이전 버전(`nadeulirang-legacy`, 2026-10~11)에서 확인한 사실과 규칙만 옮겼다. 코드는 가져오지 않았다. 날짜는 확인한 날이며, 공개 전에 다시 확인한다. 규칙마다 근거가 된 legacy 테스트 이름을 적었다.

## 1. 원천

### 한눈에 보기

| 원천 | data.go.kr | 요청 주소 | 키 이름 | 역할 | 이용 조건 |
|---|---|---|---|---|---|
| 한국관광공사 국문 관광정보 서비스_GW (TourAPI) | [15101578](https://www.data.go.kr/data/15101578/openapi.do) | `https://apis.data.go.kr/B551011/KorService2/{오퍼레이션}` | `TOURAPI_SERVICE_KEY` | 기본 원천(다섯 종류 모두) | 데이터는 이용허락 제한 없음. 사진은 유형별 확인 |
| 전국문화축제표준데이터 | [15013104](https://www.data.go.kr/data/15013104/standard.do) | `https://api.data.go.kr/openapi/tn_pubr_public_cltur_fstvl_api` | `FESTIVAL_SERVICE_KEY` | 축제 보완 | 공공누리 제1유형 |
| 전국박물관미술관정보표준데이터 | [15017323](https://www.data.go.kr/data/15017323/standard.do) | `https://api.data.go.kr/openapi/tn_pubr_public_museum_artgr_info_api` | `MUSEUM_SERVICE_KEY` | 시설 보완 | 공공누리 제1유형 |
| 한국문화정보원 한눈에보는문화정보조회서비스 | [15138937](https://www.data.go.kr/data/15138937/openapi.do) | `https://apis.data.go.kr/B553457/cultureinfo` (오퍼레이션 경로는 페이지에 없음. 다시 확인) | `CULTURE_INFO_SERVICE_KEY` | 기간 전시 | 이용허락범위 제한 없음. 사진 조건 미확인 |

### 계정과 한도 (2026-10-29 확인, 2026-11-24 갱신)

- data.go.kr는 계정마다 일반 인증키가 하나이고, 여러 API가 그 키를 함께 쓴다. 승인은 API마다 따로 받는다.
- **Decoding 키**를 쓰고, 요청할 때 한 번만 URL 인코딩한다. 키에 이미 `%XX`가 있으면 Encoding 키이므로 거부한다.
- **TourAPI**
  - 개발계정은 2026-10-03~2028-10-03, 기능별 하루 1,000건이다.
  - 운영계정은 2026-10-29에 심의를 신청했다. 2026-11-24 활용신청 목록에는 아직 개발계정으로 나온다.
- **표준데이터 2종:** 운영 승인을 받았다. 기간은 2026-10-29~2028-10-29, 하루 10,000,000건이다.
- **한눈에보는문화정보:** 개발계정 2026-11-15~2028-11-15(2026-11-24 활용신청 목록). 운영계정은 신청할 예정이다.
  - 공개 페이지(2026-11-24 확인)에 트래픽 한도는 없다. 데이터 형식은 XML이고 업데이트 주기는 실시간이다.
- 초당 한도와 하루 집계가 초기화되는 시각은 안내되지 않았다.
- 활용신청에 적은 서비스 URL `nadeulirang.vercel.app`은 삭제됐다. 공개할 때 변경 절차를 확인한다(재심사가 필요한지, 키가 유지되는지 미검증).
- 키 값은 저장소에 두지 않는다. legacy에서는 사용자 홈 `~/.nadeulirang/.env`에 있었다.

### TourAPI

공통 파라미터는 `MobileOS=WEB`, `MobileApp=nadeulirang`, `_type=json`, `numOfRows`, `pageNo`, `serviceKey`다. `numOfRows`는 자체 규칙으로 20 이하로 둔다.

| 오퍼레이션 | 쓰임 | 주요 파라미터 |
|---|---|---|
| `ldongCode2` | 법정동 시도·시군구 코드 | `lDongRegnCd`, `lDongListYn` |
| `lclsSystmCode2` | 새 분류체계 코드 | `lclsSystm1~3`, `lclsSystmListYn` |
| `areaBasedList2` | 지역·분류별 목록 | `contentTypeId`, `lDongRegnCd`, `lDongSignguCd`, `lclsSystm1~3`, `arrange` |
| `searchKeyword2` | 키워드 검색 | `keyword` |
| `searchFestival2` | 행사 기간 검색 | `eventStartDate`, `eventEndDate` |
| `areaBasedSyncList2` | 동기화 목록(`showflag` 포함) | `showflag`, `modifiedtime` |
| `detailCommon2` | 공통: 이름, 주소, 홈페이지, 소개, `modifiedtime`, 대표 사진, `cpyrhtDivCd`, 분류 | `contentId` |
| `detailIntro2` | 소개: 운영시간·휴무·요금 등 | `contentId`, `contentTypeId` |
| `detailInfo2` | 반복 정보 `infoname`/`infotext`/`serialnum`. 요금이 여기에만 있는 곳이 있다(경복궁) | `contentId`, `contentTypeId` |
| `detailImage2` | 추가 사진 `originimgurl`/`smallimageurl`/`imgname`/`cpyrhtDivCd` | `contentId`, `imageYN`, `subImageYN` |

- `contenttypeid`: 12 관광지, 14 문화시설, 15 축제공연행사.
- 새 필드(`lDongRegnCd`, `lDongSignguCd`, `lclsSystm1~3`)를 쓴다. 옛 필드(`areacode`, `cat1~3`)는 비어 있는 경우가 있다.
- `showflag`: 1은 표출, 0은 비표출(국문 활용 매뉴얼 v4.4).
- `modifiedtime`: 14자리 원천 수정 시각이다. 우리가 조회한 시각과 따로 보관한다.

### 표준데이터 2종

- 파라미터는 `serviceKey`, `type=json`, `numOfRows`, `pageNo`, 그리고 필터다.
  - 축제 필터: `fstvlNm`, `rdnmadr`, `referenceDate`
  - 박물관 필터: `fcltyNm`, `rdnmadr`, `referenceDate`
- **축제 필드:** `fstvlNm`, `opar`(장소), `fstvlStartDate`, `fstvlEndDate`, `fstvlCo`(내용), `mnnstNm`(주관), `auspcInsttNm`, `suprtInsttNm`, `homepageUrl`, `relateInfo`, `rdnmadr`, `lnmadr`, `referenceDate`
  - 요금·할인·예약·취소 필드가 없다. 행마다 고정된 ID도 없다.
  - 분기마다 갱신되고 월초에 병합 시차가 있다. 전체 행 수는 1,321(2026-10-03)이었고, 2026-11 조회 때는 1,372였다.
- **박물관 필드:** `fcltyNm`, `fcltyType`, `operInstitutionNm`, `weekdayOperOpenHhmm`, `weekdayOperColseHhmm`, `holidayOperOpenHhmm`, `holidayCloseOpenHhmm`, `rstdeInfo`, `adultChrge`, `yngbgsChrge`, `childChrge`, `etcChrgeInfo`, `fcltyIntrcn`, `trnsportInfo`, `homepageUrl`, `rdnmadr`, `lnmadr`, `referenceDate`
  - `Colse`, `CloseOpen`은 원천의 실제 철자다. 고치지 않고 그대로 쓴다.
  - 연 1회 갱신된다. 전체 행 수는 1,076(10-03)이었다.

### 응답 형식 (모두 처리해야 한다)

| 상황 | 모양 |
|---|---|
| TourAPI 성공 | `{"response":{"header":{"resultCode":"0000"},"body":{"totalCount":N,"items":{"item":[...]}}}}`. 0건도 정상 |
| 표준 성공 | 결과 코드 `00`. `response.body.items` 배열인 응답과 최상위 `header`·`body` 응답을 둘 다 봤다 |
| 표준 0건 | HTTP 200 + `03 NODATA_ERROR`. 실패가 아니라 0건이다 |
| `items` | 배열, `{item:[...]}`, `{item:{...}}`, `""`(0건) |
| 파라미터 오류 `10` | 다른 최상위 구조: `OpenAPI_ServiceResponse.cmmMsgHeader.returnReasonCode` |
| JSON을 요청했는데 XML 오류가 옴 | `<returnReasonCode>22</returnReasonCode>`. 코드만 읽고 원문은 저장하지 않는다 |

검사 기준
- `totalCount`는 숫자여야 한다.
- 행 수는 `totalCount`와 20 이하여야 한다.
- 행은 객체여야 한다.
- `totalCount > 0`인데 `items`가 비어 있으면 실패다.

근거: `CollectionPolicyTests.validatesSourceBodies`, `readsBothTotalShapes`

### 오류 코드와 호출 예산 (자체 규칙)

- **오류 코드:** data.go.kr에서 보통 쓰는 의미다(문서 확인이 아닌 일반 지식).
  - `20` 접근 거부, `22` 하루 한도 초과, `23` 초당 한도 초과, `30` 등록되지 않은 키, `31` 기간 만료
- **오류 처리**
  - `22`: 그 원천의 수집을 멈춘다.
  - `23`: 속도를 줄이고 다음 실행으로 넘긴다. legacy 코드는 이것을 영구 차단으로 구현해서 문서와 달랐다. 차단을 풀 방법도 없었다.
  - `20`·`30`·`31`: 인증과 기간을 확인할 때까지 멈춘다.
  - 한도 오류는 다시 시도하지 않는다.
- **호출 예산**
  - 원천마다 한 번에 하나씩 호출하고, 요청 시작 간격을 1초 이상 둔다.
  - 24시간 이동 구간의 상한은 TourAPI 800회(오퍼레이션 합산), 표준 원천은 각각 8,000회다.
  - 성공·오류·시간 초과 모두 예산에서 뺀다.
- **방문자 요청 때는 원천을 부르지 않는다.** 저장한 데이터로 응답한다.
- **요청 제한:** 연결 10초, 요청 20초, 본문 2MB까지 받는다. 리다이렉트는 따르지 않는다.
- **키 제거:** 응답·오류·로그에서 키를 지운다. 원문, URL 인코딩, 이중 인코딩, `serviceKey=...` 패턴, JSON 안의 `\u` 이스케이프까지 지운다.

근거: `CollectionStoreTests` "호출 예산은 오류·실행 중 요청을 포함하고 24시간 경계와 원천 중단을 적용한다"

### 종류 매핑

| 종류 | 코드 | 표본 |
|---|---|---|
| `FESTIVAL` 축제 | 타입 15 + `lclsSystm2` EV01 | 강경젓갈축제 506376 |
| `EVENT` 행사 | 타입 15 + EV02·EV03(EV030100 제외) | LH주택전시관 복합문화행사 4091116은 EV030400이라 행사 |
| `EXHIBITION` 전시 | 타입 15 + `lclsSystm3` EV030100 | 팔색찬란 4082595, 안다미로 기획전시 4102351(종료) |
| `MUSEUM` 박물관 | 타입 14 + VE070100 | 달성화석박물관 3456777, 클레이아크 김해미술관 130841 |
| `CULTURAL_SITE` 문화관광지 | 타입 12 + `lclsSystm1` HS·VE | 경복궁 126508 |

- 그 밖의 코드는 분류하지 않고 검토 대기로 둔다. 이름에 '축제'·'전시'가 들어 있다고 추측하지 않는다.
- VE070600은 미술관과 화랑이 섞여 있어서 자동으로 분류하지 않는다. VE070300 전시관도 기간 전시로 바꾸지 않는다.
- 세부 종류는 `detailCommon2`의 최신 분류로 다시 판정한다.

| 입력(타입, 대·중·소분류) | 결과 |
|---|---|
| 15, EV, EV03, EV030100 | EXHIBITION |
| 15, EV, EV03, EV030400 | EVENT |
| 14, VE, VE07, VE070600 | 분류 안 함 |
| 12, NA, NA01, NA010100 | 분류 안 함 |

근거: `CollectionPolicyTests.mapsReviewedKinds`

### 목록 범위 (legacy 배치 기준)

- **행사:** `searchFestival2`로 조회한다.
  - 시작일 범위는 실행한 달의 1일 기준으로 1년 전부터 3개월 뒤의 전날까지다.
  - 종료일이 지난 행은 건너뛴다.
- **박물관:** `areaBasedList2`에 `contentTypeId=14`, `lclsSystm1=VE`, `lclsSystm2=VE07`, `lclsSystm3=VE070100`을 준다.
- **문화관광지:** `areaBasedList2`에 `contentTypeId=12`, `lclsSystm1=HS`를 준다.
- **표준 2종:** 전국 목록을 `numOfRows=20`, `pageNo`로 넘긴다. 목록이 끝났는지는 두 응답 구조 모두로 판정한다.

### 지역

- `ldongCode2`의 시도는 16개다.
- 원천 코드는 문자열 그대로 보관하고, 두 자리로 자르지 않는다. 세종은 TourAPI `36110`, 공식 코드 `3611000000`으로 길이가 다르다.
- 시도는 `addr1`이 그 시도 이름으로 시작할 때만 확정한다.
- 옛 광주·전남 행을 이름만 보고 새 코드에 합치지 않는다. 대조 기준은 [행정표준코드관리시스템](https://www.code.go.kr/stdcode/regCodeL.do)이다.

### 상세 필드 사전 (원천 필드 → 화면 항목)

| 항목 | 원천 필드 |
|---|---|
| 일정 | `eventstartdate`·`eventenddate`(TourAPI), `fstvlStartDate`·`fstvlEndDate`(표준) |
| 주소 | `addr1`, `addr2`, `rdnmadr`, `lnmadr`, `eventplace`, `opar` |
| 소개 | `overview`, `fcltyIntrcn`, `fcltyType`, `fstvlCo` |
| 운영시간 | `usetime`, `usetimeculture`, `playtime`, `weekdayOperOpenHhmm`, `weekdayOperColseHhmm`, `holidayOperOpenHhmm`, `holidayCloseOpenHhmm` |
| 휴무 | `restdate`, `restdateculture`, `rstdeInfo` |
| 일반 요금 | `usefee`, `usetimefestival`(이름과 달리 축제 요금), `adultChrge`, `yngbgsChrge`, `childChrge` |
| 추가 요금 | `etcChrgeInfo`, `parkingfee` |
| 할인 | `discountinfo`, `discountinfofestival` |
| 예약 | `bookingplace` |
| 공식 홈페이지 | `homepage`, `homepageUrl`, `eventhomepage` |
| 연락처 | `tel`, `infocenter`, `infocenterculture`, `phoneNumber`, `operPhoneNumber` |
| 기타 안내 | `infoname`/`infotext`(반복 정보), `program`, `subevent`, `relateInfo`, `placeinfo` |

반복 정보에는 주차·일반 요금 등이 섞여 있다. 그래서 제목만 보고 요금으로 해석하지 않는다.

### 이용 조건과 출처 표기

- 표준 2종은 [공공누리 제1유형](https://www.kogl.or.kr/info/licenseType1.do)이다. 출처를 표시하면 상업적으로도 이용할 수 있다.
- TourAPI 데이터는 이용허락 제한이 없다. 다만 사진은 공공누리 1·3유형이 섞여 있고, 명예훼손·인격권 침해와 CI/BI 사용은 금지된다.
- 콘텐츠랩(api.visitkorea.or.kr) 가이드는 무단 캐싱과 크롤링을 금지한다. 그래서 데이터는 승인받은 API로만 받는다. 기관 웹페이지는 사실 대조와 공식 링크 제공에만 쓰고 복제하지 않는다.
- 출처는 공통 푸터 한곳에 모아 표시한다: 데이터셋, 제공기관, 원본 링크, 이용 조건. 데이터 이용허락을 외부 홈페이지·사진·작품까지 넓히지 않는다.

### 사진

- **쓰는 사진:** `detailCommon2`의 `firstimage`·`firstimage2`, `detailImage2`의 `originimgurl`·`smallimageurl` 중에서 `cpyrhtDivCd`가 `Type1`인 것만 쓴다.
- **빼는 사진:** Type3(변경금지), 유형이 비어 있는 것, Type2·Type4, 알 수 없는 유형. 유형이 비어 있다고 허락으로 보지 않는다.
- **유형 변경:** 다른 유형으로 명시적으로 바뀌면 그 주소를 끈다. 빈 값이 오면 기존 사진을 유지한다.
- **주소 형식:** `^https?://tong.visitkorea.or.kr/cms/resource/숫자/숫자_image숫자_숫자.(jpg|jpeg|png)$`인 것만 받고, https로 바꿔서 쓴다.
- **파일:** 내려받지 않는다. 크롭·필터·글자 합성·AI 편집도 하지 않는다. 목록 썸네일만 CSS cover로 가장자리를 잘라 보여 준다(2026-10 사용자 결정).
- **출처 표시:** '한국관광공사 TourAPI', 공공누리 제1유형, 데이터셋 링크. 제공기관을 촬영자로 추정하지 않는다.
- **조심할 사진**
  - 전시 내부나 작품 사진은 작품 권리 때문에 보류했었다.
  - 시설 사진을 다른 행사나 회차에 붙이지 않는다.
  - 사진이 없으면 종류 아이콘을 보여 준다. 다른 장소 사진으로 대신하지 않는다.
- **실측:** 공개 상세 72곳 중 사진이 있는 곳은 21곳(29%)이었다. 50곳은 Type3라서 빠졌다.

### 회귀 표본 (실제 원천 ID와 함정)

| 표본 | 원천·ID | 함정 |
|---|---|---|
| 감악산 꽃별 여행 | TourAPI 2746930 | 셔틀버스 3,000원은 입장료가 아니다 |
| 강경젓갈축제 | TourAPI 506376 | 입장은 무료, 체험·판매는 유료라서 따로 나눈다 |
| 클레이아크 김해미술관 | TourAPI 130841 + 박물관 표준 | 표준은 성인 1,000원·분청로 21, TourAPI는 큐빅하우스 3,000원·돔하우스 공사 휴관·분청로 25다. 자동으로 합치지 않고 요금 충돌로 둔다 |
| 달성화석박물관 | TourAPI 3456777 | API에는 화~금 운영시간만 있는데 공식 안내는 주말도 운영한다. API만 보고 주말 휴관을 만들지 않는다 |
| 갈골한과체험전시관 | TourAPI 3539725 | 예약했을 때만 운영한다. 홈페이지 주소에 스킴이 빠져 있다 |
| 경복궁 | TourAPI 126508 | 요금이 `detailInfo2`에만 있다 |
| LH주택전시관 복합문화행사 | TourAPI 4091116 | EV030400은 전시가 아니라 행사다 |
| 팔색찬란 / 안다미로 기획전시 | TourAPI 4082595 / 4102351 | 기간 전시 / 종료된 전시다. 홈페이지 값에 설명 문장이 섞여 있다 |
| 대구교육박물관 | 박물관 표준(`fcltyNm`) | 같은 시설이 3행 나오고, 기준일·개관 시각·주소 괄호가 서로 다르다 |
| 양산삽량문화축전 | 축제 표준(`fstvlNm`) | 기준일은 2026-08-10인데 개최 기간은 2025-09-26~28이다 |

## 2. 데이터 규칙

새 구현에서는 이 가공을 화면이 아니라 서버(수집·가공 단계)에서 한다. 아래 사례를 테스트로 먼저 옮긴다.

### 값 목록

| 값 | 목록 |
|---|---|
| kind | `FESTIVAL`, `EVENT`, `EXHIBITION`, `MUSEUM`, `CULTURAL_SITE` |
| period(조회 때 계산) | `ONGOING`, `UPCOMING`, `PERMANENT`, `ENDED`, `CANCELLED`, `UNKNOWN` |
| feeStatus | `FREE`, `PAID`, `UNKNOWN`. 요금 충돌 여부는 따로 둔다 |

### 날짜

- `yyyyMMdd`와 `yyyy-MM-dd` 형식을 받는다. 달력에 없는 날짜는 값이 없는 것으로 본다.
- 시작일과 종료일은 같은 원문 행에서 나온 쌍으로만 쓰고, 시작 ≤ 끝이어야 한다.
- 유효한 쌍이 하나면 그것이 일정이다. 서로 다른 쌍이 둘 이상이면 일정은 미확인이다. 원천이 서로 다를 때도, 같은 기준일일 때도 마찬가지다.
- 날짜가 빠졌거나 잘못된 응답은 기존 일정을 지우지 않는다.
- 시간대는 Asia/Seoul이고, 시작일과 종료일을 모두 포함한다.

| 입력 | 결과 |
|---|---|
| `"20261003"` | 2026-10-03 |
| `"2026-10-03"` | 2026-10-03 |
| `"20260230"` | 값 없음 |
| 같은 대상의 원천 A가 10-01~10-03, 원천 B가 10-01~10-05 | 일정 미확인 |
| 기존 10-01~10-03에 날짜가 빠진 새 응답 | 10-01~10-03 유지 |

근거: `CollectionPolicyTests.checksTimeBoundaries`, `CollectionStoreTests` "같은 기준일의 다른 행사 날짜 쌍은 단일 일정으로 선택하지 않고 원문을 보존한다", "행사 일정도 유효 기준일을 우선하고 누락·잘못된 날짜로 기존 날짜 쌍을 지우지 않는다"

### 기간(period): 조회할 때마다 서울 날짜로 계산

위에서부터 먼저 맞는 것을 쓴다.

1. 취소 → `CANCELLED`
2. 종료 확정 → `ENDED`
3. 박물관·문화관광지 → `PERMANENT`
4. 날짜 없음 → `UNKNOWN`
5. 종료일 < 오늘 → `ENDED`
6. 시작일 > 오늘 → `UPCOMING`
7. 그 밖 → `ONGOING`

| 일정 | 2026-10-05 23:59:59(서울) | 2026-10-06 00:00:00(서울) |
|---|---|---|
| 10-04~10-05 | ONGOING | ENDED |
| 10-06~10-07 | UPCOMING | ONGOING |

- **곧 시작(홈):** 시작일이 내일부터 오늘+14일까지인 것. 오늘이 10-05면 10-19에 시작하는 것은 포함하고, 10-20에 시작하는 것은 제외한다.
- **종료·취소:** 목록과 선택지에서는 빼고, 상세는 '종료'·'취소'로 표시해 보여 준다.
- **'기간 중'의 의미:** 그날 문을 연다거나 예약할 수 있다는 뜻이 아니다.

근거: `OutingApiTests.computesPeriodAtReadTime`, `homeSectionsAndWindow`, `protectsPublicationBoundaries`

### 신선도

- **오래된 정보 표시:** 행사는 마지막 성공 조회 후 48시간이 지나면 '갱신 지연'이다. 시설은 30일이 지나면 '오래된 정보'다.
  - 경계: 정확히 48시간이면 지연이 아니고, 그보다 조금이라도 지나면 지연이다.
- **상세 재조회 시점:** 원천 `modifiedtime`이 바뀌었을 때, 실패했을 때, 행사는 7일·시설은 30일이 지났을 때.
  - 경계: 행사는 7일째에 재조회한다. 시설은 29일째에는 하지 않는다.
- 새로 조회에 성공했다고 오래된 `modifiedtime`이 최신 사실이 되지는 않는다.
- 표준 원천은 월초 병합 뒤 한 달에 한 번 조회한다. 기준일이 최근이라고 일정·요금이 바뀌었다고 보지 않는다.

근거: `CollectionPolicyTests.checksTimeBoundaries`, `CollectionStoreTests` "상세 성공 기한·원천 수정·실패에 따라 필요한 재조회를 결정한다"

### 요금 상태

- 금액으로 인정하는 것은 숫자뿐이다: `^[0-9]{1,9}(\.[0-9]{1,2})?$`.
- 대상 필드는 `adultChrge`, `usefee`, `usetimefestival`이다.
- 하나라도 숫자가 아니면 `UNKNOWN`이다.
- 서로 다른 금액이나 문구가 있으면 충돌로 표시하고 `UNKNOWN`으로 둔다. 평균·최저가·합산을 내지 않는다.
- 0원은 그 대상에게 무료라는 뜻이다. 빈 값은 미확인이다.
- 할인 조건은 문장 그대로 두고 자동으로 적용하지 않는다. 목록과 검색에 쓰는 요금은 할인이 없는 일반 성인 입장료다.
- 실패, 누락, null, 0건 응답은 기존의 유효한 요금을 지우지 않는다.

| 입력 | 결과 |
|---|---|
| `"3000"` | 3,000원, PAID |
| `"0"` | 0원, FREE |
| `""` / null | UNKNOWN |
| `"3,000"` | UNKNOWN(쉼표가 있으면 숫자로 보지 않음) |
| `"셔틀버스 3,000원"` | UNKNOWN(입장료가 아님) |
| `"군민 무료"` | UNKNOWN |
| TourAPI `usefee` "3000" + 박물관 표준 `adultChrge` "1000" | UNKNOWN + 충돌 |
| 3000으로 저장한 뒤 `adultChrge`가 빠진 새 응답 | 3,000원 유지 |

근거: `CollectionPolicyTests.distinguishesMissingFees`, `CollectionStoreTests` "다른 원천의 요금 충돌은 미확인으로 두고 빈 요금을 0원으로 채우지 않는다", "보완 응답의 누락·null·정상 0건은 기존 유효 요금을 지우지 않는다"

### 요금 문장 나누기 (상세 표시)

| 원문 | 처리 |
|---|---|
| `[이용요금]` 블록(개인 5,000원 / 단체 대인 4,500원·소인 4,000원 / 축제 기간 초등학생 이하 무료) | 대상·조건·기간과 함께 일반 요금 한 덩어리로 옮긴다 |
| `유료(셔틀버스 이용료 3,000원)` | 추가 요금으로 둔다. 일반 요금이 아니다 |
| `[체험요금]` / `[주차요금]` 블록 | 추가 요금 / 주차 요금 |
| `[이용요금]` 입장료 3,000원, 셔틀 1,000원(별도 구매) | 섞여 있어 모호하므로 나누지 않고 원문 안내에 둔다 |
| `무료(김치체험학교 유료)` | 조건부 무료라서 쪼개지 않고 원문 그대로 둔다 |
| `무료(유치원생~초등학생)` | 유치원생~초등학생 = 무료 |
| `돔하우스 5,000원(공사에 따른 휴관)- 큐빅하우스 3,000원` | 시설별로 나눈다: 돔하우스 5,000원(공사에 따른 휴관) / 큐빅하우스 3,000원 |
| `[개인]- 일반 1,500원- 청소년 1,000원[단체(10인 이상)]- 일반 1,000원` | 제목과 대상별 금액으로 나눈다 |
| `성인(조건 1000원`, `입장료 1000원+체험 2000원`, `1,000원-3,000원`, `문의 055-123-4567`, `일반 1,50원` | 고치거나 쪼개지 않고 원문을 유지한다 |
| `달성군민 50 할인, 미취학, 장애인 … 무료입장` | 할인 안내로 옮긴다. '50'을 50%로 바꾸지 않는다 |
| 원천끼리 요금 충돌 | 출처별로 나란히, 중립적으로 보여 준다 |

근거: legacy `frontend/tests/fee-blocks.test.mjs`, `fee-presentation.test.mjs`, `fee-alternatives.test.mjs`

### 시군구

- 각 주소에서 시도 이름 다음에 오는 첫 `[가-힣]+[시군구]` 토큰을 뽑는다. 대상은 `addr1`, `rdnmadr`, `lnmadr`의 최신 성공 값이다.
- 여러 주소의 시군구가 하나로 일치할 때만 보여 준다. 서로 다르거나 없으면 시도만 보여 준다.
- 시도가 다른 주소와 장소 이름은 쓰지 않는다.

| 주소들 | 결과 |
|---|---|
| 경상남도 김해시 …, 경상남도 김해시 … | 김해시 |
| 경상남도 김해시 …, 경상남도 양산시 … | 시도만 |
| 주소 없음 | 시도만 |

근거: `OutingLocationTests`

### 식별과 중복

- **TourAPI:** `contentid`가 식별자다.
- **표준:** 정규화한 이름 + 주소(`rdnmadr`, 없으면 `lnmadr`) + 운영기관(박물관은 `operInstitutionNm`, 축제는 `mnnstNm`)으로 식별한다.
  - 축제는 시작일·종료일·장소(`opar`)도 함께 넣는다. 그래서 해마다 다른 회차가 된다.
  - 주소나 기관이 없으면 `unresolved:<원문 해시>`가 되어 다른 행과 합치지 않는다.
- **정규화:** 괄호 묶음과 공백을 지우되, 건물 번호는 남긴다.
- **원천끼리 합치기:** 검토를 거친 연결로만 합친다. 이름이 같다고 합치지 않는다. 행 순번과 페이지는 식별자가 아니다.

| A | B | 같은 대상? |
|---|---|---|
| 대구 교육 박물관 / 대구광역시 북구 대동로 1 (산격동) / 교육청 | 대구교육박물관 / 대구광역시 북구 대동로 1 / 교육청 | 같음 |
| 대구교육박물관 / 대동로 1 | 대구교육박물관 / 대동로 11 | 다름 |
| 문화축전 2025-09-26~28 | 문화축전 2026-09-26~28 | 다름(회차) |
| 같은 시설 3행(기준일만 다름) | | 대상 1개, 원문 3개 |

근거: `CollectionPolicyTests.preservesIdentityBoundaries`, `CollectionStoreTests.keepsDuplicateHistory`, "전년 축제와 올해 회차는 별도 ID로 두고 이전 ID 이관은 검토한 연결만 기록한다"

### 최신 값 고르기

- 같은 원천·대상·오퍼레이션·필드 안에서는 기준일이 가장 최근인 값을 쓴다. 기준일은 표준은 `referenceDate`, TourAPI는 `modifiedtime`이다.
- 나중에 받았더라도 기준일이 더 오래된 응답은 최신 값을 덮지 않는다.
- 기준일이 같은데 값이 다르면 충돌이다. 같은 응답 안의 두 행이어도 마찬가지다.
- 원천이 다르면 자동으로 하나를 고르지 않고 충돌로 둔다.
- 원문은 지우지 않는다.

| 입력 | 결과 |
|---|---|
| 같은 응답, 같은 기준일 2026-01-01, 같은 시설 2행: 성인 1000 / 3000 | UNKNOWN + 충돌, 원문 2개 보존 |
| 기준일 2026-01-01 값을 받은 뒤, 나중에 기준일 2025-01-01 값을 받음 | 2026-01-01 값 유지 |

근거: `CollectionStoreTests` "같은 응답의 동일 기준일 요금 충돌은 임의로 합치지 않는다", "나중에 받은 오래된 기준일은 최신 사실을 덮지 않고 재처리도 대상·필드를 중복 생성하지 않는다", `OutingInformationTests`

### 실패·빈 응답·상태

- 실패, 0건, 빈 값, null, 필드 누락은 기존 값을 지우지 않는다. 빈 상세 응답은 '재확인 필요(`EMPTY_DETAIL`)'로 남긴다.
- 한 오퍼레이션이 성공해도 다른 오퍼레이션의 실패 기록은 지우지 않는다.
- 목록에서 사라지거나 0건이 오거나 연결에 실패했다고 취소·폐업으로 보지 않는다.
- `showflag=0`은 숨김이다. 검색에서는 빼지만 취소는 아니다. 취소는 공식 공지를 확인하고 사람이 검토해서만 정한다.
- 마지막 성공 시각과 실패 이유를 남겨서 화면에 보여 줄 수 있게 한다.

근거: `CollectionStoreTests.retainsDataAfterFailure`, `separatesHiddenAndCancelled`, "정상 소개 0건은 기존 행사 날짜·원문을 보존하고 재확인 사유를 남긴다"

### 링크와 텍스트

- 링크는 원문에서 http/https 주소만 뽑는다. `javascript:`와 사용자 정보가 붙은 주소(`user:pass@`)는 거부한다.
  - 예: `안내 <a href="https://example.com/info">관람</a>` → `https://example.com/info`
- 원천 문장은 HTML로 넣지 않고 텍스트로만 보여 준다.
- 링크가 있다고 예약이 필요하다고 보지 않는다. 수용 인원을 잔여석으로 바꾸지 않는다.

근거: `CollectionPolicyTests.constrainsRequests`

### 공개 기준

- 다음이 모두 있어야 공개한다: 이름, 원천 ID, 검토된 종류, 시도, 출처, 수집·확인 시각, 이용허락.
- 일정·운영·요금이 빠졌다고 공개를 막지 않는다. 대신 '미확인'으로 보여 준다.
- 숨김, 미검토, 이용허락이 없는 항목은 없는 항목과 똑같이 404로 응답한다. 응답에 그 이유를 드러내지 않는다.
- 지역·종류 선택지는 실제 공개된 항목으로 만든다. 원천에 코드가 있다고 '지원 지역'으로 표시하지 않는다.

근거: `OutingApiTests.protectsPublicationBoundaries`, `exposesAvailableOptions`

## 3. 데이터 범위 (2026-11 실측, 기획서에서 다룰 것)

- **저장 범위:** 로컬에 117건을 저장했고, 그중 당일 목록에 나온 것은 46건이었다.
- **11/21~22 주말:** 축제 0, 행사 2, 전시 1, 상설 42(박물관 29, 문화관광지 13)였다.
  - 같은 주말과 날짜가 겹치는 축제 표준 행은 18행(축제 17개)이었다. 표준 원천을 더 활용하면 범위를 늘릴 수 있다.
- **사진:** 사진이 있는 곳은 29%였다. 대부분 Type3라서 빠졌다.
- **전시 후보:** 한눈에보는문화정보(개발 승인)로 주말과 겹치는 전시 266건을 조회했다. 로컬 자료와 중복을 확인하고 장소 누락 1건·상설 표기 9건을 빼서 기간 전시 후보 256건을 얻었다.
