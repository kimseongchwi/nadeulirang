-- 원천 호출과 원문은 제품 항목 및 검토 결과와 분리하여 보존한다.
CREATE TABLE collection_source (
    name text PRIMARY KEY CHECK (name IN ('TOUR', 'FESTIVAL', 'MUSEUM')),
    blocked_reason text,
    last_started_at timestamptz
);
INSERT INTO collection_source(name) VALUES ('TOUR'), ('FESTIVAL'), ('MUSEUM');

CREATE TABLE source_call (
    id uuid PRIMARY KEY,
    source text NOT NULL REFERENCES collection_source(name),
    operation text NOT NULL,
    query jsonb NOT NULL,
    started_at timestamptz NOT NULL,
    finished_at timestamptz,
    outcome text NOT NULL CHECK (outcome IN ('STARTED', 'SUCCESS', 'EMPTY', 'FAILED')),
    result_code text,
    payload jsonb,
    CHECK (outcome NOT IN ('SUCCESS', 'EMPTY') OR finished_at IS NOT NULL)
);
CREATE INDEX source_call_budget ON source_call(source, started_at);

CREATE TABLE outing (
    id uuid PRIMARY KEY,
    review_key text UNIQUE NOT NULL,
    name text NOT NULL,
    kind text CHECK (kind IN ('FESTIVAL', 'EVENT', 'EXHIBITION', 'MUSEUM', 'CULTURAL_SITE')),
    region_code text,
    region_name text,
    review_status text NOT NULL DEFAULT 'PENDING' CHECK (review_status IN ('PENDING', 'APPROVED')),
    review_reason text,
    reviewed_at timestamptz,
    lifecycle text NOT NULL DEFAULT 'UNKNOWN' CHECK (lifecycle IN ('UNKNOWN', 'ACTIVE', 'ENDED', 'CANCELLED')),
    visibility text NOT NULL DEFAULT 'UNKNOWN' CHECK (visibility IN ('UNKNOWN', 'VISIBLE', 'HIDDEN')),
    fee_status text NOT NULL DEFAULT 'UNKNOWN' CHECK (fee_status IN ('UNKNOWN', 'FREE', 'PAID')),
    adult_fee numeric(12,2) CHECK (adult_fee >= 0),
    fee_conflict boolean NOT NULL DEFAULT false,
    event_start date,
    event_end date,
    operation_verified boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL,
    CHECK (event_start IS NULL OR event_end IS NULL OR event_start <= event_end),
    CHECK ((fee_status = 'UNKNOWN' AND adult_fee IS NULL)
        OR (fee_status = 'FREE' AND adult_fee = 0)
        OR (fee_status = 'PAID' AND adult_fee > 0)),
    CHECK (review_status <> 'APPROVED' OR
        (kind IS NOT NULL AND region_code IS NOT NULL AND region_name IS NOT NULL AND reviewed_at IS NOT NULL))
);

CREATE TABLE source_record (
    id uuid PRIMARY KEY,
    source text NOT NULL REFERENCES collection_source(name),
    source_key text NOT NULL,
    identity_candidate text NOT NULL,
    outing_id uuid NOT NULL REFERENCES outing(id),
    source_url text NOT NULL CHECK (source_url ~ '^https?://'),
    license text NOT NULL,
    last_success_at timestamptz NOT NULL,
    last_failure_at timestamptz,
    last_failure_code text,
    UNIQUE(source, source_key)
);

CREATE TABLE source_observation (
    id uuid PRIMARY KEY,
    record_id uuid NOT NULL REFERENCES source_record(id),
    call_id uuid NOT NULL REFERENCES source_call(id),
    row_hash text NOT NULL,
    raw_row jsonb NOT NULL,
    source_reference text,
    collected_at timestamptz NOT NULL,
    UNIQUE(record_id, call_id, row_hash)
);

CREATE TABLE record_operation (
    record_id uuid NOT NULL REFERENCES source_record(id),
    operation text NOT NULL,
    last_success_at timestamptz,
    last_success_call uuid REFERENCES source_call(id),
    last_failure_at timestamptz,
    failure_code text,
    PRIMARY KEY(record_id, operation)
);

CREATE TABLE field_evidence (
    id uuid PRIMARY KEY,
    observation_id uuid NOT NULL REFERENCES source_observation(id),
    field_name text NOT NULL,
    value jsonb NOT NULL,
    source_url text NOT NULL,
    source_reference text,
    checked_at timestamptz NOT NULL,
    reviewed_at timestamptz,
    valid_from date,
    valid_to date,
    review_note text
);
CREATE INDEX field_evidence_history ON field_evidence(field_name, observation_id);

CREATE TABLE source_link_history (
    id uuid PRIMARY KEY,
    record_id uuid NOT NULL REFERENCES source_record(id),
    from_outing_id uuid REFERENCES outing(id),
    to_outing_id uuid NOT NULL REFERENCES outing(id),
    linked_at timestamptz NOT NULL,
    reason text NOT NULL
);

CREATE TABLE outing_review (
    id uuid PRIMARY KEY,
    outing_id uuid NOT NULL REFERENCES outing(id),
    field_name text NOT NULL,
    value jsonb NOT NULL,
    source_url text NOT NULL CHECK (source_url ~ '^https?://'),
    source_reference text,
    checked_at timestamptz NOT NULL,
    reviewed_at timestamptz NOT NULL,
    valid_from date,
    valid_to date,
    review_due_at timestamptz NOT NULL,
    reason text NOT NULL,
    CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to)
);

-- 공개 후보는 검토와 원천 이용허락을 통과한 실제 저장 항목으로 한정한다.
CREATE VIEW public_candidate AS
SELECT o.* FROM outing o WHERE review_status = 'APPROVED'
AND visibility = 'VISIBLE' AND lifecycle <> 'CANCELLED'
AND EXISTS (SELECT 1 FROM source_record r WHERE r.outing_id = o.id
    AND r.license IN ('KOGL1_DATA', 'TOUR_DATA'));
