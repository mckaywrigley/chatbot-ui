import { useCallback } from 'react';

import { useFetch } from '@/hooks/useFetch';

import { getEndpoint } from '@/utils/app/api';

import {
  ExecuteToolRequest,
  PlanningRequest,
  Plugin,
  PluginResult,
  ReactAgentResult,
} from '@/types/agent';
import { ChatBody, Conversation, Message } from '@/types/chat';

export interface GetModelsRequestProps {
  key: string;
}

export type PlanningRequestProps = PlanningRequest;

const useApiService = () => {
  const fetchService = useFetch();

  // const getModels = useCallback(
  // 	(
  // 		params: GetManagementRoutineInstanceDetailedParams,
  // 		signal?: AbortSignal
  // 	) => {
  // 		return fetchService.get<GetManagementRoutineInstanceDetailed>(
  // 			`/v1/ManagementRoutines/${params.managementRoutineId}/instances/${params.instanceId
  // 			}?sensorGroupIds=${params.sensorGroupId ?? ''}`,
  // 			{
  // 				signal,
  // 			}
  // 		);
  // 	},
  // 	[fetchService]
  // );

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

  const chat = useCallback(
    (
      params: { body: ChatBody; conversation: Conversation },
      signal?: AbortSignal,
    ) => {
      return fetchService.post<Message>(`/api/chat`, {
        body: params.body,
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
        rawResponse: true,
      });
    },
    [fetchService],
  );

  const googleSearch = useCallback(
    (
      params: { body: ChatBody; conversation: Conversation },
      signal?: AbortSignal,
    ) => {
      return fetchService.post<Message>(`/api/google`, {
        body: params.body,
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
        rawResponse: true,
      });
    },
    [fetchService],
  );

  const planning = useCallback(
    (params: PlanningRequestProps, signal?: AbortSignal) => {
      return fetchService.post<ReactAgentResult>(`/api/planning`, {
        body: params,
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });
    },
    [fetchService],
  );

  const runPlugin = useCallback(
    (params: ExecuteToolRequest, signal?: AbortSignal) => {
      return fetchService.post<PluginResult>(`/api/runplugin`, {
        body: params,
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });
    },
    [fetchService],
  );

  const getPlugins = useCallback(
    (signal?: AbortSignal) => {
      return fetchService.post<Plugin[]>(`/api/plugins`, {
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
    chat,
    googleSearch,
    planning,
    runPlugin,
    getPlugins,
  };
};

export default useApiService;
