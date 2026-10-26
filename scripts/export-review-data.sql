-- 조회 전용 스냅샷에서 공개 후보 최대 100건과 연결된 원문·근거만 내보낸다.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT 'BEGIN;
SET LOCAL search_path TO nadeulirang;
DO $guard$ BEGIN
  IF EXISTS (SELECT 1 FROM outing) OR EXISTS (SELECT 1 FROM source_record)
     OR EXISTS (SELECT 1 FROM source_call) OR EXISTS (SELECT 1 FROM app_user)
     OR EXISTS (SELECT 1 FROM spring_session) THEN
    RAISE EXCEPTION ''빈 검토 DB에서만 이관할 수 있습니다.'';
  END IF;
END $guard$;';

WITH selected_outings AS (
    SELECT * FROM nadeulirang.public_candidate ORDER BY id LIMIT 100
), records AS (
    SELECT r.* FROM nadeulirang.source_record r
    JOIN selected_outings o ON o.id = r.outing_id
    WHERE r.license IN ('TOUR_DATA', 'KOGL1_DATA')
), observations AS (
    SELECT b.* FROM nadeulirang.source_observation b JOIN records r ON r.id = b.record_id
), operations AS (
    SELECT op.* FROM nadeulirang.record_operation op JOIN records r ON r.id = op.record_id
), calls AS (
    -- 응답 전체 payload는 다른 비공개 항목을 포함할 수 있어 제외한다.
    -- 선택한 항목의 원문은 source_observation.raw_row에 그대로 보존한다.
    -- query는 키·계정 설정의 전송을 원천 차단하기 위해 빈 객체로 둔다.
    SELECT c.id, c.source, c.operation, '{}'::jsonb AS query, c.started_at,
           c.finished_at, c.outcome, c.result_code, NULL::jsonb AS payload
    FROM nadeulirang.source_call c
    WHERE c.id IN (SELECT call_id FROM observations)
       OR c.id IN (SELECT last_success_call FROM operations)
), rows_to_export AS (
    SELECT 1 AS seq, 'outing' AS name, coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb) AS rows
    FROM selected_outings o
    UNION ALL
    SELECT 2, 'source_call', coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) FROM calls c
    UNION ALL
    SELECT 3, 'source_record', coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) FROM records r
    UNION ALL
    SELECT 4, 'source_observation', coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) FROM observations b
    UNION ALL
    SELECT 5, 'record_operation', coalesce(jsonb_agg(to_jsonb(op)), '[]'::jsonb) FROM operations op
    UNION ALL
    SELECT 6, 'field_evidence', coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
    FROM nadeulirang.field_evidence f JOIN observations b ON b.id = f.observation_id
    UNION ALL
    SELECT 7, 'outing_review', coalesce(jsonb_agg(to_jsonb(v)), '[]'::jsonb)
    FROM nadeulirang.outing_review v JOIN selected_outings o ON o.id = v.outing_id
    UNION ALL
    SELECT 8, 'file_asset', coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb)
    FROM nadeulirang.file_asset a JOIN observations b ON b.id = a.observation_id
    JOIN records r ON r.id = a.record_id
    WHERE a.active AND a.license_code = 'KOGL1' AND r.source = 'TOUR'
      AND r.license = 'TOUR_DATA' AND b.record_id = r.id
      AND b.raw_row->>'cpyrhtDivCd' = 'Type1'
)
SELECT format('INSERT INTO %I SELECT * FROM jsonb_populate_recordset(NULL::%I, %L::jsonb);',
              name, name, rows::text)
FROM rows_to_export ORDER BY seq;

SELECT 'COMMIT;';
COMMIT;
