import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useStore } from './store/useStore'
import { initSync, onConnectionChange, setSyncStateProvider, extractSyncData, setAppliedVersion } from './utils/syncManager'

async function bootstrap() {
  // 启动时智能加载服务器数据：版本号 + 项目数双重保护
  const localState = useStore.getState()
  try {
    const res = await fetch('/api/data')
    if (res.ok) {
      const data = await res.json()
      const serverVersion = typeof data._v === 'number' ? data._v : 0
      const serverProjectCount = Array.isArray(data.projects) ? data.projects.length : 0
      const localProjectCount = localState.projects?.length || 0

      // 多层判断是否应该加载服务器数据：
      // 1. 本地无数据 → 必须加载
      // 2. 服务器项目数多于本地 → 服务器更新
      // 3. 其他情况 → 保留本地数据
      const shouldLoad =
        localProjectCount === 0 ||
        serverProjectCount > localProjectCount

      if (shouldLoad && serverProjectCount > 0) {
        useStore.getState().loadFromServer(data)
        // 记录服务端版本号，防止后续收到旧版本 sync 覆盖
        setAppliedVersion(serverVersion)
        console.log('[Bootstrap] 从服务器加载 (_v:', serverVersion, '本地:', localProjectCount, '→ 服务端:', serverProjectCount, ')')
      } else {
        // 保留本地数据，但仍记录版本号防止旧数据回滚
        setAppliedVersion(serverVersion)
        console.log('[Bootstrap] 保留本地 (_v:', serverVersion, '本地:', localProjectCount, '>= 服务端:', serverProjectCount, ')')
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
