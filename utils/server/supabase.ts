import { PluginID } from '@/types/plugin';
import { UserProfile } from '@/types/user';
import { DefaultMonthlyCredits } from '@/utils/config';

import { createClient } from '@supabase/supabase-js';

export const getAdminSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServerRoleKey = process.env.SUPABASE_SERVER_ROLE_KEY || '';
  return createClient(supabaseUrl, supabaseServerRoleKey);
};

export const getUserProfile = async (userId: string): Promise<UserProfile> => {
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
};

export const getIntervalUsages = async (
  apiType: PluginID,
  userId: string,
  hourInterval: number,
): Promise<number> => {
  const supabase = getAdminSupabaseClient();
  const { data: usages, error } = await supabase
    .from('api_usages')
    .select('id, api_type, user_id, timestamp')
    .eq('api_type', apiType)
    .eq('user_id', userId)
    .gte(
      'timestamp',
      new Date(Date.now() - hourInterval * 60 * 60 * 1000).toISOString(),
    )
    .order('timestamp', { ascending: true });

  if (error) {
    throw error;
  }

  return usages.length;
};

export const addUsageEntry = async (
  apiType: PluginID | "gpt-3.5",
  userId: string,
): Promise<void> => {
  const supabase = getAdminSupabaseClient();
  const { error } = await supabase
    .from('api_usages')
    .insert([{ api_type: apiType, user_id: userId }]);

  if (error) {
    throw error;
  }
};

// Get user credits
export const getUserCredits = async (
  userId: string,
  apiType: PluginID,
): Promise<any> => {
  const supabase = getAdminSupabaseClient();
  const { data, error } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .eq('api_type', apiType);

  if (error) {
    throw error;
  }

  if (data && data.length > 0) {
    return data[0];
  } else {
    await addUserCreditsEntry(userId, apiType);
    return DefaultMonthlyCredits[apiType];
  }
};

// Update user credits
export const updateUserCredits = async (
  userId: string,
  apiType: PluginID,
  newBalance: number,
): Promise<void> => {
  const supabase = getAdminSupabaseClient();
  const { data: userCreditEntries, error } = await supabase
    .from('user_credits')
    .update({ balance: newBalance, last_updated: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('api_type', apiType)
    .select();

  if (error) {
    throw error;
  }
  
  if (!userCreditEntries || userCreditEntries.length === 0) {
    await addUserCreditsEntry(userId, apiType);
  }
};

// Subtract one credit from user's balance
export const subtractCredit = async (userId: string, apiType: PluginID): Promise<void> => {
  const userCredits = await getUserCredits(userId, apiType);
  const newBalance = userCredits.balance - 1;
  await updateUserCredits(userId, apiType, newBalance);
};

// Add user credits entry
export const addUserCreditsEntry = async (
  userId: string,
  apiType: PluginID,
): Promise<void> => {
  const initialBalance = DefaultMonthlyCredits[apiType];
  const supabase = getAdminSupabaseClient();
  const { error } = await supabase
    .from('user_credits')
    .insert([{ user_id: userId, api_type: apiType, balance: initialBalance }]);

  if (error) {
    throw error;
  }
};

// Check if user has run out of credits
export const hasUserRunOutOfCredits = async (userId: string, apiType: PluginID): Promise<boolean> => {
  const userCredits = await getUserCredits(userId, apiType);
  return userCredits.balance <= 0;
};
