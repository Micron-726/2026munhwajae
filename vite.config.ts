/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { parse } from 'yaml'

/** drinks.yaml 같은 YAML 파일을 import 하면 JS 객체로 변환해 주는 작은 플러그인 */
function yamlPlugin(): Plugin {
  return {
    name: 'local-yaml',
    transform(code, id) {
      if (!/\.ya?ml$/.test(id)) return null
      const data = parse(code)
      return { code: `export default ${JSON.stringify(data)};`, map: null }
    },
  }
}

export default defineConfig({
  // 상대 경로로 빌드해서 dist/index.html 을 더블클릭해도 열리도록 한다.
  base: './',
  plugins: [yamlPlugin(), react(), tailwindcss(), viteSingleFile()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // 수천~수만 번 뽑는 통계 테스트가 있어서 여유 있게
    testTimeout: 30000,
    css: false,
  },
})
