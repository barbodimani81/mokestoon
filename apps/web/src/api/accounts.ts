import {
  ApiFailure,
  json,
  lastAccount,
  rememberAccount,
  request,
} from "./client";
import type { components } from "./schema";

type Profile = components["schemas"]["AccountProfile"];
type Email = components["schemas"]["AccountEmail"];
type Login = components["schemas"]["AccountLogin"];
type Challenge = components["schemas"]["CompleteEmailChallenge"];
export const accounts = {
  rename: (owner: string, body: components["schemas"]["ProfileUpdate"]) =>
    request("players/me", body, owner, "PATCH"),
  profile: () => json<Profile>("me"),
  register: (body: Email) => request("auth/register", body),
  forgot: (body: Email) => request("auth/password/forgot", body),
  login: (body: Login) => request("auth/login", body),
  verify: (body: Challenge) => request("auth/verify-email", body),
  reset: (body: Challenge) => request("auth/password/reset", body),
  logout: () => request("auth/logout", {}),
};
export async function apartmentOwner(): Promise<string | null> {
  try {
    const profile = await accounts.profile();
    rememberAccount(profile.player_id);
    return profile.player_id;
  } catch (err) {
    if (err instanceof ApiFailure && err.status === 401) {
      rememberAccount(null);
      return null;
    }
    // The last authenticated player can continue local play during an outage.
    return lastAccount();
  }
}
