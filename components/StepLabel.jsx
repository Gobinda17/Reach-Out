export function StepLabel({ n, children }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-black">
        {n}
      </span>
      <span className="text-sm font-semibold text-slate-900 dark:text-white">{children}</span>
    </div>
  );
}
