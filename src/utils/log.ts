/**
 * Development-only logging for failures the app deliberately swallows.
 *
 * Several paths here catch and carry on by design — a dropped vision request
 * must not interrupt a broadcast, a photo that won't resolve must not fail the
 * picker. That was right about not interrupting the user and wrong about never
 * telling anyone: before this there was not a single `console` call in `src/`,
 * so every one of those failures was invisible even while debugging.
 *
 * `__DEV__` guards the call so a release build stays silent. That matters more
 * than usual here: the UI is composited over a live camera and burned into an
 * exported video, and logs would carry the shape of what the user was doing.
 * Never pass a key, a frame, or a file path.
 */
export function warn(scope: string, error: unknown): void {
  if (!__DEV__) return;
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.warn(`[${scope}] ${detail}`);
}
