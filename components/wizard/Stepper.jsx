"use client";

// The numbered progress rail shared by the free-eTag and paid-tag wizards, so
// both flows read identically. `steps` is a list of short labels; `current` is
// the zero-based index of the step being shown.
export function Stepper({ steps, current }) {
  return (
    <ol className="flex items-start justify-between gap-1">
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={label} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full items-center gap-1">
              {i > 0 && (
                <span
                  aria-hidden
                  className={`h-0.5 flex-1 ${
                    i <= current ? "bg-yellow-400" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              )}
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  state === "todo"
                    ? "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    : "bg-yellow-400 text-black"
                } ${state === "current" ? "ring-2 ring-black ring-offset-2 dark:ring-white" : ""}`}
              >
                {i + 1}
              </span>
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={`h-0.5 flex-1 ${
                    i < current ? "bg-yellow-400" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              )}
            </div>
            <span
              className={`text-xs ${
                state === "current"
                  ? "font-semibold text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
