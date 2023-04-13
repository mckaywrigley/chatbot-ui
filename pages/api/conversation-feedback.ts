import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Error', { status: 405, statusText: 'Method not allowed' });
  }

  const { opinion, conversation, positive } = (await req.json())

  if (!conversation || typeof positive === 'undefined') {
    return new Response('Error', { status: 400, statusText: 'Missing required fields' });
  }

  try {
    const { error } = await supabase
      .from('conversation_feedback')
      .insert([{ opinion, conversation, positive }]);

    if (error) {
      throw new Error(error.message);
    }

    return new Response('Success', { status: 201 });
  } catch (err) {
    console.error(err)
    return new Response('Error', { status: 500 });
  }
}

export default handler;