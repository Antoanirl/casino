"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/app/actions/auth";
import { buttonClass } from "@/components/ui/button";

type Action = (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;

interface AuthFormProps {
  mode: "login" | "register";
  action: Action;
}

const inputClass =
  "w-full rounded-md border border-rule bg-sheet px-3 py-2.5 text-ink placeholder:text-ink-soft/60 focus:border-ink aria-[invalid=true]:border-stamp";

function Field({
  name,
  label,
  type,
  autoComplete,
  defaultValue,
  error,
  hint,
}: {
  name: string;
  label: string;
  type: string;
  autoComplete: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
}) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={inputClass}
      />
      {error ? (
        <p id={`${name}-error`} className="text-stamp text-sm">
          {error}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="text-ink-soft text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.errors ?? {};
  const isRegister = mode === "register";

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {errors.form ? (
        <p
          role="alert"
          className="border-stamp/40 bg-stamp/5 text-stamp rounded-md border px-3 py-2 text-sm"
        >
          {errors.form}
        </p>
      ) : null}

      <Field
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        error={errors.email}
      />

      {isRegister ? (
        <Field
          name="username"
          label="Username"
          type="text"
          autoComplete="username"
          defaultValue={state.values?.username}
          error={errors.username}
          hint="3–20 characters: letters, numbers and underscores."
        />
      ) : null}

      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete={isRegister ? "new-password" : "current-password"}
        error={errors.password}
        hint={isRegister ? "At least 8 characters." : undefined}
      />

      <button
        type="submit"
        disabled={pending}
        className={buttonClass("primary", "w-full disabled:cursor-wait")}
      >
        {pending ? "Please wait…" : isRegister ? "Create account" : "Log in"}
      </button>

      <p className="text-ink-soft text-center text-sm">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-ink underline underline-offset-2">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/register" className="text-ink underline underline-offset-2">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
