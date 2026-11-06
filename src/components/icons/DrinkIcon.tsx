import { useId, type ReactNode } from 'react'
import type { Drink, Garnish } from '../../data/drinkSchema'
import { darken, isLight, lighten, readableText } from '../../lib/color'

const INK = '#3A2A26'
const SW = 3.2

interface Props {
  drink: Pick<Drink, 'icon' | 'color' | 'liquid' | 'label' | 'garnish' | 'name' | 'imageUrl'>
  /** CSS 크기 (예: '8rem') */
  size?: string
  className?: string
  title?: boolean
}

/** drinks.yaml 의 icon/color/liquid/label/garnish 로 그리는 귀여운 게임 아이템 스타일 음료 아이콘 */
export function DrinkIcon({ drink, size = '6rem', className, title = false }: Props) {
  const uid = useId().replace(/:/g, '')
  if (drink.imageUrl) return <DrinkPhoto drink={drink} size={size} className={className} title={title} />
  let art: ReactNode
  switch (drink.icon) {
    case 'cup':
      art = <IcedCup uid={uid} drink={drink} />
      break
    case 'glass':
      art = <Tumbler uid={uid} drink={drink} />
      break
    case 'tall-glass':
      art = <TallGlass uid={uid} drink={drink} />
      break
    case 'can':
      art = <Can drink={drink} />
      break
    case 'bottle':
      art = <Bottle uid={uid} drink={drink} />
      break
    case 'carton':
      art = <Carton drink={drink} />
      break
  }
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title ? drink.name : undefined}
      style={{ overflow: 'visible' }}
    >
      <ellipse cx="60" cy="112" rx="30" ry="4.5" fill="#000" opacity="0.12" />
      <g strokeLinejoin="round" strokeLinecap="round">
        {art}
      </g>
    </svg>
  )
}

type ArtProps = { uid: string; drink: Props['drink'] }

function Liquid({ clip, top, color }: { clip: string; top: number; color: string }) {
  return (
    <g clipPath={`url(#${clip})`}>
      <path d={`M10 ${top} Q 25 ${top - 5} 40 ${top} T 70 ${top} T 100 ${top} T 130 ${top} V 130 H 10 Z`} fill={color} />
      <path
        d={`M10 ${top} Q 25 ${top - 5} 40 ${top} T 70 ${top} T 100 ${top} T 130 ${top}`}
        fill="none"
        stroke={lighten(color, 0.45)}
        strokeWidth="2.5"
        opacity="0.9"
      />
      <rect x="0" y={top + 30} width="130" height="60" fill={darken(color, 0.12)} opacity="0.35" />
    </g>
  )
}

function IceCube({ x, y, r = 0, s = 14 }: { x: number; y: number; r?: number; s?: number }) {
  return (
    <rect
      x={x}
      y={y}
      width={s}
      height={s}
      rx={3}
      fill="#FFFFFF"
      fillOpacity="0.55"
      stroke="#FFFFFF"
      strokeOpacity="0.95"
      strokeWidth="1.8"
      transform={`rotate(${r} ${x + s / 2} ${y + s / 2})`}
    />
  )
}

function GlassShine({ d }: { d: string }) {
  return <path d={d} fill="none" stroke="#FFFFFF" strokeWidth="4" opacity="0.8" />
}

function Citrus({ cx, cy, r, peel, flesh }: { cx: number; cy: number; r: number; peel: string; flesh: string }) {
  const segs = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3
    return (
      <line
        key={i}
        x1={cx}
        y1={cy}
        x2={cx + Math.cos(a) * (r - 4)}
        y2={cy + Math.sin(a) * (r - 4)}
        stroke={peel}
        strokeWidth="1.8"
      />
    )
  })
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={peel} stroke={INK} strokeWidth={SW} />
      <circle cx={cx} cy={cy} r={r - 3.5} fill={flesh} />
      {segs}
      <circle cx={cx} cy={cy} r={1.8} fill={peel} />
    </g>
  )
}

function GarnishArt({ garnish, x, y }: { garnish: Garnish; x: number; y: number }) {
  switch (garnish) {
    case 'orange':
      return <Citrus cx={x} cy={y} r={15} peel="#FF9F2E" flesh="#FFD27F" />
    case 'lemon':
      return <Citrus cx={x} cy={y} r={14} peel="#FFD93B" flesh="#FFF2A0" />
    case 'apple':
      return (
        <g>
          <path
            d={`M${x} ${y - 7} C ${x - 14} ${y - 15} ${x - 18} ${y + 4} ${x - 8} ${y + 11} C ${x - 4} ${y + 14} ${x} ${y + 12} ${x} ${y + 12} C ${x} ${y + 12} ${x + 4} ${y + 14} ${x + 8} ${y + 11} C ${x + 18} ${y + 4} ${x + 14} ${y - 15} ${x} ${y - 7} Z`}
            fill="#EF5143"
            stroke={INK}
            strokeWidth={SW}
          />
          <path d={`M${x} ${y - 7} Q ${x + 1} ${y - 13} ${x + 4} ${y - 16}`} stroke={INK} strokeWidth="2.6" fill="none" />
          <ellipse cx={x + 8} cy={y - 13} rx="6" ry="3" fill="#6CC04A" stroke={INK} strokeWidth="2.2" transform={`rotate(-25 ${x + 8} ${y - 13})`} />
          <ellipse cx={x - 6} cy={y - 2} rx="2.5" ry="4" fill="#FFFFFF" opacity="0.7" />
        </g>
      )
    case 'grape':
      return (
        <g>
          <path d={`M${x} ${y - 14} Q ${x + 2} ${y - 18} ${x + 5} ${y - 19}`} stroke={INK} strokeWidth="2.6" fill="none" />
          <ellipse cx={x + 9} cy={y - 16} rx="6" ry="3" fill="#6CC04A" stroke={INK} strokeWidth="2.2" transform={`rotate(-20 ${x + 9} ${y - 16})`} />
          {[
            [x - 6, y - 8],
            [x + 6, y - 8],
            [x, y - 9],
            [x - 3, y + 1],
            [x + 5, y + 1],
            [x + 1, y + 9],
          ].map(([cx, cy], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={6} fill="#8E44B5" stroke={INK} strokeWidth="2.4" />
              <circle cx={cx - 2} cy={cy - 2} r={1.6} fill="#FFFFFF" opacity="0.75" />
            </g>
          ))}
        </g>
      )
    case 'peach':
      return (
        <g>
          <circle cx={x} cy={y} r={12} fill="#FFAE8A" stroke={INK} strokeWidth={SW} />
          <path d={`M${x} ${y - 11} Q ${x - 5} ${y} ${x} ${y + 11}`} stroke="#E8836A" strokeWidth="2.2" fill="none" />
          <ellipse cx={x + 7} cy={y - 12} rx="6" ry="3" fill="#6CC04A" stroke={INK} strokeWidth="2.2" transform={`rotate(-25 ${x + 7} ${y - 12})`} />
          <ellipse cx={x - 5} cy={y - 3} rx="2.5" ry="4" fill="#FFFFFF" opacity="0.6" />
        </g>
      )
    default:
      return null
  }
}

function IcedCup({ uid, drink }: ArtProps) {
  const body = 'M33 40 L87 40 L80.5 103 Q80 108 75 108 L45 108 Q40 108 39.5 103 Z'
  const clip = `cup-${uid}`
  return (
    <>
      <defs>
        <clipPath id={clip}>
          <path d={body} />
        </clipPath>
      </defs>
      <path d={body} fill="#FFFFFF" fillOpacity="0.6" />
      <Liquid clip={clip} top={54} color={drink.liquid} />
      <g clipPath={`url(#${clip})`}>
        <IceCube x={42} y={52} r={-12} />
        <IceCube x={58} y={57} r={14} s={15} />
        <IceCube x={68} y={48} r={-6} s={12} />
      </g>
      <path d={body} fill="none" stroke={INK} strokeWidth={SW} />
      <GlassShine d="M40 47 L45 99" />
      {/* 빨대 */}
      <line x1="73" y1="4" x2="65" y2="34" stroke={INK} strokeWidth="10" />
      <line x1="73" y1="4" x2="65" y2="34" stroke={drink.color} strokeWidth="5.5" />
      {/* 돔 뚜껑 */}
      <path d="M30 40 Q60 18 90 40 Z" fill="#FFFFFF" fillOpacity="0.85" stroke={INK} strokeWidth={SW} />
      <rect x="26" y="37" width="68" height="8" rx="4" fill="#FFFFFF" stroke={INK} strokeWidth={SW} />
      <path d="M42 31 Q50 26 58 25" stroke="#FFFFFF" strokeWidth="3" fill="none" opacity="0.9" />
    </>
  )
}

function Tumbler({ uid, drink }: ArtProps) {
  const body = 'M31 32 L89 32 L82.5 102 Q81.5 108 75.5 108 L44.5 108 Q38.5 108 37.5 102 Z'
  const clip = `tum-${uid}`
  const hasIce = drink.garnish === 'ice'
  return (
    <>
      <defs>
        <clipPath id={clip}>
          <path d={body} />
        </clipPath>
      </defs>
      <path d={body} fill="#FFFFFF" fillOpacity="0.65" />
      <Liquid clip={clip} top={48} color={drink.liquid} />
      {hasIce && (
        <g clipPath={`url(#${clip})`}>
          <IceCube x={43} y={46} r={-14} s={16} />
          <IceCube x={62} y={50} r={10} s={15} />
          <IceCube x={52} y={66} r={24} s={13} />
        </g>
      )}
      <path d={body} fill="none" stroke={INK} strokeWidth={SW} />
      <path d="M31 32 L89 32" stroke={INK} strokeWidth={SW} />
      <GlassShine d="M39 40 L44 98" />
      <GlassShine d="M75 40 L74.5 46" />
      {!hasIce && <GarnishArt garnish={drink.garnish} x={86} y={32} />}
    </>
  )
}

function TallGlass({ uid, drink }: ArtProps) {
  const body = 'M37 20 L83 20 L78.5 104 Q78 109 72.5 109 L47.5 109 Q42 109 41.5 104 Z'
  const clip = `tall-${uid}`
  return (
    <>
      <defs>
        <clipPath id={clip}>
          <path d={body} />
        </clipPath>
      </defs>
      <path d={body} fill="#FFFFFF" fillOpacity="0.65" />
      <Liquid clip={clip} top={34} color={drink.liquid} />
      <g clipPath={`url(#${clip})`}>
        <line x1="50" y1="0" x2="58" y2="100" stroke={INK} strokeWidth="8.5" />
        <line x1="50" y1="0" x2="58" y2="100" stroke={lighten(drink.color, 0.35)} strokeWidth="4.5" />
        <IceCube x={44} y={36} r={-12} s={15} />
        <IceCube x={60} y={44} r={16} s={14} />
        <IceCube x={47} y={60} r={8} s={14} />
        <IceCube x={62} y={72} r={-18} s={12} />
      </g>
      <line x1="47.5" y1="2" x2="49.3" y2="20" stroke={INK} strokeWidth="8.5" />
      <line x1="47.5" y1="2" x2="49.3" y2="20" stroke={lighten(drink.color, 0.35)} strokeWidth="4.5" />
      <path d={body} fill="none" stroke={INK} strokeWidth={SW} />
      <GlassShine d="M44 30 L48 98" />
      <GarnishArt garnish={drink.garnish === 'ice' || drink.garnish === 'none' ? 'lemon' : drink.garnish} x={82} y={22} />
    </>
  )
}

function fitLabel(label: string | undefined, width: number) {
  if (!label) return null
  const long = label.length > 5
  return { text: label, extra: long ? { textLength: width, lengthAdjust: 'spacingAndGlyphs' as const } : {} }
}

function Can({ drink }: { drink: Props['drink'] }) {
  const body = drink.liquid
  const lightBody = isLight(body)
  const band = lightBody ? drink.color : '#FFFFFF'
  const bandText = lightBody ? readableText(drink.color) : darken(drink.color, 0.05)
  const label = fitLabel(drink.label, 42)
  return (
    <>
      {/* 탄산 방울 */}
      <circle cx="97" cy="34" r="3.4" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
      <circle cx="103" cy="22" r="2.4" fill="#FFFFFF" stroke={INK} strokeWidth="1.8" />
      <circle cx="94" cy="17" r="2" fill="#FFFFFF" stroke={INK} strokeWidth="1.6" />
      <rect x="34" y="23" width="52" height="82" rx="9" fill={body} stroke={INK} strokeWidth={SW} />
      <rect x="34" y="50" width="52" height="29" fill={band} />
      <line x1="34" y1="50" x2="86" y2="50" stroke={INK} strokeWidth="2.4" />
      <line x1="34" y1="79" x2="86" y2="79" stroke={INK} strokeWidth="2.4" />
      {label && (
        <text
          x="60"
          y="69.5"
          textAnchor="middle"
          fontSize="12.5"
          fontWeight="900"
          fill={bandText}
          fontFamily="Pretendard Variable, sans-serif"
          letterSpacing="0.4"
          stroke="none"
          {...label.extra}
        >
          {label.text}
        </text>
      )}
      <path d="M40 30 L40 98" stroke="#FFFFFF" strokeWidth="4.5" opacity="0.5" />
      <path d="M78 32 L78 44" stroke="#FFFFFF" strokeWidth="3" opacity="0.35" />
      <rect x="36" y="16" width="48" height="11" rx="5.5" fill="#DCE2E7" stroke={INK} strokeWidth={SW} />
      <rect x="53" y="13.5" width="15" height="6" rx="3" fill="#B9C2C9" stroke={INK} strokeWidth="2.4" />
      <rect x="37" y="100" width="46" height="9" rx="4.5" fill="#DCE2E7" stroke={INK} strokeWidth={SW} />
    </>
  )
}

function Bottle({ uid, drink }: ArtProps) {
  const body = 'M51 21 L69 21 L69 29 Q85 35 85 52 L85 100 Q85 108 77 108 L43 108 Q35 108 35 100 L35 52 Q35 35 51 29 Z'
  const clip = `bot-${uid}`
  const label = fitLabel(drink.label, 36)
  return (
    <>
      <defs>
        <clipPath id={clip}>
          <path d={body} />
        </clipPath>
      </defs>
      <path d={body} fill={drink.liquid} />
      <g clipPath={`url(#${clip})`}>
        <rect x="30" y="58" width="60" height="30" fill={drink.color} />
        <path d="M30 80 Q45 72 60 80 T90 80 V90 H30 Z" fill="#FFFFFF" opacity="0.9" />
        <rect x="30" y="94" width="60" height="20" fill={darken(drink.liquid, 0.06)} opacity="0.6" />
      </g>
      <path d={body} fill="none" stroke={INK} strokeWidth={SW} />
      <line x1="35" y1="58" x2="85" y2="58" stroke={INK} strokeWidth="2.4" />
      <line x1="35" y1="88" x2="85" y2="88" stroke={INK} strokeWidth="2.4" />
      {label && (
        <text
          x="60"
          y="73.5"
          textAnchor="middle"
          fontSize="12.5"
          fontWeight="900"
          fill={readableText(drink.color)}
          fontFamily="Pretendard Variable, sans-serif"
          letterSpacing="0.6"
          stroke="none"
          {...label.extra}
        >
          {label.text}
        </text>
      )}
      <GlassShine d="M41 46 L41 54" />
      <GlassShine d="M41 92 L41 100" />
      <rect x="49" y="7" width="22" height="15" rx="3.5" fill={drink.color} stroke={INK} strokeWidth={SW} />
      <line x1="55" y1="10" x2="55" y2="19" stroke={INK} strokeWidth="1.6" opacity="0.5" />
      <line x1="60" y1="10" x2="60" y2="19" stroke={INK} strokeWidth="1.6" opacity="0.5" />
      <line x1="65" y1="10" x2="65" y2="19" stroke={INK} strokeWidth="1.6" opacity="0.5" />
    </>
  )
}

function Carton({ drink }: { drink: Props['drink'] }) {
  const body = drink.liquid
  const side = darken(body, 0.1)
  const roof = darken(body, 0.16)
  const label = fitLabel(drink.label, 32)
  return (
    <>
      {/* 옆면 */}
      <path d="M74 44 L90 35 L90 98 L74 107 Z" fill={side} stroke={INK} strokeWidth={SW} />
      <path d="M74 62 L90 53 L90 79 L74 88 Z" fill={darken(drink.color, 0.15)} />
      {/* 지붕 */}
      <path d="M52 22 L68 13 L90 35 L74 44 Z" fill={roof} stroke={INK} strokeWidth={SW} />
      <path d="M30 44 L52 22 L74 44 Z" fill={body} stroke={INK} strokeWidth={SW} />
      <path d="M50 23 L66 14 L67 8 L51 17 Z" fill={body} stroke={INK} strokeWidth={SW} />
      {/* 앞면 */}
      <rect x="30" y="44" width="44" height="63" fill={body} stroke={INK} strokeWidth={SW} />
      <rect x="30" y="62" width="44" height="26" fill={drink.color} />
      <line x1="30" y1="62" x2="74" y2="62" stroke={INK} strokeWidth="2.2" />
      <line x1="30" y1="88" x2="74" y2="88" stroke={INK} strokeWidth="2.2" />
      <rect x="30" y="44" width="44" height="63" fill="none" stroke={INK} strokeWidth={SW} />
      <path d="M74 62 L90 53 M74 88 L90 79" stroke={INK} strokeWidth="2.2" />
      {label && (
        <text
          x="52"
          y="79"
          textAnchor="middle"
          fontSize="11.5"
          fontWeight="900"
          fill={readableText(drink.color)}
          fontFamily="Pretendard Variable, sans-serif"
          letterSpacing="0.5"
          stroke="none"
          {...label.extra}
        >
          {label.text}
        </text>
      )}
      {/* 물방울 마크 */}
      <path d="M52 47 Q46 54 46 57 A6 6 0 0 0 58 57 Q58 54 52 47 Z" fill={drink.color} stroke={INK} strokeWidth="2" />
      <path d="M35 50 L35 100" stroke="#FFFFFF" strokeWidth="4" opacity="0.7" />
    </>
  )
}

/** 실제 음료 사진: 흰 둥근 타일 위에 올려 배경이 흰 제품 사진도 자연스럽게 보이도록 */
function DrinkPhoto({ drink, size, className, title }: Required<Pick<Props, 'size' | 'title'>> & Props) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className ?? ''}`}
      style={{ width: size, height: size }}
      role={title ? 'img' : undefined}
      aria-label={title ? drink.name : undefined}
      aria-hidden={title ? undefined : true}
    >
      <span
        className="absolute inset-[4%] overflow-hidden rounded-[22%] bg-white"
        style={{ boxShadow: '0 0 0 0.15em rgba(56,43,40,0.12), 0 0.35em 0.6em rgba(56,43,40,0.12)', fontSize: `calc(${size} / 12)` }}
      >
        <img
          src={drink.imageUrl}
          alt=""
          draggable={false}
          className="h-full w-full scale-[1.12] object-contain"
        />
      </span>
    </span>
  )
}
