// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: "2025-11-26",
  devtools: { enabled: true },
  css: ['@/assets/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
});
