import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://<project>.supabase.co',
  '<your-anon-key>',
);
