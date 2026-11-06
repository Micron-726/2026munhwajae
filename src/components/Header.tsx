import { Settings2, Volume2, VolumeX } from 'lucide-react'
import type { MixSettings } from '../logic/settings'
import { TOTAL_ML } from '../logic/fractions'

interface Props {
  settings: MixSettings
  totalDrinks: number
  soundOn: boolean
  onToggleSound: () => void
  onOpenSettings: () => void
  settingsDisabled: boolean
}

export function Header({ settings, totalDrinks, soundOn, onToggleSound, onOpenSettings, settingsDisabled }: Props) {
  const range = settings.minCount === settings.maxCount ? `${settings.minCount}가지` : `${settings.minCount}~${settings.maxCount}가지`
  return (
    <header className="relative z-20 flex h-[6.5rem] shrink-0 items-center gap-[2rem] px-[2.5rem]">
      <div className="flex items-center gap-[1rem]">
        <LogoMark />
        <div className="leading-none">
          <h1 className="font-display text-[2.75rem] tracking-tight text-ink">
            Claude Chef’s <span className="text-primary">Mystery Kitchen</span>
          </h1>
          <p className="mt-[0.35rem] text-[1.2rem] font-semibold text-muted">클로드 셰프의 수상한 음료 연구소</p>
        </div>
      </div>

      <div
        className="ml-auto flex items-center gap-[0.6rem] rounded-full bg-white/80 px-[1.25rem] py-[0.6rem] text-[1.15rem] font-bold text-ink shadow-[0_0.2rem_0_#f0e1cc]"
        aria-label="현재 설정 요약"
      >
        <SummaryChip label="재료" value={`${settings.enabledDrinkIds.length}/${totalDrinks}`} />
        <Dot />
        <SummaryChip label="혼합" value={range} />
        <Dot />
        <SummaryChip label="총량" value={`${TOTAL_ML}mL`} />
      </div>

      <button
        type="button"
        onClick={onToggleSound}
        className="btn-3d btn-soft flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full"
        aria-pressed={soundOn}
        aria-label={soundOn ? '효과음 끄기' : '효과음 켜기'}
        title={soundOn ? '효과음 ON' : '효과음 OFF'}
      >
        {soundOn ? (
          <Volume2 className="h-[1.8rem] w-[1.8rem] text-primary" strokeWidth={2.6} />
        ) : (
          <VolumeX className="h-[1.8rem] w-[1.8rem] text-muted" strokeWidth={2.6} />
        )}
      </button>

      <button
        type="button"
        onClick={onOpenSettings}
        disabled={settingsDisabled}
        className="btn-3d btn-soft flex h-[3.75rem] items-center gap-[0.6rem] rounded-full px-[1.5rem] text-[1.35rem] font-extrabold"
      >
        <Settings2 className="h-[1.6rem] w-[1.6rem] text-primary" strokeWidth={2.6} />
        재료 설정
      </button>
    </header>
  )
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-[0.4rem]">
      <span className="text-[1rem] font-semibold text-muted">{label}</span>
      <span>{value}</span>
    </span>
  )
}

function Dot() {
  return <span className="h-[0.35rem] w-[0.35rem] rounded-full bg-[#e6d3ba]" aria-hidden />
}

function LogoMark() {
  return (
    <svg viewBox="0 0 64 64" className="h-[4.25rem] w-[4.25rem]" aria-hidden>
      <g fill="#D97757">
        <rect x="12" y="26" width="40" height="26" />
        <rect x="6" y="34" width="7" height="9" />
        <rect x="51" y="34" width="7" height="9" />
        <rect x="16" y="51" width="4" height="9" />
        <rect x="22" y="51" width="4" height="9" />
        <rect x="38" y="51" width="4" height="9" />
        <rect x="44" y="51" width="4" height="9" />
      </g>
      <path d="M20 35 L25 38 L20 41 M44 35 L39 38 L44 41" fill="none" stroke="#1E1714" strokeWidth="2.6" strokeLinecap="square" />
      <path
        d="M15 24 L15 16 L19 16 L19 11 L26 11 L26 7 L38 7 L38 11 L45 11 L45 16 L49 16 L49 24 Z"
        fill="#fff"
        stroke="#382B28"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <rect x="17" y="22" width="30" height="6" rx="1" fill="#fff" stroke="#382B28" strokeWidth="2.4" />
    </svg>
  )
}
