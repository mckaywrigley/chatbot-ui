import { useQuery } from 'react-query';

import useApiService from '@/services/useApiService';

export const useTools = () => {
  const apiSerivce = useApiService();
  const result = useQuery('tools', () => apiSerivce.getTools());
  return {
    tools: result.data,
    error: result.error,
  };
};
