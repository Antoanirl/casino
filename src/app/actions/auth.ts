"use server";

import { redirect } from "next/navigation";
import {
  loginSchema,
  registerSchema,
  toFieldErrors,
  type FieldErrors,
} from "@/lib/validation/auth";
import { AccountTakenError, authenticateUser, registerUser } from "@/server/auth/accounts";
import { signIn, signOut } from "@/server/auth/current-user";
import { getDb } from "@/server/db";
import { consumeRateLimit, describeWait, rateLimits } from "@/server/rate-limit";
import { clientIp } from "@/server/request";

/**
 * Server actions for the auth forms. Next.js checks that these are only called
 * from this site's own pages (Origin check), and every input is re-validated
 * here: the browser-side checks are only a convenience. Sign-ins and sign-ups are rate limited
 * per IP address (and sign-ins per account too) to slow down password guessing and mass sign-ups.
 */

export interface AuthFormState {
  errors?: FieldErrors;
  /** Echoed back so the form keeps what the user typed (never the password). */
  values?: { email?: string; username?: string };
}

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const raw = {
    email: readField(formData, "email"),
    username: readField(formData, "username"),
    password: readField(formData, "password"),
  };
  const values = { email: raw.email, username: raw.username };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { errors: toFieldErrors(parsed.error), values };

  // Only well-formed attempts count, so fixing a typo doesn't use up the allowance.
  const limit = await consumeRateLimit(getDb(), rateLimits.registerByIp, await clientIp());
  if (!limit.allowed) {
    return {
      errors: {
        form: `Too many new accounts from this connection. Try again ${describeWait(limit.retryAfterSeconds)}.`,
      },
      values,
    };
  }

  try {
    const user = await registerUser(getDb(), parsed.data);
    await signIn(user.id);
  } catch (error) {
    if (error instanceof AccountTakenError) {
      return { errors: { [error.field]: error.message }, values };
    }
    console.error("Registration failed", error);
    return { errors: { form: "Something went wrong. Please try again." }, values };
  }

  // redirect() works by throwing, so it must stay outside the try/catch above.
  redirect("/");
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const raw = { email: readField(formData, "email"), password: readField(formData, "password") };
  const values = { email: raw.email };
  const invalid = { errors: { form: "Invalid email or password" }, values };
  const tooMany = (seconds: number) => ({
    errors: { form: `Too many sign-in attempts. Try again ${describeWait(seconds)}.` },
    values,
  });

  const byIp = await consumeRateLimit(getDb(), rateLimits.loginByIp, await clientIp());
  if (!byIp.allowed) return tooMany(byIp.retryAfterSeconds);

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = toFieldErrors(parsed.error);
    // Only reveal "fix your input" errors, never anything about whether the account exists.
    return errors.email ? { errors: { email: errors.email }, values } : invalid;
  }

  // Counted per account as well, so guesses spread across many addresses still hit a wall.
  // The same message either way, so it doesn't reveal whether the account exists.
  const byEmail = await consumeRateLimit(getDb(), rateLimits.loginByEmail, parsed.data.email);
  if (!byEmail.allowed) return tooMany(byEmail.retryAfterSeconds);

  try {
    const user = await authenticateUser(getDb(), parsed.data);
    if (!user) return invalid;
    await signIn(user.id);
  } catch (error) {
    console.error("Login failed", error);
    return { errors: { form: "Something went wrong. Please try again." }, values };
  }

  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect("/");
}
