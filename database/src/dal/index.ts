export * from './user';
export * from './registerCode';
export * from './invitationCode';
export * from './sessionToken';
export * from './limit';
export * from './order';
export * from './plan';
export * from './apiKeyPool';
export * from './analysis';
export * from './cache';
export * from './notice';

import { defaultRedis } from '../redis';

type initRange = 'chat' | 'dash';

/**
 * 该程序是否被初始化
 */
export async function isInit(range: initRange) {
  return (await defaultRedis.get<boolean>(`initialized:${range}`)) ?? false;
}

/**
 * 设置为初始化
 */
export async function setInit(range: initRange) {
  return (
    (await defaultRedis.set<boolean>(`initialized:${range}`, true)) == 'OK'
  );
}
