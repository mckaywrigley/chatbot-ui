import { useMemo } from 'react';
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

    const { data, error } = await supabaseClient
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
    
    const gpt4Credits = (data?.find((creditRow) => creditRow.api_type === PluginID.GPT4)?.balance || 0) as number;
    const imageGenCredits = (data?.find((creditRow) => creditRow.api_type === PluginID.IMAGE_GEN)?.balance || 0) as number;

    if (error) {
      console.error(error);
    } else if (data.length !== 0) {
      setCreditUsage({
        [PluginID.GPT4]: {
          remainingCredits: gpt4Credits,
        },
        [PluginID.IMAGE_GEN]: {
          remainingCredits: imageGenCredits,
        }
      });
    }
  };

  return { fetchAndUpdateCreditUsage, creditUsage };
};
