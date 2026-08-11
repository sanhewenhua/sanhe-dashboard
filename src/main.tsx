import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useStore } from './store/useStore'
import { initSync, onConnectionChange, setSyncStateProvider, extractSyncData } from './utils/syncManager'

async function bootstrap() {
  // 启动时优先从 REST API 拉取服务器数据，但只覆盖明显过时的本地数据
  const localState = useStore.getState()
  try {
    const res = await fetch('/api/data')
    if (res.ok) {
      const data = await res.json()
      const serverProjectCount = Array.isArray(data.projects) ? data.projects.length : 0
      const localProjectCount = localState.projects?.length || 0

      // 只在以下情况才覆盖本地数据：
      // 1. 本地无数据（全新设备/清除缓存）
      // 2. 服务器数据明显多于本地（其他设备有更新）
      if (localProjectCount === 0 || serverProjectCount > localProjectCount) {
        if (serverProjectCount > 0) {
          useStore.getState().loadFromServer(data)
          console.log('[Bootstrap] 从服务器加载数据（本地:', localProjectCount, '服务端:', serverProjectCount, '）')
        }
      } else {
        console.log('[Bootstrap] 本地数据更新，保留本地（本地:', localProjectCount, '服务端:', serverProjectCount, '）')
      }
    }
  } catch (e) {
    console.log('[Bootstrap] 从服务器加载数据失败，使用本地数据:', e)
  }

  // 注册状态提供者：重连时 syncManager 可获取本地最新完整状态推送到服务器
  setSyncStateProvider(() =>
    extractSyncData(useStore.getState() as unknown as Record<string, unknown>)
  )

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
