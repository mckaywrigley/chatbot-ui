export type RequestModel = {
  params?: object;
  headers?: object;
  signal?: AbortSignal;
  rawResponse?: boolean;
};

export type RequestWithBodyModel = RequestModel & {
  body?: object | string | FormData;
};

export const useFetch = () => {
  const handleFetch = async (
    url: string,
    request: any,
    signal?: AbortSignal,
    rawResponse?: boolean,
  ) => {
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

    return fetch(requestUrl, { ...requestBody, headers, signal })
      .then((response) => {
        if (!response.ok) throw response;
        if (rawResponse) return response;

        const contentType = response.headers.get('content-type');
        const contentDisposition = response.headers.get('content-disposition');

        const headers = response.headers;

        const result =
          contentType &&
          (contentType?.indexOf('application/json') !== -1 ||
            contentType?.indexOf('text/plain') !== -1)
            ? response.json()
            : contentDisposition?.indexOf('attachment') !== -1
            ? response.blob()
            : response;

        return result;
      })
      .catch(async (err) => {
        console.error(err);
        if (err.headers) {
          const contentType = err.headers.get('content-type');
          const errResult =
            contentType &&
            contentType?.indexOf('application/problem+json') !== -1
              ? await err.json()
              : err;

          throw errResult;
        } else {
          throw err;
        }
      });
  };

  return {
    get: async <T>(url: string, request?: RequestModel): Promise<T> => {
      return handleFetch(url, { ...request, method: 'get' });
    },
    post: async <T>(
      url: string,
      request?: RequestWithBodyModel,
    ): Promise<T> => {
      return handleFetch(
        url,
        { ...request, method: 'post' },
        request?.signal,
        request?.rawResponse,
      );
    },
    put: async <T>(url: string, request?: RequestWithBodyModel): Promise<T> => {
      return handleFetch(url, { ...request, method: 'put' });
    },
    patch: async <T>(
      url: string,
      request?: RequestWithBodyModel,
    ): Promise<T> => {
      return handleFetch(url, { ...request, method: 'patch' });
    },
    delete: async <T>(url: string, request?: RequestModel): Promise<T> => {
      return handleFetch(url, { ...request, method: 'delete' });
    },
  };
};
