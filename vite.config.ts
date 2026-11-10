import {execFileSync} from 'node:child_process';
import {defineConfig} from 'vite';

// Development, preview and GitHub Pages all use the exact project subpath.
export default defineConfig({
  base: '/Space-bar-rpg/',
  define:{__BUILD_ID__:JSON.stringify(execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim())},
  server:{headers:{'Cache-Control':'no-store'}},
  preview:{headers:{'Cache-Control':'no-store'}},
  build: {
    target: 'safari15.4',
    rollupOptions: {output: {manualChunks: {three: ['three']}}},
  },
});
