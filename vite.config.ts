import {defineConfig} from 'vite';

// GitHub project Pages is served below the repository name, including its case.
// Keep development, preview, local builds and Actions on the same URLs.
export default defineConfig({
  base: '/Space-bar-rpg/',
  build: {target: 'safari15.4'},
});
