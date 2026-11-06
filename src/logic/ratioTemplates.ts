import { TOTAL_ML } from './fractions'

/**
 * 음료 개수별 혼합 비율 템플릿 (단위: mL, 총합 180mL)
 *
 * ▸ 수정 방법: 배열에 [mL, mL, ...] 한 줄을 추가/삭제하면 됩니다.
 *   - 숫자 개수 = 음료 개수
 *   - 합계는 반드시 180
 *   - 5mL 단위 권장 (계량하기 쉬움)
 *   `npm test` 를 실행하면 잘못된 템플릿을 자동으로 잡아 줍니다.
 */
export const RATIO_TEMPLATES: Readonly<Record<number, readonly (readonly number[])[]>> = {
  2: [
    [90, 90], // 1/2 + 1/2
    [60, 120], // 1/3 + 2/3
    [45, 135], // 1/4 + 3/4
    [30, 150], // 1/6 + 5/6
  ],
  3: [
    [60, 60, 60], // 1/3 + 1/3 + 1/3
    [90, 45, 45], // 1/2 + 1/4 + 1/4
    [90, 60, 30], // 1/2 + 1/3 + 1/6
    [120, 30, 30], // 2/3 + 1/6 + 1/6
  ],
  4: [
    [45, 45, 45, 45], // 1/4 ×4
    [90, 30, 30, 30], // 1/2 + 1/6 ×3
    [60, 60, 30, 30], // 1/3 + 1/3 + 1/6 + 1/6
    [90, 45, 30, 15], // 1/2 + 1/4 + 1/6 + 1/12
  ],
  5: [
    [60, 30, 30, 30, 30], // 1/3 + 1/6 ×4
    [45, 45, 30, 30, 30], // 1/4 + 1/4 + 1/6 ×3
    [60, 45, 30, 30, 15], // 1/3 + 1/4 + 1/6 + 1/6 + 1/12
  ],
}

export const MIN_SUPPORTED_COUNT = 2
export const MAX_SUPPORTED_COUNT = 5

export function getTemplates(count: number): readonly (readonly number[])[] {
  const list = RATIO_TEMPLATES[count]
  if (!list || list.length === 0) throw new RangeError(`${count}개 음료용 비율 템플릿이 없습니다.`)
  return list
}

/** 템플릿 자체 검증 (개발 중 실수 방지용) */
export function validateTemplate(count: number, mls: readonly number[]): string | null {
  if (mls.length !== count) return `${count}개용 템플릿인데 숫자가 ${mls.length}개입니다.`
  if (mls.some((m) => !Number.isInteger(m) || m <= 0)) return '모든 용량은 양의 정수여야 합니다.'
  const sum = mls.reduce((a, b) => a + b, 0)
  if (sum !== TOTAL_ML) return `합계가 ${sum}mL 입니다 (${TOTAL_ML}mL 이어야 함).`
  return null
}
