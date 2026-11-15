import type { SignupResult } from './client';

// Step 1 runs in the background while the popup is already open. The popup's
// step 2 submit awaits it so the Sheet sees step 1 before step 2.
let pending: Promise<SignupResult> | null = null;

export function setPendingStep1(promise: Promise<SignupResult>): void {
  pending = promise;
  const clear = () => {
    if (pending === promise) pending = null;
  };
  promise.then(clear, clear);
}

export function getPendingStep1(): Promise<SignupResult> | null {
  return pending;
}
