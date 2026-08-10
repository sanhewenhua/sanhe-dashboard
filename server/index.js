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
} catch {
  // 首次启动，无数据文件
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(serverData, null, 2))
}

function broadcast(message, exclude = null) {
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
  serverData = incoming
  saveData()
  broadcast({ type: 'sync', data: serverData })
  res.json({ ok: true })
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

  // 新连接时发送当前服务器数据
  if (serverData) {
    ws.send(JSON.stringify({ type: 'sync', data: serverData }))
  }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())
      if (msg.type === 'update') {
        // 客户端通过 WS 发送更新
        serverData = msg.data
        saveData()
        // 广播给其他客户端（不回发给发送者）
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
