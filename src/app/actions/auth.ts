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

/**
 * Server actions for the auth forms. Next.js checks that these are only called
 * from this site's own pages (Origin check), and every input is re-validated
 * here: the browser-side checks are only a convenience.
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

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = toFieldErrors(parsed.error);
    // Only reveal "fix your input" errors, never anything about whether the account exists.
    return errors.email ? { errors: { email: errors.email }, values } : invalid;
  }

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
