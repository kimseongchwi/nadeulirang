-- 목록의 부분 처리 위치와 성공 응답을 함께 보존한다. 기존 원문·예산 기록은 유지한다.
CREATE TABLE collection_checkpoint (
    stream_key text PRIMARY KEY,
    source text NOT NULL REFERENCES collection_source(name),
    operation text NOT NULL,
    query jsonb NOT NULL,
    page_no integer NOT NULL DEFAULT 1 CHECK (page_no > 0),
    row_index integer NOT NULL DEFAULT 0 CHECK (row_index BETWEEN 0 AND 20),
    page_call uuid REFERENCES source_call(id),
    completed boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL
);
