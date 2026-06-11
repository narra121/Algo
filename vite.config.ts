import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Served from https://narra121.github.io/Algo/
  base: '/Algo/',
  plugins: [react()],
})
