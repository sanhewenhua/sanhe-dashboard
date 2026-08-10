import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useStore } from './store/useStore'
import { initSync, onConnectionChange } from './utils/syncManager'

async function bootstrap() {
  // 启动时优先从 REST API 拉取服务器数据，覆盖 localStorage 中的旧缓存
  try {
    const res = await fetch('/api/data')
    if (res.ok) {
      const data = await res.json()
      if (data && Array.isArray(data.monthlyRecords) && data.monthlyRecords.length > 0) {
        useStore.getState().loadFromServer(data)
        console.log('[Bootstrap] 已从服务器加载数据')
      }
    }
  } catch (e) {
    console.log('[Bootstrap] 从服务器加载数据失败，使用本地数据:', e)
  }

  // 初始化 WebSocket 实时同步
  initSync(
    (data) => useStore.getState().loadFromServer(data),
    () => useStore.getState().resetData()
  )
  onConnectionChange((connected) => useStore.getState().setSyncConnected(connected))

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
