import { useCallback, useState } from 'react';

export type RequestModel = {
  params?: object;
  headers?: object;
  signal?: AbortSignal;
  body?: object | FormData;
};

export const useFetch = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  const fetchHandler = useCallback(
    async (method: string, url: string, request: RequestModel) => {
      setIsLoading(true);
      setError(null);
      setData(null);

      const requestUrl = request?.params ? `${url}${request.params}` : url;

      const requestBody = request?.body
        ? request.body instanceof FormData
          ? { ...request, body: request.body }
          : { ...request, body: JSON.stringify(request.body) }
        : request;

      const headers = {
        ...(request?.headers
          ? request.headers
          : request?.body && request.body instanceof FormData
          ? {}
          : { 'Content-type': 'application/json' }),
      };

      try {
        const response = await fetch(requestUrl, {
          ...(requestBody as RequestInit),
          headers,
          method,
        });

        if (!response.ok) throw response;

        const contentType = response.headers.get('content-type');
        const contentDisposition = response.headers.get('content-disposition');

        const result =
          contentType && contentType?.indexOf('application/json') !== -1
            ? await response.json()
            : contentDisposition?.indexOf('attachment') !== -1
            ? await response.blob()
            : response;

        setData(result);
        setIsLoading(false);
      } catch (err: any) {
        const contentType = err.headers.get('content-type');

        const errResult =
          contentType && contentType?.indexOf('application/problem+json') !== -1
            ? await err.json()
            : err;

        setError(errResult);
        setIsLoading(false);
      }
    },
    [],
  );

  const get = useCallback(
    async (url: string, request: RequestModel) => {
      await fetchHandler('get', url, request);
    },
    [fetchHandler],
  );

  const post = useCallback(
    async (url: string, request: RequestModel) => {
      await fetchHandler('post', url, request);
    },
    [fetchHandler],
  );

  const put = useCallback(
    async (url: string, request: RequestModel) => {
      await fetchHandler('put', url, request);
    },
    [fetchHandler],
  );

  const patch = useCallback(
    async (url: string, request: RequestModel) => {
      await fetchHandler('patch', url, request);
    },
    [fetchHandler],
  );

  const deleteReq = useCallback(
    async (url: string, request: RequestModel) => {
      await fetchHandler('delete', url, request);
    },
    [fetchHandler],
  );

  return {
    isLoading,
    data,
    error,
    get,
    post,
    put,
    patch,
    delete: deleteReq,
  };
};
