import { ReachIcon } from "./icons";

const SIZES = {
  sm: { box: "h-7 w-7 rounded-lg", icon: "h-4 w-4", text: "text-base" },
  md: { box: "h-8 w-8 rounded-xl", icon: "h-4.5 w-4.5", text: "text-lg" },
  lg: { box: "h-12 w-12 rounded-2xl", icon: "h-6 w-6", text: "text-2xl" },
};

export function Logo({ size = "md", showText = true, className = "", theme = "auto" }) {
  const s = SIZES[size] ?? SIZES.md;
  // "light" locks the wordmark to dark-on-white text, for use on fixed
  // white/yellow surfaces (e.g. the sticker mockup) that don't follow the
  // site's dark mode — "auto" adapts with the page like everywhere else.
  const textClass =
    theme === "light" ? "text-slate-900" : "text-slate-900 dark:text-white";
  const accentClass = theme === "light" ? "text-yellow-500" : "text-yellow-500 dark:text-yellow-400";

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`flex shrink-0 items-center justify-center bg-black text-yellow-400 shadow-sm shadow-black/30 ${s.box}`}
      >
        <ReachIcon className={s.icon} />
      </span>
      {showText && (
        <span className={`font-semibold tracking-tight ${textClass} ${s.text}`}>
          Reach<span className={accentClass}>-Out</span>
        </span>
      )}
    </span>
  );
}
