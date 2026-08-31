--------------- ADD DESIGN CONTENT FIELDS ---------------

-- Add content field to store generated design data
ALTER TABLE designs 
ADD COLUMN IF NOT EXISTS content TEXT CHECK (char_length(content) <= 10000000),
ADD COLUMN IF NOT EXISTS objectives TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS variables TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS special_considerations TEXT[] DEFAULT '{}';

-- Add comment to explain the content field
COMMENT ON COLUMN designs.content IS 'JSON string containing generated design content from AI agents (reportWriterOutput, searchResults, etc.)';
COMMENT ON COLUMN designs.objectives IS 'Array of research objectives for the experiment';
COMMENT ON COLUMN designs.variables IS 'Array of variables to be tested in the experiment';  
COMMENT ON COLUMN designs.special_considerations IS 'Array of special considerations for the experiment';
