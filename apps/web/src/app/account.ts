import { accounts } from "../api/accounts";
import { ApiFailure, onAccountChange, rememberAccount } from "../api/client";
import { progression } from "../api/progression";
import { accountCopy, fa } from "../i18n/interface";
import { RankingsPanel } from "../ui/rankings";
import "../ui/style.css";

type Mode = "login" | "register" | "forgot" | "verify" | "reset";
let mode: Mode = "login";
let token = "";
function readLink() {
  if (!location.hash) return;
  const params = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, "", location.pathname);
  for (const step of ["verify", "reset"] as const) {
    const proof = params.get(step);
    if (proof) {
      mode = step;
      token = proof;
      return;
    }
  }
}
readLink();
function element<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing account control ${selector}`);
  return el;
}
const form = element<HTMLFormElement>("#account-form");
const status = element("#account-status"),
  actions = element("#account-actions");
const password = element<HTMLInputElement>('[name="password"]'),
  email = element<HTMLInputElement>('[name="email"]');
for (const field of [email, password]) {
  field.addEventListener("input", () => field.setCustomValidity(""));
  field.addEventListener("invalid", () =>
    field.setCustomValidity(
      field.validity.valueMissing
        ? accountCopy.required
        : field === email
          ? accountCopy.invalidEmail
          : accountCopy.password,
    ),
  );
}
const passwordField = element("#password-field"),
  emailField = element("#email-field");
const submit = element<HTMLButtonElement>("#account-form button");
const profileForm = element<HTMLFormElement>("#profile-form");
const nameInput = element<HTMLInputElement>('[name="display_name"]');
const rankings = new RankingsPanel(element<HTMLDetailsElement>("#rankings"));
onAccountChange(() => location.reload());
let profileOwner = "";
let busy = false;
function message(e: unknown) {
  return e instanceof ApiFailure ? e.message : fa.ConnectionUnavailableTryAgain;
}
function button(label: string, action: () => void) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.onclick = action;
  actions.append(b);
}
function edit(next: Mode) {
  rankings.setOwner(null);
  profileForm.hidden = true;
  mode = next;
  const proof = mode === "verify" || mode === "reset";
  password.value = "";
  email.setCustomValidity("");
  password.setCustomValidity("");
  email.disabled = proof;
  password.disabled = mode === "register" || mode === "forgot";
  emailField.hidden = email.disabled;
  passwordField.hidden = password.disabled;
  password.minLength = proof ? 12 : 1;
  password.autocomplete = proof ? "new-password" : "current-password";
  form.hidden = false;
  actions.replaceChildren();
  const labels: Record<Mode, string> = {
    login: fa.SignIn,
    register: fa.SendVerificationEmail,
    forgot: fa.SendPasswordResetEmail,
    verify: fa.CreateAccount,
    reset: fa.SetNewPassword,
  };
  submit.textContent = labels[mode];
  const help: Record<Mode, string> = {
    login: fa.SignInToYourApartment,
    register: fa.VerifyYourEmailToKeepYourApartmentAcrossBrowsers,
    forgot: fa.EnterTheEmailYouUseForF7,
    verify: fa.ChooseAPasswordOfAtLeast12Characters,
    reset: fa.ChooseANewPasswordOfAtLeast12Characters,
  };
  status.textContent = help[mode];
  if (mode === "login") {
    button(fa.CreateAnAccount, () => edit("register"));
    button(fa.ForgotPassword, () => edit("forgot"));
  } else button(fa.BackToSignIn, () => edit("login"));
}
async function run(fn: () => Promise<void>) {
  if (busy) return;
  busy = true;
  submit.disabled = true;
  actions.inert = true;
  try {
    await fn();
  } catch (err) {
    status.textContent = message(err);
  } finally {
    busy = false;
    submit.disabled = false;
    actions.inert = false;
  }
}
async function signedIn() {
  const p = await accounts.profile();
  profileOwner = p.player_id;
  rankings.setOwner(profileOwner);
  nameInput.value = p.display_name;
  profileForm.hidden = false;
  rememberAccount(p.player_id);
  form.hidden = true;
  actions.replaceChildren();
  status.textContent = accountCopy.signedIn(p.email);
  const link = document.createElement("a");
  link.href = "./";
  link.textContent = fa.OpenApartment;
  actions.append(link);
  button(
    fa.SignOut,
    () =>
      void run(async () => {
        await accounts.logout();
        rememberAccount(null);
        edit("login");
        status.textContent = fa.SignedOut;
      }),
  );
}
profileForm.onsubmit = (event) => {
  event.preventDefault();
  void run(async () => {
    await accounts.rename(profileOwner, { display_name: nameInput.value });
    await signedIn();
    status.textContent = fa.DisplayNameSaved;
  });
};
form.onsubmit = (event) => {
  event.preventDefault();
  void run(async () => {
    if (mode === "register" || mode === "forgot") {
      const register = mode === "register";
      await (register ? accounts.register : accounts.forgot)({
        email: email.value,
      });
      form.hidden = true;
      status.textContent = register
        ? fa.CheckYourInboxForYourVerificationLinkIfThisAddressIsAvailable
        : fa.IfThisAccountExistsAResetLinkIsOnItsWay;
      return;
    }
    if (mode === "login") {
      await accounts.login({ email: email.value, password: password.value });
    } else {
      await (mode === "verify" ? accounts.verify : accounts.reset)({
        token,
        password: password.value,
      });
      token = "";
    }
    password.value = "";
    await signedIn();
  });
};
async function initialize() {
  actions.replaceChildren();
  try {
    const catalog = await progression.catalog();
    if (!catalog.email_accounts) {
      status.textContent = fa.AccountsAreDisabledOnThisServer;
      return;
    }
    if (mode === "verify" || mode === "reset") {
      edit(mode);
      return;
    }
    try {
      await signedIn();
    } catch (err) {
      if (!(err instanceof ApiFailure && err.status === 401)) throw err;
      rememberAccount(null);
      edit("login");
    }
  } catch (err) {
    status.textContent = message(err);
    button(fa.Retry, () => void initialize());
  }
}
window.addEventListener("hashchange", () => {
  readLink();
  void initialize();
});
void initialize();
