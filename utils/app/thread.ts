import { Thread } from "@/types/assistant";

export const updateThread = (
  updatedThread: Thread,
  allThreads: Thread[],
) => {
  const updatedThreads = allThreads.map((t) => {
    if (t.id === updatedThread.id) {
      return updatedThread;
    }

    return t;
  });

  saveThread(updatedThread);
  saveThreads(updatedThreads);

  return {
    single: updatedThread,
    all: updatedThreads,
  };
}

export const saveThread = (thread: Thread) => {
  localStorage.setItem('selectedThread', JSON.stringify(thread));
}

export const saveThreads = (threads: Thread[]) => {
  localStorage.setItem('threadHistory', JSON.stringify(threads));
}