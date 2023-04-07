import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { accessible_id } = req.body;

    if (!accessible_id) {
      res.status(400).json({ error: 'Missing accessible_id parameter' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('share_conversations')
        .select('prompts')
        .eq('accessible_id', accessible_id)
        .single();

      if (error) {
        res.status(500).json({ error: 'Error fetching data' });
        return;
      }

      if (!data) {
        res.status(404).json({ error: 'No conversation found for the given accessible_id' });
        return;
      }

      res.status(200).json(data.prompts);
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Error fetching data' });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}
