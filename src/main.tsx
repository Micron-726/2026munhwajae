import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { sound } from './lib/sound'
import './index.css'

// 브라우저 자동재생 정책: 첫 클릭/키 입력 때 오디오를 깨운다.
const unlock = () => sound.unlock()
window.addEventListener('pointerdown', unlock, { once: true })
window.addEventListener('keydown', unlock, { once: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
