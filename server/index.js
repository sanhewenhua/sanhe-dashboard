import express from 'express'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { WebSocketServer } from 'ws'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

app.use(express.json({ limit: '50mb' }))

// ---- 数据存储 ----
const DATA_FILE = path.join(__dirname, 'data.json')

let serverData = null
try {
  const raw = fs.readFileSync(DATA_FILE, 'utf8')
  serverData = JSON.parse(raw)
  // 兼容旧数据：如果没有版本号，初始化为 0
  if (typeof serverData._v !== 'number') serverData._v = 0
} catch {
  // 首次启动，无数据文件
}

/** 递增版本号并持久化 */
function bumpVersion() {
  if (!serverData) serverData = {}
  serverData._v = (serverData._v || 0) + 1
  fs.writeFileSync(DATA_FILE, JSON.stringify(serverData, null, 2))
  console.log(`[Data] 版本 ${serverData._v} 已持久化`)
}

function broadcast(message, exclude = null) {
  // 自动附加版本号
  if (serverData && typeof serverData._v === 'number') {
    message._v = serverData._v
  }
  const msg = JSON.stringify(message)
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client !== exclude) {
      client.send(msg)
    }
  })
}

// ---- REST API ----

// 获取全量数据
app.get('/api/data', (req, res) => {
  res.json(serverData || {})
})

// 保存全量数据 + 广播给其他客户端
app.post('/api/data', (req, res) => {
  const incoming = req.body
  // 保留服务端的版本号（客户端不应篡改 _v），递增
  serverData = incoming
  bumpVersion()
  broadcast({ type: 'sync', data: serverData })
  res.json({ ok: true, _v: serverData._v })
})

// 重置数据
app.post('/api/reset', (req, res) => {
  serverData = null
  if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE)
  broadcast({ type: 'reset' })
  res.json({ ok: true })
})

// ---- WebSocket ----
wss.on('connection', (ws) => {
  console.log(`[WS] 客户端已连接，当前在线: ${wss.clients.size}`)

  // 不再在新连接时自动推送服务器数据——防止重连时用旧数据覆盖客户端本地修改。
  // 改为由客户端在连接成功后主动推送自己的最新状态。

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())
      if (msg.type === 'update') {
        // 客户端通过 WS 发送更新
        serverData = msg.data
        bumpVersion()
        // 广播给其他客户端（不回发给发送者），带上版本号
        broadcast({ type: 'sync', data: serverData }, ws)
      }
    } catch (e) {
      console.error('[WS] 消息解析失败:', e)
    }
  })

  ws.on('close', () => {
    console.log(`[WS] 客户端断开，当前在线: ${wss.clients.size}`)
  })
})

// ---- 静态文件服务 ----
const distPath = path.join(__dirname, '..', 'dist')
app.use(express.static(distPath))

// SPA 回退：所有非 API 请求返回 index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.sendFile(path.join(distPath, 'index.html'))
})

// ---- 启动 ----
const PORT = process.env.PORT || 3000
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  叁和管理看板服务已启动`)
  console.log(`  本地访问:   http://localhost:${PORT}`)
  console.log(`  局域网访问: http://192.168.1.8:${PORT}`)
  console.log(`  WebSocket:  ws://localhost:${PORT}/ws\n`)
})
