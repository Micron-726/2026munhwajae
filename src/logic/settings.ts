import { MAX_SUPPORTED_COUNT, MIN_SUPPORTED_COUNT } from './ratioTemplates'

export const DEFAULT_MIN_COUNT = 2
export const DEFAULT_MAX_COUNT = 4

export interface MixSettings {
  enabledDrinkIds: string[]
  minCount: number
  maxCount: number
}

export type SettingsField = 'min' | 'max' | 'drinks'

export interface SettingsProblem {
  field: SettingsField
  message: string
}

export function defaultSettings(allDrinkIds: readonly string[]): MixSettings {
  return { enabledDrinkIds: [...allDrinkIds], minCount: DEFAULT_MIN_COUNT, maxCount: DEFAULT_MAX_COUNT }
}

/** 추첨 가능한 설정인지 검사한다. 빈 배열이면 OK. 값을 몰래 고치지 않는다. */
export function validateSettings(s: { enabledCount: number; minCount: number; maxCount: number }): SettingsProblem[] {
  const out: SettingsProblem[] = []
  if (!Number.isInteger(s.minCount) || s.minCount < MIN_SUPPORTED_COUNT)
    out.push({ field: 'min', message: `최소 개수는 ${MIN_SUPPORTED_COUNT}개 이상이어야 해요!` })
  if (!Number.isInteger(s.maxCount) || s.maxCount > MAX_SUPPORTED_COUNT)
    out.push({ field: 'max', message: `최대 개수는 ${MAX_SUPPORTED_COUNT}개 이하여야 해요!` })
  if (s.minCount > s.maxCount)
    out.push({ field: 'min', message: '최소 개수가 최대 개수보다 많아요! 숫자를 다시 맞춰 주세요.' })
  if (s.enabledCount === 0) out.push({ field: 'drinks', message: '음료를 하나 이상 선택해 주세요!' })
  else if (s.enabledCount < s.maxCount)
    out.push({
      field: 'drinks',
      message: `최대 ${s.maxCount}개의 음료를 뽑으려면 재료를 ${s.maxCount}개 이상 선택해 주세요!`,
    })
  return out
}
