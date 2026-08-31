-- Add file_type column
ALTER TABLE report_files 
ADD COLUMN IF NOT EXISTS file_type TEXT NOT NULL DEFAULT 'protocol'  -- Adding default for existing rows
CHECK (file_type IN ('protocol', 'papers', 'dataFiles'));

-- Add index for file_type for better query performance
CREATE INDEX IF NOT EXISTS report_files_file_type_idx ON report_files(file_type);

-- Remove the default after existing rows are updated
ALTER TABLE report_files ALTER COLUMN file_type DROP DEFAULT;