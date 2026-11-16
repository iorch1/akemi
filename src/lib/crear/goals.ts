import type { FlagGoal, PlayerState } from "./physics";
import { flagReached } from "./physics";

export function isFlagComplete(state: PlayerState, flag: FlagGoal): boolean {
  return flagReached(state, flag);
}
