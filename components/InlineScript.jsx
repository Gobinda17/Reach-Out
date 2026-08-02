"use client";

// A raw inline <script> that the browser executes synchronously while parsing
// the HTML — before the first paint. `next/script` can't do this job: even with
// strategy="beforeInteractive" it queues the code through Next's own loader
// (self.__next_s), which only runs once the runtime boots, long after paint.
//
// React never executes scripts it renders on the client, and warns when it
// meets one ("Encountered a script tag while rendering React component"). So on
// the server this renders as real JavaScript, and on the client as inert
// text/plain; suppressHydrationWarning covers the resulting type mismatch.
//
// "use client" is what makes that split work, and it is not optional. As a
// Server Component this function only ever ran on the server, so `window` was
// always undefined and the type was always text/javascript — including in the
// RSC payload for a client-side navigation, where React then creates the node
// in the browser and warns. Being a Client Component means it re-runs in the
// browser on soft navigation and yields text/plain, which React treats as an
// inert data block and leaves alone.
export function InlineScript({ html }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
