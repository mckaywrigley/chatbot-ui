import { useCallback } from 'react';

import { useFetch } from '@/hooks/useFetch';

export interface GetModelsRequestProps {
  key: string;
}
export interface GetUserRolesRequestProps {
  key: string;
}

const useApiService = () => {
  const fetchService = useFetch();

  const getModels = useCallback(
    (params: GetModelsRequestProps, signal?: AbortSignal) => {
      return fetchService.post<GetModelsRequestProps>(`/api/models`, {
        body: { key: params.key },
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });
    },
    [fetchService],
  );
  const getUserRoles = useCallback(
      (params: GetUserRolesRequestProps, signal?: AbortSignal) => {
        return fetchService.post<GetUserRolesRequestProps>(`/api/user_roles`, {
          body: { key: params.key },
          headers: {
            'Content-Type': 'application/json',
          },
          signal,
        });
      },
      [fetchService],
  );

  return {
    getModels,
    getUserRoles,
  };
};

export default useApiService;
