import { useContext, useMemo } from 'react';
import { useState } from 'react';

import { PluginID } from '@/types/plugin';
import { CreditUsage } from '@/types/user';

import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';

export const useFetchCreditUsage = () => {
  const [creditUsage, setCreditUsage] = useState<CreditUsage | null>(null);

  const supabaseClient = useMemo(() => createBrowserSupabaseClient(), []);

  const fetchAndUpdateCreditUsage = async (
    userId: string,
    isPaidUser: boolean,
  ) => {
    if(!isPaidUser) return;

    // GPT-4
    const { data, error } = await supabaseClient
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .eq('api_type', PluginID.GPT4);

    if (error) {
      console.error(error);
    } else if (data.length !== 0) {
      setCreditUsage({
        [PluginID.GPT4]: {
          remainingCredits: data[0].balance,
        },
      });
    }
  };

  return { fetchAndUpdateCreditUsage, creditUsage };
};
