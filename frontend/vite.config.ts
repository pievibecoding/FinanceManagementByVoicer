import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

export default defineConfig(({ mode }) => {
  // vitest test configuration (only active during test runs)
  const testConfig = {
    test: {
      environment: 'node',
      include: ['__tests__/**/*.test.ts'],
    },
  } as any;
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // Forward /api/* HTTP requests to Flask backend.
          // The bypass function prevents proxying Vite module requests (e.g. /api/auth.ts).
          '/api': {
            target: env.FLASK_BACKEND_URL || env.VITE_FLASK_BACKEND_URL || 'http://localhost:5000',
            changeOrigin: true,
            bypass(req) {
              // If the URL ends with a source file extension, let Vite serve it as a module.
              if (req.url && /\.(ts|tsx|js|jsx|json|css|svg|png)(\?.*)?$/.test(req.url)) {
                return req.url;
              }
              return null; // null = proxy as normal
            },
          },
        },
      },
      plugins: [
        tanstackRouter({
          target: 'react',
          autoCodeSplitting: false,
          routesDirectory: './src/routes',
          generatedRouteTree: './src/routeTree.gen.ts',
        }),
        react(),
        tailwindcss()
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      ...testConfig,
    };
});
