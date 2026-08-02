// Shared by the admin and seller layouts (which render the pre-hydration
// bootstrap script) and DashboardShell.jsx (the toggle), so the two never drift
// out of sync. Both dashboards deliberately share one stored preference — it's
// the same person's eyes and the same stylesheet.
export const DASHBOARD_THEME_KEY = "reachOutAdminTheme";

// Applies the saved theme before the first paint, so a light-theme user never
// sees a flash of the dark shell on a fresh page load.
//
// Each layout renders this AFTER its <DashboardShell>: an inline script runs
// the moment the parser reaches it, so the .admin-app element must already
// exist above it in the HTML. (The root layout is the wrong home for it for
// exactly that reason — there the element doesn't exist yet.) On client-side
// navigation this script is inert; DashboardShell's own lazy state initializer
// covers that case.
export const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  DASHBOARD_THEME_KEY
)});var el=document.querySelector(".admin-app");if(el&&(t==="light"||t==="dark")){el.dataset.theme=t}}catch(e){}})()`;
