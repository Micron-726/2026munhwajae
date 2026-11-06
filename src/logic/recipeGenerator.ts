import { mlToFraction, TOTAL_ML, type Fraction } from './fractions'
import { getTemplates } from './ratioTemplates'
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

let seq = 0

/**
 * 레시피 전체를 한 번에 확정한다. 애니메이션은 이 결과를 보여주기만 한다.
 */
export function generateRecipe(
  opts: { enabledDrinkIds: readonly string[]; minCount: number; maxCount: number },
  rng: Rng = defaultRng,
  now: () => number = Date.now,
  mixing?: { config: MixingConfig; embeddings: Embeddings },
): Recipe {
  const enabled = Array.from(new Set(opts.enabledDrinkIds))
  const problems = validateSettings({ enabledCount: enabled.length, minCount: opts.minCount, maxCount: opts.maxCount })
  if (problems.length) throw new RecipeError(problems[0].message)

  const count = chooseDrinkCount(opts.minCount, opts.maxCount, rng)
  const harmony = mixing && mixing.config.mode === 'harmony'
  const pick = harmony
    ? chooseDrinksHarmony(enabled, count, mixing.embeddings, mixing.config, rng)
    : { ids: chooseDrinks(enabled, count, rng), surpriseIndex: null }
  const drinkIds = pick.ids
  if (new Set(drinkIds).size !== count) throw new RecipeError('음료 중복 오류')
  const mls = chooseRatio(count, rng)

  const items = drinkIds.map((drinkId, i) => ({
    drinkId,
    ml: mls[i],
    fraction: mlToFraction(mls[i], TOTAL_ML),
    surprise: pick.surpriseIndex === i,
  }))
  const total = items.reduce((a, b) => a + b.ml, 0)
  if (total !== TOTAL_ML) throw new RecipeError(`총량 오류: ${total}mL`)

  const createdAt = now()
  seq += 1
  return { id: `r-${createdAt.toString(36)}-${seq}`, createdAt, count, totalMl: TOTAL_ML, items, mode: harmony ? 'harmony' : 'random' }
}
