-- 원문을 합성하거나 삭제하지 않고 필드별 유효 근거를 선택한다.
CREATE VIEW effective_field_evidence AS
WITH candidates AS (
    SELECT f.*, b.record_id, c.operation, b.call_id, b.collected_at, r.source,
        CASE WHEN r.source = 'TOUR' AND c.operation = 'detailInfo2'
            THEN coalesce(b.raw_row->>'serialnum', b.raw_row->>'infoname', b.row_hash) ELSE '' END AS slot,
        CASE
            WHEN r.source IN ('MUSEUM','FESTIVAL') AND b.source_reference ~ '^\d{4}-\d{2}-\d{2}$'
                AND pg_input_is_valid(b.source_reference, 'date') THEN b.source_reference
            WHEN r.source = 'TOUR' AND b.source_reference ~ '^\d{14}$'
                AND pg_input_is_valid(substr(b.source_reference,1,4)||'-'||substr(b.source_reference,5,2)||'-'||substr(b.source_reference,7,2), 'date')
                AND substr(b.source_reference,9,2) < '24' AND substr(b.source_reference,11,2) < '60'
                AND substr(b.source_reference,13,2) < '60' THEN b.source_reference
        END AS valid_reference
    FROM field_evidence f JOIN source_observation b ON b.id=f.observation_id
    JOIN source_record r ON r.id=b.record_id JOIN source_call c ON c.id=b.call_id
    WHERE c.outcome='SUCCESS' AND f.value <> 'null'::jsonb AND btrim(f.value #>> '{}') <> ''
), ranked AS (
    SELECT *, dense_rank() OVER (PARTITION BY record_id,operation,field_name,slot
        ORDER BY valid_reference DESC NULLS LAST,
        CASE WHEN valid_reference IS NULL THEN collected_at END DESC) AS rank
    FROM candidates
)
SELECT id,observation_id,field_name,value,source_url,source_reference,checked_at,
    reviewed_at,valid_from,valid_to,review_note,record_id,operation,call_id,collected_at
FROM ranked WHERE rank=1;
