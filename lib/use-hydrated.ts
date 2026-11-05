import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// false while rendering on the server and during hydration, true after.
// Pages that read the persisted garage show a placeholder until then, so
// the server HTML and the first client render match.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
