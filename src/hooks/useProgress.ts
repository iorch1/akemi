import { useCallback, useEffect, useState } from "react";
import {
  commitProgress,
  loadProgress,
  type ProgressState,
  subscribeProgress,
} from "../lib/progress";

export function useProgress(): [ProgressState, (next: ProgressState) => void] {
  const [state, setState] = useState<ProgressState>(() => loadProgress());

  useEffect(() => subscribeProgress(() => setState(loadProgress())), []);

  const update = useCallback((next: ProgressState) => {
    commitProgress(next);
    setState(next);
  }, []);

  return [state, update];
}