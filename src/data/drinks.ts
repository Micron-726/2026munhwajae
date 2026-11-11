import rawDrinks from '../../drinks.yaml'
import { buildEmbeddings, DEFAULT_MIXING, type Embeddings, type MixingConfig } from '../logic/harmony'
import { DrinkConfigError, parseDrinks, parseMixing, type Drink } from './drinkSchema'

/**
 * drink-images 폴더의 사진을 빌드에 함께 넣는다.
 * (빌드 결과 dist/index.html 한 파일 안에 포함되므로 더블클릭 실행도 그대로 동작)
 */
const IMAGE_FILES = import.meta.glob('../../drink-images/*.{png,jpg,jpeg,webp,gif,svg,avif,PNG,JPG,JPEG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const IMAGE_BY_NAME = new Map<string, string>(
  Object.entries(IMAGE_FILES).map(([path, url]) => [path.split('/').pop()!.toLowerCase(), url]),
)

let drinks: Drink[] = []
let configError: DrinkConfigError | null = null
let mixing: MixingConfig = { ...DEFAULT_MIXING }
const imageWarnings: string[] = []

try {
  mixing = parseMixing(rawDrinks)
  drinks = parseDrinks(rawDrinks).map((d) => {
    if (!d.image) return d
    const url = IMAGE_BY_NAME.get(d.image.toLowerCase())
    if (!url) {
      imageWarnings.push(`${d.name}: drink-images/${d.image} 파일이 없어 기본 아이콘으로 표시합니다.`)
      return d
    }
    return { ...d, imageUrl: url }
  })
} catch (e) {
  configError = e instanceof DrinkConfigError ? e : new DrinkConfigError([String(e)])
}

if (imageWarnings.length) console.warn('[drinks.yaml]', imageWarnings.join('\n'))

/** drinks.yaml 에서 읽어 온 음료 목록 (hidden 제외) */
export const DRINKS: readonly Drink[] = drinks
export const DRINK_CONFIG_ERROR = configError
/** 사진 파일을 찾지 못한 음료 안내 (설정 화면에 표시) */
export const DRINK_IMAGE_WARNINGS: readonly string[] = imageWarnings
const embedding = buildEmbeddings(drinks)

/** 조합 방식 (drinks.yaml 의 mixing:) */
export const MIXING: Readonly<MixingConfig> = mixing
/** 맛 임베딩: 중심화 + 정규화된 flavor 벡터 */
export const EMBEDDINGS: Embeddings = embedding.vectors
export const FLAVOR_AXES: readonly string[] = embedding.axes
/** flavor 가 없는 음료 (궁합 모드에서 중립 취급) */
export const DRINKS_WITHOUT_FLAVOR: readonly string[] = drinks.filter((d) => !d.flavor || Object.keys(d.flavor).length === 0).map((d) => d.name)
export const DRINK_BY_ID: ReadonlyMap<string, Drink> = new Map(drinks.map((d) => [d.id, d]))
export const ALL_DRINK_IDS: readonly string[] = drinks.map((d) => d.id)
/** 음료별 최대 mL (drinks.yaml 의 maxMl) */
export const MAX_ML_BY_ID: Readonly<Record<string, number>> = Object.fromEntries(
  drinks.filter((d) => d.maxMl !== undefined).map((d) => [d.id, d.maxMl as number]),
)

export type { Drink }
