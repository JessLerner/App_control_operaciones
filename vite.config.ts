import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

  return {
    base: isGitHubPages ? '/App_control_operaciones/' : '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        manifest: {
          id: '/',
          name: 'Parte Diario de Ventas',
          short_name: 'ParteVentas',
          description: 'PWA y Web App para el registro diario de ventas de planes de ahorro',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: isGitHubPages ? '/App_control_operaciones/' : '/',
          scope: isGitHubPages ? '/App_control_operaciones/' : '/',
          icons: [
            {
              src: '/icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
