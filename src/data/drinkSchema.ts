import { DEFAULT_MIXING, type MixingConfig } from '../logic/harmony'
export const ICON_SHAPES = ['cup', 'glass', 'tall-glass', 'can', 'bottle', 'carton'] as const
export type IconShape = (typeof ICON_SHAPES)[number]

export const GARNISHES = ['none', 'ice', 'orange', 'lemon', 'apple', 'grape', 'peach'] as const
export type Garnish = (typeof GARNISHES)[number]

export interface Drink {
  id: string
  name: string
  /** 이름 짓기에 쓰는 짧은 별명 (없으면 name 에서 " 주스" 를 뗀 것) */
  nickname?: string
  icon: IconShape
  color: string
  liquid: string
  label?: string
  garnish: Garnish
  /** drink-images 폴더 안의 사진 파일 이름 (예: pocari.png) */
  image?: string
  /** 빌드에 포함된 사진 주소 (drinks.ts 에서 채움) */
  imageUrl?: string
  description?: string
  /** 맛 프로필 (0~1) — 궁합 임베딩의 재료 */
  flavor?: Record<string, number>
  containsCaffeine: boolean
  containsMilk: boolean
}

export class DrinkConfigError extends Error {
  readonly problems: string[]
  constructor(problems: string[]) {
    super(`drinks.yaml 설정 오류:\n- ${problems.join('\n- ')}`)
    this.name = 'DrinkConfigError'
    this.problems = problems
  }
}

const HEX = /^#[0-9a-fA-F]{6}$/
const ID = /^[a-z0-9][a-z0-9-]*$/

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * drinks.yaml 내용을 검사하고 Drink 배열로 변환한다.
 * 문제가 하나라도 있으면 어떤 항목이 잘못됐는지 모아서 DrinkConfigError 를 던진다.
 */
export function parseDrinks(raw: unknown): Drink[] {
  const problems: string[] = []
  const list = isRecord(raw) ? raw.drinks : raw
  if (!Array.isArray(list)) {
    throw new DrinkConfigError(['최상위에 "drinks:" 목록이 필요합니다.'])
  }

  const seen = new Set<string>()
  const drinks: Drink[] = []

  list.forEach((item, i) => {
    const where = `${i + 1}번째 음료`
    if (!isRecord(item)) {
      problems.push(`${where}: 항목 형식이 올바르지 않습니다.`)
      return
    }
    const label = typeof item.name === 'string' ? `${where}(${item.name})` : where
    const errs: string[] = []

    const id = item.id
    if (typeof id !== 'string' || !ID.test(id)) errs.push('id 는 영문 소문자/숫자/하이픈으로 적어 주세요.')
    else if (seen.has(id)) errs.push(`id "${id}" 가 중복됩니다.`)

    if (typeof item.name !== 'string' || item.name.trim() === '') errs.push('name 이 비어 있습니다.')
    if (typeof item.icon !== 'string' || !(ICON_SHAPES as readonly string[]).includes(item.icon))
      errs.push(`icon 은 ${ICON_SHAPES.join(' | ')} 중 하나여야 합니다.`)
    if (typeof item.color !== 'string' || !HEX.test(item.color)) errs.push('color 는 "#RRGGBB" 형식이어야 합니다.')
    if (item.liquid !== undefined && (typeof item.liquid !== 'string' || !HEX.test(item.liquid)))
      errs.push('liquid 는 "#RRGGBB" 형식이어야 합니다.')
    if (item.garnish !== undefined && !(GARNISHES as readonly string[]).includes(String(item.garnish)))
      errs.push(`garnish 는 ${GARNISHES.join(' | ')} 중 하나여야 합니다.`)
    if (item.image !== undefined && (typeof item.image !== "string" || item.image.trim() === "" || /[\\/]/.test(item.image)))
      errs.push("image 는 drink-images 폴더 안의 파일 이름만 적어 주세요 (예: pocari.png).")
    if (item.nickname !== undefined && (typeof item.nickname !== "string" || item.nickname.trim() === ""))
      errs.push("nickname 은 짧은 글자여야 합니다.")
    if (item.label !== undefined && typeof item.label !== 'string' && typeof item.label !== 'number')
      errs.push('label 은 짧은 글자여야 합니다.')
    for (const key of ['containsCaffeine', 'containsMilk', 'hidden'] as const) {
      if (item[key] !== undefined && typeof item[key] !== 'boolean') errs.push(`${key} 는 true 또는 false 여야 합니다.`)
    }
    let flavor: Record<string, number> | undefined
    if (item.flavor !== undefined) {
      if (!isRecord(item.flavor)) errs.push('flavor 는 { 맛이름: 숫자 } 형식이어야 합니다. 예) { sweet: 0.8, fizzy: 1 }')
      else {
        flavor = {}
        for (const [k, v] of Object.entries(item.flavor)) {
          if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1)
            errs.push(`flavor.${k} 는 0~1 사이 숫자여야 합니다.`)
          else flavor[k] = v
        }
      }
    }

    if (errs.length) {
      errs.forEach((e) => problems.push(`${label}: ${e}`))
      return
    }
    seen.add(id as string)
    if (item.hidden === true) return

    drinks.push({
      id: id as string,
      name: (item.name as string).trim(),
      nickname: typeof item.nickname === "string" ? item.nickname.trim() : undefined,
      icon: item.icon as IconShape,
      color: item.color as string,
      liquid: (item.liquid as string | undefined) ?? (item.color as string),
      label: item.label === undefined ? undefined : String(item.label),
      garnish: (item.garnish as Garnish | undefined) ?? 'none',
      description: typeof item.description === 'string' ? item.description : undefined,
      image: typeof item.image === "string" ? item.image.trim() : undefined,
      flavor,
      containsCaffeine: item.containsCaffeine === true,
      containsMilk: item.containsMilk === true,
    })
  })

  if (problems.length) throw new DrinkConfigError(problems)
  if (drinks.length < 2) throw new DrinkConfigError(['음료가 최소 2개는 있어야 레시피를 만들 수 있습니다.'])
  return drinks
}

/** drinks.yaml 의 mixing: 섹션 (없으면 기본값) */
export function parseMixing(raw: unknown): MixingConfig {
  const m = isRecord(raw) ? raw.mixing : undefined
  if (m === undefined || m === null) return { ...DEFAULT_MIXING }
  if (!isRecord(m)) throw new DrinkConfigError(['mixing 은 { mode, harmony, surprise } 형식이어야 합니다.'])
  const problems: string[] = []
  const out: MixingConfig = { ...DEFAULT_MIXING }
  if (m.mode !== undefined) {
    if (m.mode !== 'random' && m.mode !== 'harmony') problems.push('mixing.mode 는 random 또는 harmony 여야 합니다.')
    else out.mode = m.mode
  }
  const num = (key: 'harmony' | 'surprise' | 'surpriseNoise', min: number, max: number) => {
    const v = m[key]
    if (v === undefined) return
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max)
      problems.push(`mixing.${key} 는 ${min}~${max} 사이 숫자여야 합니다.`)
    else out[key] = v
  }
  num('harmony', 0, 20)
  num('surprise', 0, 1)
  num('surpriseNoise', 0, 5)
  if (problems.length) throw new DrinkConfigError(problems)
  return out
}
