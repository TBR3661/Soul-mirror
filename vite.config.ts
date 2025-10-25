import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Replace REPO_NAME with your GitHub repository name before deploying
export default defineConfig({
  plugins: [react()],
  base: '/Soul-mirror/'
});
