/**
 * 음료 조합 이름 짓기 (오프라인)
 *
 * 레시피의 특징을 뽑아서 names.yaml 의 템플릿 빈칸을 채운다.
 *   - 대표 맛: mL 가중 평균 맛 벡터에서 "평균보다 유난히 강한" 축 (중심화된 flavor)
 *       1순위 축 → {adj}, {place} / 2순위 축 → {suffix}
 *   - 조합 분위기: 맛 임베딩의 평균 쌍별 유사도가 높으면 harmony, 낮으면 chaos → {mood}, 한마디
 *   - {main}: 가장 많이 들어간 음료, {surprise}: ⚡서프라이즈 재료
 * 같은 레시피에는 항상 같은 이름이 나오도록 레시피 id 로 시드를 고정한다.
 */
import { cosine, type Embeddings } from './harmony'
import { pickOne, seededRng, type Rng } from './random'
import type { Recipe } from './recipeGenerator'

export const FLAVOR_KEYS = ['sweet', 'sour', 'fizzy', 'creamy', 'bitter', 'fruity', 'salty', 'light', 'default'] as const

export interface NameBook {
  templates: { normal: string[]; surprise: string[] }
  adjectives: Record<string, string[]>
  places: Record<string, string[]>
  suffixes: Record<string, string[]>
  moods: { harmony: string[]; chaos: string[] }
  taglines: { harmony: string[]; chaos: string[]; surprise: string[] }
}

export interface DrinkName {
  name: string
  tagline: string
  /** 디버그/테스트용: 어떤 특징으로 지었는지 */
  traits: { topFlavor: string; secondFlavor: string; harmony: number; vibe: 'harmony' | 'chaos'; surprise: boolean }
}

export interface NamingDrink {
  id: string
  name: string
  nickname?: string
  flavor?: Readonly<Record<string, number>>
}

const PLACEHOLDERS = ['adj', 'place', 'suffix', 'mood', 'main', 'surprise', 'mix', 'no'] as const
/** 이 이상 유사하면 "잘 어울리는 조합" */
export const HARMONY_THRESHOLD = 0.2
const MAX_NAME_LENGTH = 18

// ─────────────────────────── 조사 ───────────────────────────

function hasBatchim(ch: string): { has: boolean; rieul: boolean } | null {
  const code = ch.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28
    return { has: jong !== 0, rieul: jong === 8 }
  }
  if (/[0-9]/.test(ch)) return { has: '013678'.includes(ch), rieul: '178'.includes(ch) }
  if (/[a-zA-Z]/.test(ch)) return { has: /[lmnrkpt]/i.test(ch), rieul: /[lr]/i.test(ch) }
  return null
}

const JOSA: Record<string, [string, string]> = {
  '이/가': ['이', '가'],
  '을/를': ['을', '를'],
  '은/는': ['은', '는'],
  '와/과': ['과', '와'],
  '과/와': ['과', '와'],
  '으로/로': ['으로', '로'],
}

/** "{이/가}" 같은 조사 표시를 바로 앞 글자의 받침에 맞게 바꾼다. */
export function applyJosa(text: string): string {
  return text.replace(/(.?)\{(이\/가|을\/를|은\/는|와\/과|과\/와|으로\/로)\}/g, (_, prev: string, key: string) => {
    const [withB, withoutB] = JOSA[key]
    const b = prev ? hasBatchim(prev) : null
    if (!b) return prev + withoutB
    if (key === '으로/로') return prev + (b.has && !b.rieul ? withB : withoutB)
    return prev + (b.has ? withB : withoutB)
  })
}

// ─────────────────────────── names.yaml 검사 ───────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function stringList(v: unknown, where: string, problems: string[], required = true): string[] {
  if (v === undefined && !required) return []
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || x.trim() === '')) {
    problems.push(`${where} 는 글자 목록이어야 합니다.`)
    return []
  }
  if (required && v.length === 0) problems.push(`${where} 에 최소 1개가 필요합니다.`)
  return v.map((x: string) => x.trim())
}

function flavorTable(v: unknown, where: string, problems: string[]): Record<string, string[]> {
  if (!isRecord(v)) {
    problems.push(`${where} 는 맛별 목록이어야 합니다.`)
    return { default: ['수상한'] }
  }
  const out: Record<string, string[]> = {}
  for (const [k, list] of Object.entries(v)) out[k] = stringList(list, `${where}.${k}`, problems)
  if (!out.default?.length) problems.push(`${where}.default 목록이 필요합니다.`)
  return out
}

function checkPlaceholders(t: string, where: string, problems: string[], allowSurprise: boolean) {
  for (const m of t.matchAll(/\{([^}]+)\}/g)) {
    const key = m[1]
    if (key in JOSA) continue
    if (!(PLACEHOLDERS as readonly string[]).includes(key)) problems.push(`${where}: 모르는 빈칸 {${key}}`)
    else if (key === 'surprise' && !allowSurprise) problems.push(`${where}: {surprise} 는 surprise 템플릿에서만 쓸 수 있어요.`)
  }
}

export class NameBookError extends Error {
  constructor(readonly problems: string[]) {
    super(`names.yaml 설정 오류:\n- ${problems.join('\n- ')}`)
  }
}

export function parseNameBook(raw: unknown): NameBook {
  const problems: string[] = []
  if (!isRecord(raw)) throw new NameBookError(['names.yaml 형식이 올바르지 않습니다.'])
  const t = isRecord(raw.templates) ? raw.templates : {}
  const normal = stringList(t.normal, 'templates.normal', problems)
  const surprise = stringList(t.surprise, 'templates.surprise', problems)
  normal.forEach((x, i) => checkPlaceholders(x, `templates.normal ${i + 1}번째`, problems, false))
  surprise.forEach((x, i) => checkPlaceholders(x, `templates.surprise ${i + 1}번째`, problems, true))
  const moods = isRecord(raw.moods) ? raw.moods : {}
  const tl = isRecord(raw.taglines) ? raw.taglines : {}
  const book: NameBook = {
    templates: { normal, surprise },
    adjectives: flavorTable(raw.adjectives, 'adjectives', problems),
    places: flavorTable(raw.places, 'places', problems),
    suffixes: flavorTable(raw.suffixes, 'suffixes', problems),
    moods: { harmony: stringList(moods.harmony, 'moods.harmony', problems), chaos: stringList(moods.chaos, 'moods.chaos', problems) },
    taglines: {
      harmony: stringList(tl.harmony, 'taglines.harmony', problems),
      chaos: stringList(tl.chaos, 'taglines.chaos', problems),
      surprise: stringList(tl.surprise, 'taglines.surprise', problems),
    },
  }
  book.taglines.surprise.forEach((x, i) => checkPlaceholders(x, `taglines.surprise ${i + 1}번째`, problems, true))
  if (problems.length) throw new NameBookError(problems)
  return book
}

// ─────────────────────────── 이름 짓기 ───────────────────────────

export function nicknameOf(d: NamingDrink | undefined): string {
  if (!d) return '???'
  if (d.nickname) return d.nickname
  return d.name.replace(/\s*주스$/, '').trim() || d.name
}

function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mL 가중 평균 맛에서, 전체 음료 평균보다 두드러지는 축 순위 */
export function rankFlavors(recipe: Recipe, drinks: ReadonlyMap<string, NamingDrink>): string[] {
  const all = [...drinks.values()]
  const axes = Array.from(new Set(all.flatMap((d) => Object.keys(d.flavor ?? {}))))
  if (axes.length === 0) return ['default', 'default']
  const mean = Object.fromEntries(axes.map((a) => [a, all.reduce((s, d) => s + (d.flavor?.[a] ?? 0), 0) / all.length]))
  const total = recipe.items.reduce((s, it) => s + it.ml, 0)
  const score = axes.map((a) => ({
    a,
    v: recipe.items.reduce((s, it) => s + (it.ml / total) * ((drinks.get(it.drinkId)?.flavor?.[a] ?? 0) - mean[a]), 0),
  }))
  score.sort((x, y) => y.v - x.v)
  return score.map((s) => s.a)
}

function fromTable(table: Record<string, string[]>, key: string, rng: Rng): string {
  const own = table[key]
  // 맛 전용 단어와 기본 단어를 섞어서 다양하게
  const pool = own?.length ? (rng() < 0.7 ? own : [...own, ...table.default]) : table.default
  return pickOne(pool, rng)
}

export function nameDrink(
  recipe: Recipe,
  ctx: { drinks: ReadonlyMap<string, NamingDrink>; embeddings: Embeddings; book: NameBook },
): DrinkName {
  const { drinks, embeddings, book } = ctx
  const rng = seededRng(hashString(recipe.id))
  const byMl = [...recipe.items].sort((a, b) => b.ml - a.ml)
  const surpriseItem = recipe.items.find((it) => it.surprise)
  const core = recipe.items.filter((it) => !it.surprise).map((it) => it.drinkId)

  const ranked = rankFlavors(recipe, drinks)
  const topFlavor = ranked[0] ?? 'default'
  const secondFlavor = ranked[1] ?? topFlavor

  let simSum = 0
  let pairs = 0
  for (let i = 0; i < core.length; i++)
    for (let j = i + 1; j < core.length; j++) {
      simSum += cosine(embeddings.get(core[i]), embeddings.get(core[j]))
      pairs++
    }
  const harmony = pairs ? simSum / pairs : 0
  const vibe: 'harmony' | 'chaos' = harmony >= HARMONY_THRESHOLD ? 'harmony' : 'chaos'

  const main = nicknameOf(drinks.get((byMl.find((it) => !it.surprise) ?? byMl[0]).drinkId))
  const surprise = surpriseItem ? nicknameOf(drinks.get(surpriseItem.drinkId)) : ''
  const mix = byMl
    .slice(0, 3)
    .map((it) => nicknameOf(drinks.get(it.drinkId)).replace(/\s/g, '')[0] ?? '')
    .join('')

  const fill = (template: string) =>
    applyJosa(
      template.replace(/\{(adj|place|suffix|mood|main|surprise|mix|no)\}/g, (_, key: string) => {
        switch (key) {
          case 'adj':
            return fromTable(book.adjectives, topFlavor, rng)
          case 'place':
            return fromTable(book.places, topFlavor, rng)
          case 'suffix':
            return fromTable(book.suffixes, secondFlavor, rng)
          case 'mood':
            return pickOne(book.moods[vibe], rng)
          case 'main':
            return main
          case 'surprise':
            return surprise
          case 'mix':
            return mix
          case 'no':
            return String(1 + Math.floor(rng() * 99))
          default:
            return ''
        }
      }),
    )

  const templates = surpriseItem && book.templates.surprise.length ? book.templates.surprise : book.templates.normal
  let name = ''
  for (let attempt = 0; attempt < 8; attempt++) {
    name = fill(pickOne(templates, rng)).replace(/\s+/g, ' ').trim()
    if (name.length <= MAX_NAME_LENGTH) break
  }

  const tagPool = surpriseItem ? book.taglines.surprise : book.taglines[vibe]
  const tagline = fill(pickOne(tagPool, rng))

  return { name, tagline, traits: { topFlavor, secondFlavor, harmony, vibe, surprise: !!surpriseItem } }
}
