// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
    // Railway отдаёт сайт через `astro preview`, а Vite по умолчанию режет
    // запросы с чужого Host: без этого домен *.up.railway.app даёт
    // «Blocked request. This host is not allowed».
    server: { allowedHosts: true },
    preview: { allowedHosts: true },
  },
});
