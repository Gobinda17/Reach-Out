import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 opacity-70 blur-3xl dark:from-indigo-950/40 dark:to-violet-950/30"
      />
      <div className="relative mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-16">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Log in
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            We&apos;ll text you a one-time code — no password needed.
          </p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
