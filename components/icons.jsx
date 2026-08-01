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

export function PhoneIcon({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M5 4.5h3.5l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5V18a1.5 1.5 0 01-1.6 1.5A15.5 15.5 0 013.5 6.1 1.5 1.5 0 015 4.5z" />
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

// Brand mark: a tag with two broadcast arcs — "your tag, reachable".
// Draw on a solid box; the punch-hole should match the box's background color.
export function ReachIcon({ className, holeClassName = "fill-black" }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        d="M11.3 3.4H5.6a2 2 0 00-2 2v5.7c0 .4.16.78.44 1.06l9.6 9.6a1.7 1.7 0 002.4 0l5.66-5.66a1.7 1.7 0 000-2.4l-9.6-9.6a1.5 1.5 0 00-1.06-.44z"
        fill="currentColor"
      />
      <circle cx="8.2" cy="8.2" r="1.5" className={holeClassName} />
      <path
        d="M15.3 3.9c1.9.4 3.5 2 3.9 3.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M16.9 1.4c2.9.6 5.2 2.9 5.8 5.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// Simple generic car-side-view glyph, used for the vehicle-tag motif.
export function CarIcon({ className }) {
  return (
    <svg viewBox="0 0 48 24" className={className} fill="none">
      <path
        d="M2 17.5h2M44 17.5h1.5a1.5 1.5 0 001.5-1.5v-2.3a2 2 0 00-.7-1.52l-5.6-4.8A4 4 0 0030.5 6h-15a4 4 0 00-2.98 1.33L8.6 11.5H4a2 2 0 00-2 2v2.5a2 2 0 002 2h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 11.5h30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy="17.5" r="3" fill="currentColor" />
      <circle cx="35" cy="17.5" r="3" fill="currentColor" />
    </svg>
  );
}
