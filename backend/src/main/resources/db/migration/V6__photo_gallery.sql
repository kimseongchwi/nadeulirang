-- 기존 사진과 원문을 유지하고 대표 선택을 사진 활성 여부에서 분리한다.
DROP INDEX file_asset_representative;
ALTER TABLE file_asset ADD COLUMN representative boolean NOT NULL DEFAULT false;
ALTER TABLE file_asset ADD COLUMN sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0);
ALTER TABLE file_asset ADD COLUMN image_name text NOT NULL DEFAULT '';
UPDATE file_asset SET representative = true WHERE active;
CREATE UNIQUE INDEX file_asset_representative ON file_asset(record_id) WHERE active AND representative;
CREATE INDEX file_asset_gallery ON file_asset(record_id, representative DESC, sort_order, original_url) WHERE active;
