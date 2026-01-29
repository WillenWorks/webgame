// nuxt.config.js
import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
    // @ts-ignore
    compatibilityDate: '2025-01-15',
    devtools: { enabled: true },
    modules: ['@nuxtjs/tailwindcss'],
    css: ['~/assets/css/main.css'],
    ssr: false,
    app: {
        pageTransition: { name: 'page', mode: 'out-in' },
        head: {
            title: 'Operação Mundo',
            link: [
                { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
                { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Share+Tech+Mono&family=VT323&display=swap' }
            ]
        }
    },
    runtimeConfig: {
        public: {
            apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3333/api/v1'
        }
    }
});
