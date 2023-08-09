import { useCallback } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { IResponse } from '@/types/response';

export interface ISignUpRequestProps {
  email: string;
  name: string;
  password: string;
}

const useAuthService = () => {
  const fetchService = useFetch();

  const signUp = useCallback(
    (params: ISignUpRequestProps, signal?: AbortSignal) => {
      const { email, name, password } = params;
      return fetchService.post<IResponse>(`/api/user`, {
        body: { email, name, password },
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });
    },
    [fetchService],
  );

  return {
    signUp,
  };
};

export default useAuthService;
