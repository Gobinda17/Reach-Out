/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits .next/standalone — a self-contained server with only the traced
  // dependencies, so the Docker runtime stage needs no `npm install`.
  // See node_modules/next/dist/docs/.../next-config-js/output.md.
  output: "standalone",
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
