import { motion } from 'motion/react'
import type { Speech } from '../state/kitchen'

export function ChefSpeechBubble({ speech }: { speech: Speech }) {
  const warn = speech.tone === 'warn'
  const key = `${speech.main}|${speech.sub ?? ''}`
  return (
    <div className="relative w-full" aria-live="polite">
      <div
        className={`relative min-h-[8.75rem] rounded-[2rem] border-[0.25rem] bg-white px-[1.75rem] py-[1.25rem] shadow-[0_0.5rem_0_#f0dcc3] ${
          warn ? 'border-danger' : 'border-ink'
        }`}
      >
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 30 }}
          >
            <p
              className={`font-display leading-[1.2] ${speech.main.length > 12 ? 'text-[1.75rem]' : 'text-[2.1rem]'} ${warn ? 'text-danger' : 'text-ink'}`}
            >
              {speech.main}
            </p>
            {speech.sub && <p className="mt-[0.4rem] text-[1.45rem] font-bold leading-snug text-muted">{speech.sub}</p>}
          </motion.div>
      </div>
      {/* 말풍선 꼬리 (아래쪽, 셰프를 가리킴) */}
      <svg viewBox="0 0 40 30" className="absolute -bottom-[1.6rem] left-[45%] h-[2rem] w-[2.6rem]" aria-hidden>
        <path d="M2 0 L38 0 L12 28 Z" fill="#fff" />
        <path d="M2 2 L12 28 L36 2" fill="none" stroke={warn ? '#d9473b' : '#382B28'} strokeWidth="4" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
