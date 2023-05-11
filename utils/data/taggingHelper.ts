import { v4 as uuidv4 } from 'uuid';

export const getOrGenerateUserId = (): string => {
  const localStorageKey = 'unique_user_id';

  let uniqueId = localStorage.getItem(localStorageKey);
  if (!uniqueId) {
    uniqueId = uuidv4();
    localStorage.setItem(localStorageKey, uniqueId);
  }

  return uniqueId;
};
