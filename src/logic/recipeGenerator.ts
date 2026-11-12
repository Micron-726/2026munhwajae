import { mlToFraction, TOTAL_ML, type Fraction } from './fractions'
import { getTemplates } from './ratioTemplates'
import { findForbidden, maxCompatibleCount, type ForbiddenPair } from './compat'
import { chooseDrinksHarmony, type Embeddings, type MixingConfig } from './harmony'
import { defaultRng, pickOne, randomInt, shuffle, type Rng } from './random'
import { validateSettings } from './settings'

export interface RecipeItem {
  drinkId: string
  ml: number
  fraction: Fraction
  /** 궁합 코어와 반대 맛으로 끼어든 서프라이즈 재료 */
  surprise: boolean
}

export interface Recipe {
  id: string
  createdAt: number
  count: number
  totalMl: number
  items: RecipeItem[]
  mode: 'random' | 'harmony'
}

export class RecipeError extends Error {}

/** 1단계: minCount~maxCount 사이에서 음료 개수 N 을 균등하게 고른다. */
export function chooseDrinkCount(minCount: number, maxCount: number, rng: Rng = defaultRng): number {
  return randomInt(minCount, maxCount, rng)
}

/** 2단계: 활성 음료에서 서로 다른 N 개를 균등하게 고른다 (Fisher–Yates). */
export function chooseDrinks(enabledIds: readonly string[], count: number, rng: Rng = defaultRng): string[] {
  const unique = Array.from(new Set(enabledIds))
  if (unique.length < count) throw new RecipeError(`음료가 ${count}개 필요하지만 ${unique.length}개뿐입니다.`)
  return shuffle(unique, rng).slice(0, count)
}

/** 3단계: N 개용 템플릿 중 하나를 고르고 순서를 섞는다. */
export function chooseRatio(count: number, rng: Rng = defaultRng): number[] {
  return shuffle(pickOne(getTemplates(count), rng), rng)
}

function permutations(n: number): number[][] {
  if (n === 0) return [[]]
  const out: number[][] = []
  for (const p of permutations(n - 1))
    for (let i = 0; i <= p.length; i++) out.push([...p.slice(0, i), n - 1, ...p.slice(i)])
  return out
}

/**
 * 3단계(최대 mL 제한이 있을 때): 각 음료의 maxMl 을 넘지 않는 배정만 고른다.
 *  - 제한을 지킬 수 있는 템플릿 중에서 균등하게 하나
 *  - 그 템플릿 안에서 제한을 지키는 순서 중 균등하게 하나
 * 지킬 수 있는 템플릿이 하나도 없으면 null.
 */
export function chooseRatioWithCaps(
  drinkIds: readonly string[],
  maxMl: Readonly<Record<string, number>>,
  rng: Rng = defaultRng,
): number[] | null {
  const n = drinkIds.length
  const caps = drinkIds.map((id) => maxMl[id] ?? Infinity)
  if (caps.every((c) => c === Infinity)) return chooseRatio(n, rng)
  const perms = permutations(n)
  const options = getTemplates(n)
    .map((t) => perms.filter((p) => p.every((src, i) => t[src] <= caps[i])).map((p) => p.map((src) => t[src])))
    .filter((valid) => valid.length > 0)
  if (options.length === 0) return null
  return pickOne(pickOne(options, rng), rng)
}

let seq = 0

/**
 * 레시피 전체를 한 번에 확정한다. 애니메이션은 이 결과를 보여주기만 한다.
 */
export function generateRecipe(
  opts: {
    enabledDrinkIds: readonly string[]
    minCount: number
    maxCount: number
    /** 음료별 최대 mL (drinks.yaml 의 maxMl) */
    maxMl?: Readonly<Record<string, number>>
    /** 함께 나오면 안 되는 음료 쌍 (drinks.yaml 의 forbiddenPairs) */
    forbiddenPairs?: readonly ForbiddenPair[]
  },
  rng: Rng = defaultRng,
  now: () => number = Date.now,
  mixing?: { config: MixingConfig; embeddings: Embeddings },
): Recipe {
  const enabled = Array.from(new Set(opts.enabledDrinkIds))
  const forbidden = opts.forbiddenPairs ?? []
  const problems = validateSettings({
    enabledCount: enabled.length,
    minCount: opts.minCount,
    maxCount: opts.maxCount,
    maxCompatible: maxCompatibleCount(enabled, forbidden),
  })
  if (problems.length) throw new RecipeError(problems[0].message)

  const count = chooseDrinkCount(opts.minCount, opts.maxCount, rng)
  const harmony = mixing && mixing.config.mode === 'harmony'
  const caps = opts.maxMl ?? {}

  // 음료를 고른 뒤, 금지 조합이 있거나 최대 mL 제한을 지킬 수 없으면 같은 개수로 다시 고른다.
  // (조건에 맞을 때까지 다시 뽑기 = 원래 분포를 조건에 맞는 묶음들로만 정확히 다시 맞춘 것과 같다)
  let pick: { ids: string[]; surpriseIndex: number | null } | null = null
  let mls: number[] | null = null
  for (let attempt = 0; attempt < 500 && !mls; attempt++) {
    pick = harmony
      ? chooseDrinksHarmony(enabled, count, mixing.embeddings, mixing.config, rng)
      : { ids: chooseDrinks(enabled, count, rng), surpriseIndex: null }
    if (findForbidden(pick.ids, forbidden)) continue
    mls = chooseRatioWithCaps(pick.ids, caps, rng)
  }
  if (!pick || !mls)
    throw new RecipeError('금지 조합·최대 mL 조건을 모두 지키는 레시피를 찾지 못했어요. 재료를 더 선택해 주세요.')
  const drinkIds = pick.ids
  if (new Set(drinkIds).size !== count) throw new RecipeError('음료 중복 오류')

  const items = drinkIds.map((drinkId, i) => ({
    drinkId,
    ml: mls[i],
    fraction: mlToFraction(mls[i], TOTAL_ML),
    surprise: pick!.surpriseIndex === i,
  }))
  const total = items.reduce((a, b) => a + b.ml, 0)
  if (total !== TOTAL_ML) throw new RecipeError(`총량 오류: ${total}mL`)

  const createdAt = now()
  seq += 1
  return { id: `r-${createdAt.toString(36)}-${seq}`, createdAt, count, totalMl: TOTAL_ML, items, mode: harmony ? 'harmony' : 'random' }
}
