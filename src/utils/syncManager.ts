/**
 * 实时同步管理器
 * - WebSocket 连接管理
 * - 防抖推送本地变更到服务器
 * - 接收服务器广播并更新本地状态
 * - 自动重连
 */

type SyncData = {
  staff?: unknown[]
  groups?: unknown[]
  projects?: unknown[]
  accounts?: unknown[]
  monthlyRecords?: unknown[]
  issues?: unknown[]
  leads?: unknown[]
  monthSnapshots?: unknown[]
  staffSalaries?: Record<string, number>
  legacyReceivables?: unknown[]
  oneTimeProjects?: unknown[]
}

type ServerMessage =
  | { type: 'sync'; data: SyncData; _v?: number }
  | { type: 'reset' }

let ws: WebSocket | null = null
let isReceiving = false // 正在从服务器接收数据，阻止反向同步
let isReconnecting = false // 重连后短暂标记，此期间的sync消息不覆盖本地
let lastAppliedVersion = 0 // 已应用的最大版本号，防止旧数据覆盖新数据
let pushTimer: ReturnType<typeof setTimeout> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let connectionCallback: ((connected: boolean) => void) | null = null
let getFullState: (() => SyncData) | null = null

// 需要同步的业务数据字段
const SYNC_KEYS: (keyof SyncData)[] = [
  'staff',
  'groups',
  'projects',
  'accounts',
  'monthlyRecords',
  'issues',
  'leads',
  'monthSnapshots',
  'staffSalaries',
  'legacyReceivables',
  'oneTimeProjects',
]

/** 从 store 提取需要同步的数据 */
export function extractSyncData(state: Record<string, unknown>): SyncData {
  const data: SyncData = {}
  for (const key of SYNC_KEYS) {
    if (state[key] !== undefined) {
      ;(data as Record<string, unknown>)[key] = state[key]
    }
  }
  return data
}

/** 防抖推送数据到服务器 */
export function pushToServer(data: SyncData) {
  if (isReceiving) return // 从服务器收到的数据不回推
  if (!ws || ws.readyState !== WebSocket.OPEN) return

  if (pushTimer) clearTimeout(pushTimer)

  pushTimer = setTimeout(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'update', data }))
  }, 400)
}

/** 初始化 WebSocket 连接 */
export function initSync(
  onSync: (data: SyncData) => void,
  onReset?: () => void
) {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${location.host}/ws`

  console.log('[Sync] 连接 WebSocket:', wsUrl)

  try {
    ws = new WebSocket(wsUrl)
  } catch (e) {
    console.error('[Sync] WebSocket 创建失败:', e)
    scheduleReconnect(onSync, onReset)
    return
  }

  ws.onopen = () => {
    console.log('[Sync] WebSocket 已连接')
    if (connectionCallback) connectionCallback(true)

    // 重连时：立即推送本地完整状态到服务器，防止服务器旧数据覆盖本地修改
    if (getFullState) {
      const data = getFullState()
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'update', data }))
        // 标记重连保护窗口：接下来 2 秒内收到的 sync（可能是自己推送的回响或其他客户端的旧数据）
        // 只跳过，因为我们已经推送了本地最新状态
        isReconnecting = true
        setTimeout(() => {
          isReconnecting = false
        }, 2000)
      }
    }
  }

  ws.onmessage = (event) => {
    try {
      const msg: ServerMessage = JSON.parse(event.data)

      if (msg.type === 'sync') {
        // 版本号保护：如果收到的版本号不大于已应用的版本，说明是旧数据回响，直接丢弃
        const msgVersion = typeof msg._v === 'number' ? msg._v : 0
        if (msgVersion > 0 && msgVersion <= lastAppliedVersion) {
          console.log('[Sync] 忽略旧版本数据 (_v:', msgVersion, '<=', lastAppliedVersion, ')')
          return
        }

        // 重连保护窗口内忽略 sync 消息：我们已经推送了本地最新状态
        if (isReconnecting) {
          console.log('[Sync] 重连保护窗口内忽略 sync (_v:', msgVersion, ')')
          return
        }
        // 标记正在接收，阻止本地订阅回推
        isReceiving = true
        onSync(msg.data)
        lastAppliedVersion = Math.max(lastAppliedVersion, msgVersion)
        // 释放标记（等 store 更新 + persist 写入完成）
        setTimeout(() => {
          isReceiving = false
        }, 300)
      } else if (msg.type === 'reset') {
        onReset?.()
      }
    } catch (e) {
      console.error('[Sync] 消息解析失败:', e)
    }
  }

  ws.onerror = (e) => {
    console.error('[Sync] WebSocket 错误:', e)
  }

  ws.onclose = () => {
    console.log('[Sync] WebSocket 断开，3 秒后重连')
    if (connectionCallback) connectionCallback(false)
    scheduleReconnect(onSync, onReset)
  }
}

function scheduleReconnect(
  onSync: (data: SyncData) => void,
  onReset?: () => void
) {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(() => {
    initSync(onSync, onReset)
  }, 3000)
}

/** 注册连接状态回调 */
export function onConnectionChange(cb: (connected: boolean) => void) {
  connectionCallback = cb
}

/** 注册状态获取器，用于重连时推送本地最新状态 */
export function setSyncStateProvider(fn: () => SyncData) {
  getFullState = fn
}

/** 当前是否已连接 */
export function isWsConnected() {
  return ws !== null && ws.readyState === WebSocket.OPEN
}

/** 设置本地已应用的服务端版本号（用于 bootstrap 初始化） */
export function setAppliedVersion(v: number) {
  lastAppliedVersion = v
}

/** 获取当前已应用的服务端版本号 */
export function getAppliedVersion() {
  return lastAppliedVersion
}
