import {defineConfig} from 'vite';

// Development, preview and GitHub Pages all use the exact project subpath.
export default defineConfig({
  base: '/Space-bar-rpg/',
  build: {
    target: 'safari15.4',
    rollupOptions: {output: {manualChunks: {three: ['three']}}},
  },
});
