import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition, type Transition } from 'motion/react'

export type ChefMood = 'idle' | 'thinking' | 'surprised' | 'celebrating'

const INK = '#382B28'
const EYE = '#1E1714'
/** 기본 Claude 캐릭터의 주황색 */
export const CHEF_ORANGE = '#D97757'

interface Props {
  mood: ChefMood
  /** CSS 높이 (예: '22rem') */
  height?: string
}

type Pose = { animate: TargetAndTransition; transition: Transition }

const loop = (duration: number, extra: Transition = {}): Transition => ({
  duration,
  repeat: Infinity,
  ease: 'easeInOut',
  ...extra,
})

const BODY: Record<ChefMood, Pose> = {
  idle: { animate: { y: [0, -6, 0], rotate: 0, scale: 1 }, transition: loop(2.4) },
  thinking: { animate: { rotate: [-3, 3, -3], y: [0, -3, 0], scale: 1 }, transition: loop(0.9) },
  surprised: {
    animate: { scale: [1, 1.12, 1.04], y: [0, -16, -4], rotate: 0 },
    transition: { duration: 0.35, ease: 'easeOut' },
  },
  celebrating: {
    animate: { y: [0, -28, 0, -12, 0], scaleY: [1, 1.04, 0.93, 1.02, 1], rotate: [0, -3, 0, 3, 0] },
    transition: loop(0.95, { ease: 'easeOut' }),
  },
}

const LEFT_ARM: Record<ChefMood, Pose> = {
  idle: { animate: { rotate: [0, 8, 0] }, transition: loop(2.4) },
  thinking: { animate: { rotate: 6 }, transition: { duration: 0.3 } },
  surprised: { animate: { rotate: 40 }, transition: { type: 'spring', stiffness: 500, damping: 14 } },
  celebrating: { animate: { rotate: [30, 60, 30] }, transition: loop(0.48) },
}

const RIGHT_ARM: Record<ChefMood, Pose> = {
  idle: { animate: { rotate: [0, -8, 0] }, transition: loop(2.4) },
  thinking: { animate: { rotate: [-10, -26, -10] }, transition: loop(0.22) },
  surprised: { animate: { rotate: -40 }, transition: { type: 'spring', stiffness: 500, damping: 14 } },
  celebrating: { animate: { rotate: [-30, -62, -30] }, transition: loop(0.24) },
}

const LEGS = [56, 76, 151, 171]

/** 클로드 셰프 — 기본 Claude 캐릭터(네모난 주황 몸, > < 눈, 다리 4개)에 요리사 모자를 씌운 모습 */
export function ChefCharacter({ mood, height = '20rem' }: Props) {
  const reduced = useReducedMotion()
  const pose = (p: Pose): Pose => (reduced ? { animate: { ...stripLoop(p.animate) }, transition: { duration: 0 } } : p)

  return (
    <svg
      viewBox="0 0 240 300"
      style={{ height, width: 'auto', overflow: 'visible' }}
      role="img"
      aria-label={`클로드 셰프 (${MOOD_LABEL[mood]})`}
      data-mood={mood}
    >
      <motion.ellipse
        cx="120"
        cy="294"
        rx="78"
        ry="8"
        fill="#000"
        opacity={0.13}
        animate={mood === 'celebrating' && !reduced ? { scaleX: [1, 0.75, 1, 0.88, 1] } : { scaleX: 1 }}
        transition={mood === 'celebrating' ? loop(0.95, { ease: 'easeOut' }) : { duration: 0.3 }}
        style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
      />

      <motion.g key={`body-${mood}`} {...pose(BODY[mood])} style={{ transformBox: 'fill-box', originX: 0.5, originY: 1 }}>
        {/* 스티커처럼 흰 테두리 */}
        <g fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="12" strokeLinejoin="round">
          <rect x="40" y="140" width="160" height="112" />
          {LEGS.map((x) => (
            <rect key={x} x={x} y="248" width="13" height="42" />
          ))}
        </g>

        {/* 다리 */}
        {LEGS.map((x) => (
          <rect key={x} x={x} y="248" width="13" height="42" fill={CHEF_ORANGE} />
        ))}

        {/* 왼팔 */}
        <motion.g key={`la-${mood}`} {...pose(LEFT_ARM[mood])} style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}>
          <circle cx="40" cy="190" r="30" fill="none" stroke="none" />
          <rect x="20" y="172" width="22" height="36" fill={CHEF_ORANGE} stroke="#FFFFFF" strokeWidth="6" strokeLinejoin="round" />
        </motion.g>

        {/* 오른팔 + 셰이커 */}
        <motion.g key={`ra-${mood}`} {...pose(RIGHT_ARM[mood])} style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}>
          <circle cx="200" cy="190" r="34" fill="none" stroke="none" />
          <Shaker />
          <rect x="198" y="172" width="22" height="36" fill={CHEF_ORANGE} stroke="#FFFFFF" strokeWidth="6" strokeLinejoin="round" />
        </motion.g>

        {/* 몸통 */}
        <rect x="40" y="140" width="160" height="112" fill={CHEF_ORANGE} />
        <rect x="40" y="244" width="160" height="8" fill="#000" opacity="0.06" />

        {/* 눈 */}
        <Eyes mood={mood} reduced={!!reduced} />

        {/* 요리사 모자 (픽셀 느낌) */}
        <path
          d="M60 116 L60 92 L72 92 L72 78 L96 78 L96 64 L144 64 L144 78 L168 78 L168 92 L180 92 L180 116 Z"
          fill="#FFFFFF"
          stroke={INK}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <rect x="104" y="72" width="14" height="6" fill="#EFE6DA" />
        <rect x="80" y="86" width="10" height="6" fill="#EFE6DA" />
        <rect x="64" y="112" width="112" height="30" rx="3" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
        <g fill="#E8DCCD">
          <rect x="88" y="118" width="5" height="18" />
          <rect x="117.5" y="118" width="5" height="18" />
          <rect x="147" y="118" width="5" height="18" />
        </g>
      </motion.g>

      {/* 감정 표시 */}
      <AnimatePresence>
        {mood === 'thinking' && (
          <motion.text
            key="q"
            x="200"
            y="110"
            fontSize="46"
            fontFamily="Jua, sans-serif"
            fill={CHEF_ORANGE}
            stroke={INK}
            strokeWidth="2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: [0, -6, 0] }}
            exit={{ opacity: 0 }}
            transition={{ y: loop(1.2), opacity: { duration: 0.2 } }}
          >
            ?
          </motion.text>
        )}
        {mood === 'surprised' && (
          <motion.g
            key="ex"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 12 }}
            style={{ transformBox: 'fill-box', originX: 0.5, originY: 1 }}
          >
            <rect x="200" y="54" width="14" height="38" fill="#FFD56A" stroke={INK} strokeWidth="3.5" />
            <rect x="200" y="98" width="14" height="13" fill="#FFD56A" stroke={INK} strokeWidth="3.5" />
            <path d="M34 112 L22 100 M28 134 L12 132 M44 94 L40 78" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          </motion.g>
        )}
        {mood === 'celebrating' && (
          <motion.g key="sp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Sparkle x={24} y={86} s={1.1} delay={0} />
            <Sparkle x={216} y={64} s={0.9} delay={0.25} />
            <Sparkle x={228} y={150} s={0.7} delay={0.5} />
            <Sparkle x={14} y={160} s={0.6} delay={0.7} />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  )
}

const MOOD_LABEL: Record<ChefMood, string> = {
  idle: '기다리는 중',
  thinking: '고민 중',
  surprised: '깜짝 놀람',
  celebrating: '신남',
}

function stripLoop(a: TargetAndTransition): TargetAndTransition {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(a)) out[k] = Array.isArray(v) ? v[v.length - 1] : v
  return out as TargetAndTransition
}

function Eyes({ mood, reduced }: { mood: ChefMood; reduced: boolean }) {
  const chevron = { fill: 'none', stroke: EYE, strokeWidth: 6.5, strokeLinecap: 'square' as const, strokeLinejoin: 'miter' as const }
  switch (mood) {
    case 'idle':
      return (
        <motion.g
          animate={reduced ? undefined : { scaleY: [1, 1, 0.12, 1, 1] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.9, 0.93, 0.96, 1] }}
          style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
        >
          <path d="M63 177 L82 189 L63 201" {...chevron} />
          <path d="M177 177 L158 189 L177 201" {...chevron} />
        </motion.g>
      )
    case 'thinking':
      return (
        <g fill={EYE}>
          <rect x="70" y="172" width="11" height="22" />
          <rect x="166" y="172" width="11" height="22" />
        </g>
      )
    case 'surprised':
      return (
        <g>
          <rect x="60" y="170" width="24" height="28" fill={EYE} />
          <rect x="156" y="170" width="24" height="28" fill={EYE} />
          <rect x="64" y="174" width="7" height="7" fill="#FFFFFF" />
          <rect x="160" y="174" width="7" height="7" fill="#FFFFFF" />
        </g>
      )
    case 'celebrating':
      return (
        <g>
          <path d="M60 197 L72 182 L84 197" {...chevron} />
          <path d="M156 197 L168 182 L180 197" {...chevron} />
        </g>
      )
  }
}

function Shaker() {
  return (
    <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
      <rect x="219" y="146" width="11" height="8" rx="2.5" fill="#C3CDD4" />
      <path d="M214 165 L235 165 L231 154 L218 154 Z" fill="#CFD8DE" />
      <path d="M212 165 L237 165 L234 204 Q233.5 208 229.5 208 L219.5 208 Q215.5 208 215 204 Z" fill="#E4EBEF" />
      <line x1="213" y1="175" x2="236" y2="175" strokeWidth="2.2" />
      <path d="M229 180 L228 201" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

function Sparkle({ x, y, s, delay }: { x: number; y: number; s: number; delay: number }) {
  return (
    <motion.path
      d={`M${x} ${y - 14 * s} Q${x + 2.5 * s} ${y - 2.5 * s} ${x + 14 * s} ${y} Q${x + 2.5 * s} ${y + 2.5 * s} ${x} ${y + 14 * s} Q${x - 2.5 * s} ${y + 2.5 * s} ${x - 14 * s} ${y} Q${x - 2.5 * s} ${y - 2.5 * s} ${x} ${y - 14 * s} Z`}
      fill="#FFD56A"
      stroke={INK}
      strokeWidth="2.5"
      strokeLinejoin="round"
      animate={{ scale: [0.4, 1.15, 0.4], rotate: [0, 45, 90] }}
      transition={{ duration: 1.1, repeat: Infinity, delay, ease: 'easeInOut' }}
      style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
    />
  )
}
