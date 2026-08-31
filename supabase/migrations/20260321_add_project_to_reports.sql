-- Add project_id to reports table to link reports to projects
ALTER TABLE reports 
ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX reports_project_id_idx ON reports(project_id);

-- Update RLS policy to include project context
DROP POLICY IF EXISTS "Allow full access to own reports" ON reports;
CREATE POLICY "Allow full access to own reports"
    ON reports
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());