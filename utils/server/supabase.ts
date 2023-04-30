import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '@/types/user';

export const getAdminSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServerRoleKey = process.env.SUPABASE_SERVER_ROLE_KEY || '';
  return createClient(supabaseUrl, supabaseServerRoleKey);
};

export const getUserProfile = async (userId: string):Promise<UserProfile> => {
  const supabase = getAdminSupabaseClient();
  const { data: user, error } = await supabase
    .from('profiles')
    .select('id, name, plan')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  return user as UserProfile;
}
