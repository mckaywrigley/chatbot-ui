import { useQuery } from 'react-query';

import useApiService from '@/services/useApiService';

import { Plugin } from '@/types/agent';

export interface UsePluginResult {
  plugins: Plugin[] | undefined;
  error: any;
}

export const usePlugins = (): UsePluginResult => {
  const apiSerivce = useApiService();
  const result = useQuery('plugins', () => apiSerivce.getPlugins(), {
    enabled: true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  return {
    plugins: result.data,
    error: result.error,
  };
};
