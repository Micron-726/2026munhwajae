export const TOTAL_ML = 180

export interface Fraction {
  num: number
  den: number
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) {
    const t = a % b
    a = b
    b = t
  }
  return a
}

/** mL 를 총량 대비 약분된 분수로 바꾼다. 예) 90 → 1/2, 15 → 1/12 */
export function mlToFraction(ml: number, total: number = TOTAL_ML): Fraction {
  if (!Number.isInteger(ml) || !Number.isInteger(total) || ml <= 0 || total <= 0 || ml > total) {
    throw new RangeError(`잘못된 용량: ${ml}/${total}`)
  }
  const g = gcd(ml, total)
  return { num: ml / g, den: total / g }
}

export function formatFraction(f: Fraction): string {
  return f.den === 1 ? `${f.num}` : `${f.num}/${f.den}`
}

/** 분수 합을 정수 연산만으로 계산해 약분된 분수로 돌려준다. */
export function sumFractions(fs: readonly Fraction[]): Fraction {
  let num = 0
  let den = 1
  for (const f of fs) {
    num = num * f.den + f.num * den
    den = den * f.den
    const g = gcd(num, den)
    num /= g
    den /= g
  }
  return { num, den }
}
