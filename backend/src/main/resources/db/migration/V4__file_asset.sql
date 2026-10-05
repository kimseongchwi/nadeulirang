-- 파일 본문은 복제하지 않고, 원천이 제공한 대표 사진의 URL과 근거를 분리한다.
CREATE TABLE file_asset (
    id uuid PRIMARY KEY,
    record_id uuid NOT NULL REFERENCES source_record(id),
    observation_id uuid NOT NULL REFERENCES source_observation(id),
    storage_type text NOT NULL DEFAULT 'REMOTE' CHECK (storage_type = 'REMOTE'),
    original_url text NOT NULL CHECK (original_url ~ '^https://tong[.]visitkorea[.]or[.]kr/cms/resource/[0-9]+/[0-9]+_image[0-9]+_[0-9]+[.](jpg|JPG|jpeg|JPEG|png|PNG)$'),
    thumbnail_url text CHECK (thumbnail_url ~ '^https://tong[.]visitkorea[.]or[.]kr/cms/resource/[0-9]+/[0-9]+_image[0-9]+_[0-9]+[.](jpg|JPG|jpeg|JPEG|png|PNG)$'),
    provider text NOT NULL CHECK (provider <> ''),
    attribution_url text NOT NULL CHECK (attribution_url ~ '^https://'),
    license_code text NOT NULL CHECK (license_code = 'KOGL1'),
    active boolean NOT NULL DEFAULT true,
    checked_at timestamptz NOT NULL,
    UNIQUE(record_id, original_url)
);
CREATE UNIQUE INDEX file_asset_representative ON file_asset(record_id) WHERE active;

-- 마지막 성공한 공통 응답만 사용한다. 미검토 자료의 사진도 조회 API의 공개 경계를 따른다.
INSERT INTO file_asset(id, record_id, observation_id, original_url, thumbnail_url,
                       provider, attribution_url, license_code, checked_at)
SELECT DISTINCT ON (r.id) gen_random_uuid(), r.id, b.id,
       regexp_replace(b.raw_row->>'firstimage', '^http:', 'https:'),
       CASE WHEN b.raw_row->>'firstimage2' ~ '^https?://tong[.]visitkorea[.]or[.]kr/cms/resource/[0-9]+/[0-9]+_image[0-9]+_[0-9]+[.](jpg|JPG|jpeg|JPEG|png|PNG)$'
            THEN regexp_replace(b.raw_row->>'firstimage2', '^http:', 'https:') END,
       '한국관광공사 TourAPI', r.source_url, 'KOGL1', b.collected_at
FROM source_record r JOIN record_operation op ON op.record_id=r.id AND op.operation='detailCommon2'
JOIN source_observation b ON b.record_id=r.id AND b.call_id=op.last_success_call
WHERE r.source='TOUR' AND r.license='TOUR_DATA' AND b.raw_row->>'cpyrhtDivCd'='Type1'
AND b.raw_row->>'firstimage' ~ '^https?://tong[.]visitkorea[.]or[.]kr/cms/resource/[0-9]+/[0-9]+_image[0-9]+_[0-9]+[.](jpg|JPG|jpeg|JPEG|png|PNG)$'
ORDER BY r.id, b.collected_at DESC, b.id
ON CONFLICT(record_id, original_url) DO NOTHING;
