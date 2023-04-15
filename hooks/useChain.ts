import { Dispatch, MutableRefObject } from 'react';

import { ActionType } from '@/hooks/useCreateReducer';

import useApiService from '@/services/useApiService';

import { Conversation, Message } from '@/types/chat';

import { HomeInitialState } from '@/pages/api/home/home.state';

export const useChain = <T extends any[], R>(
  conversation: Conversation,
  homeDispatch: Dispatch<ActionType<HomeInitialState>>,
) => {
  const apiService = useApiService();
};
