"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/app/actions/auth";

type Action = (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;

interface AuthFormProps {
  mode: "login" | "register";
  action: Action;
}

const inputClass =
  "w-full rounded border border-white/15 bg-felt-950 px-3 py-2 text-zinc-100 placeholder:text-zinc-500 focus:border-gold-500 focus:outline-none aria-[invalid=true]:border-red-400";

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
      <label htmlFor={name} className="block text-sm font-medium text-zinc-200">
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
        <p id={`${name}-error`} className="text-sm text-red-300">
          {error}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="text-xs text-zinc-400">
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
          className="rounded border border-red-400/40 bg-red-950/40 px-3 py-2 text-sm text-red-200"
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
        className="bg-gold-500 text-felt-950 hover:bg-gold-400 w-full rounded px-4 py-2 font-semibold disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Please wait…" : isRegister ? "Create account" : "Log in"}
      </button>

      <p className="text-center text-sm text-zinc-400">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-gold-400 hover:underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/register" className="text-gold-400 hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
