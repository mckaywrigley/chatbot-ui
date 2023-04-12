import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { opinion, conversation, positive } = req.body;

  if (!conversation || typeof positive === 'undefined') {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('conversation_feedback')
      .insert([{ opinion, conversation, positive }]);

    if (error) {
      throw new Error(error.message);
    }

    return res.status(201).json({ data });
  } catch (err) {
    return res.status(500).json({ error: (err as any).message });
  }
}
