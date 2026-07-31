import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path matches the GitHub Pages project site: berasankhadeep20-lang.github.io/custodytrack/
export default defineConfig({
  plugins: [react()],
  base: '/custodytrack/',
})
