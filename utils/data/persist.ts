export const setData = (key: string, value: string): void => {
  localStorage.setItem(key, value);
};

export const getData = (key: string): string => {
  return localStorage.getItem(key) ?? '';
};

const KEYS_TO_SYNC: string[] = [
  'conversation',
  'prompt',
  'folder',
  'conversationHistory',
  'selectedConversation',
  'prompts',
  'folders',
];

export const syncLocalToKv = async (): Promise<void> => {
  const lsAsObject: Record<string, string> = {};

  for (const key of KEYS_TO_SYNC) {
    const value = getData(key);
    if (value) {
      lsAsObject[key] = value;
    }
  }

  await fetch('/api/persist', {
    method: 'POST',
    // json
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(lsAsObject),
  });
};

export const syncKvToLocal = async (): Promise<void> => {
  const values: Record<string, unknown> = await fetch('/api/persist').then((res) =>
    res.json(),
  );

  for (const [key, value] of Object.entries(values)) {
    setData(key, JSON.stringify(value));
  }
};
