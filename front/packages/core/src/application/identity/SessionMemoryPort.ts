/**
 * Port: a non-secret hint that a session existed in this browser (ADR 0013), never a token nor an address.
 * It tells "session expired" from "never signed in", and lets other tabs follow a sign-out.
 */
export interface SessionMemory {
  wasSignedIn(): boolean;
  remember(): void;
  forget(): void;
  /** Called when another tab changes the hint; returns the unsubscribe function. */
  onChange(listener: () => void): () => void;
}
