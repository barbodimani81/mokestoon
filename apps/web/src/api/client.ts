import { apiErrors } from "../i18n/interface";
export class ApiFailure extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
async function send(
  path: string,
  body?: unknown,
  player?: string,
  method = body === undefined ? "GET" : "POST",
): Promise<Response> {
  const headers = new Headers();
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (player) headers.set("X-F7-Player", player);
  const response = await fetch(`/api/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    credentials: "same-origin",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new ApiFailure(
      response.status,
      apiErrors[error?.error?.code] ?? apiErrors.UNAVAILABLE,
    );
  }
  return response;
}
const accountKey = "f7.signed-in-player";
export function lastAccount(): string | null {
  try {
    return localStorage.getItem(accountKey);
  } catch {
    return null;
  }
}
export function rememberAccount(owner: string | null) {
  try {
    if (owner) localStorage.setItem(accountKey, owner);
    else localStorage.removeItem(accountKey);
  } catch {
    /* Cookies still identify online sessions. */
  }
}
export function onAccountChange(fn: () => void) {
  window.addEventListener("storage", (e) => {
    if (e.key === accountKey) fn();
  });
}
let rotating: Promise<void> | undefined;
function renew(): Promise<void> {
  if (rotating) return rotating;
  async function rotate() {
    try {
      await send("me");
      return;
    } catch (err) {
      if (!(err instanceof ApiFailure && err.status === 401)) throw err;
    }
    await send("auth/refresh", {});
  }
  const task = async () => {
    if (navigator.locks)
      await navigator.locks.request("f7-refresh-session", rotate);
    else await rotate();
  };
  rotating = task().finally(() => {
    rotating = undefined;
  });
  return rotating;
}
export async function request(
  path: string,
  body?: unknown,
  player?: string,
  method?: string,
): Promise<Response> {
  try {
    return await send(path, body, player, method);
  } catch (err) {
    if (
      !(err instanceof ApiFailure && err.status === 401 && lastAccount()) ||
      path.startsWith("auth/") ||
      path.startsWith("development/")
    )
      throw err;
    await renew();
    return send(path, body, player, method);
  }
}
export async function json<T>(
  path: string,
  body?: unknown,
  player?: string,
  method?: string,
): Promise<T> {
  return (await request(path, body, player, method)).json();
}
