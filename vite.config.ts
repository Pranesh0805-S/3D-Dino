import { defineConfig, type Plugin } from 'vite';

// Portal build (CrazyGames): relative paths, no SEO head, no public files. Run `npm run build:portal`.
const portalHtml = (): Plugin => ({
  name: 'portal-html',
  transformIndexHtml(html) {
    return html
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/, '')
      .replace(
        /^[ \t]*<(meta (property="og:|name="twitter:|name="google-site-verification|name="robots)|link rel="(canonical|icon))[^>]*>\r?\n/gm,
        '',
      );
  },
});

export default defineConfig(({ mode }) => {
  const portal = mode === 'portal';
  return {
    base: portal ? './' : '/',
    publicDir: portal ? false : 'public',
    plugins: portal ? [portalHtml()] : [],
    build: { chunkSizeWarningLimit: 900, outDir: portal ? 'dist-portal' : 'dist' },
  };
});
