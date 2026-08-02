/**
 * "Remember me" storage for the login screen.
 *
 * SECURITY, stated plainly: this keeps the password in localStorage in clear
 * text. Anyone with access to the machine's browser profile can read it, and so
 * can any script that manages to run on the page. It is a counter-machine
 * convenience, not a secure credential store - do not switch it on for an
 * account that matters on a shared or public computer.
 *
 * There is no encryption here on purpose. Anything the browser can decrypt
 * without a secret the user supplies, an attacker with the same file can
 * decrypt too; scrambling it would only make it LOOK protected, which is worse
 * than being honest about what it is.
 *
 * The login inputs also carry the standard autocomplete attributes, so the
 * browser's own password manager - which does have OS-level protection - keeps
 * working for anyone who would rather use that instead.
 */

const STORAGE_KEY = "agrierp.remembered-login";

export interface RememberedLogin {
  userName: string;
  password: string;
}

/** localStorage throws in private mode and when storage is disabled entirely. */
function safely<T>(action: () => T, fallback: T): T {
  try {
    return action();
  } catch {
    return fallback;
  }
}

export function readRememberedLogin(): RememberedLogin | null {
  if (typeof window === "undefined") return null;

  return safely(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<RememberedLogin>;
    // A half-written record is treated as no record rather than prefilling a
    // username with an empty password, which just looks broken.
    if (typeof parsed.userName !== "string" || typeof parsed.password !== "string") {
      return null;
    }
    return { userName: parsed.userName, password: parsed.password };
  }, null);
}

export function saveRememberedLogin(value: RememberedLogin): void {
  if (typeof window === "undefined") return;
  safely(() => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)), undefined);
}

export function clearRememberedLogin(): void {
  if (typeof window === "undefined") return;
  safely(() => window.localStorage.removeItem(STORAGE_KEY), undefined);
}
