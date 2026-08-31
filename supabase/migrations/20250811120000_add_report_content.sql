--------------- ADD REPORT CONTENT FIELDS ---------------

-- Add columns to store generated report content
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS report_outline TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE reports
ADD COLUMN IF NOT EXISTS report_draft JSONB DEFAULT '{}'::jsonb;

ALTER TABLE reports
ADD COLUMN IF NOT EXISTS chart_image TEXT;


