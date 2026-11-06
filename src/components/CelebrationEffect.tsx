import { motion } from 'motion/react'
import { useMemo } from 'react'

const PALETTE = ['#E87343', '#FFD56A', '#C7E8DD', '#7FB7F0', '#F59FB5', '#9ED36A']

/** 완성 순간: 화면 빛 + 종이 조각/별 파티클 (약 1초) */
export function CelebrationEffect({ colors = [] }: { colors?: string[] }) {
  const pieces = useMemo(() => {
    const pal = [...PALETTE, ...colors]
    return Array.from({ length: 56 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.15,
      dur: 0.9 + Math.random() * 0.4,
      drift: (Math.random() - 0.5) * 18,
      rot: (Math.random() - 0.5) * 720,
      w: 0.7 + Math.random() * 0.8,
      h: 1 + Math.random() * 1.2,
      c: pal[i % pal.length],
      round: i % 4 === 0,
    }))
  }, [colors])

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
      aria-hidden
      data-testid="celebration"
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at 60% 45%, rgba(255,255,255,0.95) 0%, rgba(255,240,200,0.6) 35%, rgba(255,255,255,0) 70%)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-[-3rem] block"
          style={{
            left: `${p.left}%`,
            width: `${p.w}rem`,
            height: p.round ? `${p.w}rem` : `${p.h}rem`,
            background: p.c,
            borderRadius: p.round ? '999px' : '0.2rem',
          }}
          initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '110vh', x: `${p.drift}rem`, rotate: p.rot, opacity: [1, 1, 0.9, 0] }}
          transition={{ duration: p.dur, delay: p.delay, ease: [0.2, 0.6, 0.4, 1] }}
        />
      ))}
    </motion.div>
  )
}
