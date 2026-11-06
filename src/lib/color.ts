function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function toHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}

/** WCAG 상대 휘도 */
export function luminance(hex: string): number {
  const [r, g, b] = parse(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function isLight(hex: string): boolean {
  return luminance(hex) > 0.42
}

/** 색 위에 올릴 글자색 (흰색 또는 진한 갈색) */
export function readableText(hex: string): string {
  const L = luminance(hex)
  const contrastWhite = 1.05 / (L + 0.05)
  const contrastInk = (L + 0.05) / (luminance('#382B28') + 0.05)
  return contrastWhite >= contrastInk ? '#FFFFFF' : '#382B28'
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parse(a)
  const [r2, g2, b2] = parse(b)
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}

export const darken = (hex: string, t: number) => mix(hex, '#000000', t)
export const lighten = (hex: string, t: number) => mix(hex, '#FFFFFF', t)

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parse(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
