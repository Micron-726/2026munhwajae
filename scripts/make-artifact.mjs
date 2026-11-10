// dist/index.html(단일 파일 빌드)을 claude.ai 아티팩트용 HTML 로 바꾼다.
// 아티팩트는 <!doctype>/<html>/<head>/<body> 를 자동으로 감싸므로 그 태그만 벗겨 낸다.
// 사용법: npm run build && node scripts/make-artifact.mjs [출력 경로]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const src = readFileSync('dist/index.html', 'utf8')
const out = resolve(process.argv[2] ?? 'artifact/claude-chef.html')

const head = src.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? ''
const body = src.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? ''
if (!head || !body.includes('id="root"')) throw new Error('dist/index.html 형식이 예상과 다릅니다. 먼저 npm run build 를 실행하세요.')

// 아티팩트 쪽 skeleton 이 charset/viewport 를 넣어 주므로 중복 meta 는 뺀다. <title> 은 맨 앞(8KB 안)에 둔다.
const title = head.match(/<title>[\s\S]*?<\/title>/i)?.[0] ?? '<title>Claude Chef\'s Mystery Kitchen</title>'
const rest = head
  .replace(/<title>[\s\S]*?<\/title>/i, '')
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .trim()

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, `${title}\n${rest}\n${body.trim()}\n`)
console.log(`아티팩트 HTML 생성: ${out} (${(Buffer.byteLength(readFileSync(out)) / 1024 / 1024).toFixed(2)} MB)`)
