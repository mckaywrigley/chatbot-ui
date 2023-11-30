import { Run } from "@/types/assistant";

export const saveRun = (run: Run) => {
  localStorage.setItem('latestdRun', JSON.stringify(run));
}