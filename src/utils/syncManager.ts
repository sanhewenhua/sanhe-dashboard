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
}

type ServerMessage =
  | { type: 'sync'; data: SyncData }
  | { type: 'reset' }

let ws: WebSocket | null = null
let isReceiving = false // 正在从服务器接收数据，阻止反向同步
let pushTimer: ReturnType<typeof setTimeout> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let connectionCallback: ((connected: boolean) => void) | null = null

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
  }

  ws.onmessage = (event) => {
    try {
      const msg: ServerMessage = JSON.parse(event.data)

      if (msg.type === 'sync') {
        // 标记正在接收，阻止本地订阅回推
        isReceiving = true
        onSync(msg.data)
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

/** 当前是否已连接 */
export function isWsConnected() {
  return ws !== null && ws.readyState === WebSocket.OPEN
}
