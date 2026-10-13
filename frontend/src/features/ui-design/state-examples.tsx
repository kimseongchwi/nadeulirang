import { useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback";

export function StateExamples({ onMessage }: { onMessage: (message: string) => void }) {
  const [statePlacement, setStatePlacement] = useState<"page" | "area">("page");
  return (
    <section id="states">
      <div className="guide-section-head">
        <div>
          <h2>로딩·빈 결과·오류</h2>
          <p className="section-description">
            전체 페이지 안내는 본문 가운데보다 조금 위에, 목록 일부·팝업 안내는 해당 영역 가운데에
            표시합니다. 로딩·빈 결과·실패를 구분하고 다음 동작을 유지합니다.
          </p>
        </div>
        <div className="guide-width-control">
          <label htmlFor="statePlacement">상태 안내 위치</label>
          <select
            id="statePlacement"
            value={statePlacement}
            onChange={(event) =>
              setStatePlacement(event.currentTarget.value === "page" ? "page" : "area")
            }
          >
            <option value="page">전체 페이지 · 조금 위</option>
            <option value="area">부분 영역·팝업 · 가운데</option>
          </select>
        </div>
      </div>
      <div className="state-gallery">
        <article className="state-example">
          <h3>불러오는 중</h3>
          <div className="state-example-stage">
            <LoadingState placement={statePlacement} />
          </div>
          <p className="hint">파비콘과 같은 심볼 · 걷는 듯한 작은 움직임</p>
        </article>
        <article className="state-example">
          <h3>아직 없는 결과</h3>
          <div className="state-example-stage">
            <EmptyState
              placement={statePlacement}
              title="조건에 맞는 곳이 없어요."
              description="다른 지역이나 종류로 찾아볼까요?"
            >
              <button
                className="button secondary"
                onClick={() => onMessage("초기화 버튼의 스타일 예시예요.")}
              >
                초기화
              </button>
            </EmptyState>
          </div>
          <p className="hint">결과 없음 · 조회 실패와 구분</p>
        </article>
        <article className="state-example">
          <h3>불러오기 실패</h3>
          <div className="state-example-stage">
            <ErrorState
              placement={statePlacement}
              sample
              onRetry={() => onMessage("다시 시도 버튼의 스타일 예시예요.")}
            />
          </div>
          <p className="hint">실패 안내 · 다시 시도할 수 있게</p>
        </article>
      </div>
      <p className="hint">
        동작은 스타일 예시입니다. 기기의 움직임 줄이기 설정에서는 로딩 심볼을 고정해서 보여줍니다.
      </p>
    </section>
  );
}
