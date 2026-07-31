const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function ShieldIcon({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function QrIcon({ className }) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="14.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="3.5" y="14.5" width="6" height="6" rx="1" />
      <path d="M14.5 15h2.5v2.5M20.5 14.5v2M17.5 20.5h3M14.5 20.5h.01" />
    </svg>
  );
}

export function UserIcon({ className }) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c1.2-3.5 4-5 6.5-5s5.3 1.5 6.5 5" />
    </svg>
  );
}

export function ChatIcon({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M4 5.5h16v10H9l-4 3.5v-3.5H4v-10z" />
    </svg>
  );
}

export function CameraIcon({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8z" />
      <circle cx="12" cy="13.5" r="3.2" />
    </svg>
  );
}

export function BoltIcon({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M12.5 3L5 13.5h5.5L11 21l7.5-10.5H13L12.5 3z" />
    </svg>
  );
}

export function LayersIcon({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z" />
      <path d="M4 12l8 4.5 8-4.5" />
      <path d="M4 16.5L12 21l8-4.5" />
    </svg>
  );
}

export function TagIcon({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M11.5 3.5H5a1.5 1.5 0 00-1.5 1.5v6.5l10.5 10.5a1.5 1.5 0 002 0l6-6a1.5 1.5 0 000-2L11.5 3.5z" />
      <circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
