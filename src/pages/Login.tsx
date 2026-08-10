import { useState } from 'react'
import { Card, Form, Input, Button, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useStore } from '../store/useStore'

export default function Login() {
  const { login } = useStore()
  const [loading, setLoading] = useState(false)

  const onFinish = (values: { username: string; password: string }) => {
    setLoading(true)
    setTimeout(() => {
      const success = login(values.username, values.password)
      if (success) {
        message.success('登录成功')
      } else {
        message.error('用户名或密码错误')
      }
      setLoading(false)
    }, 300)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: 16,
    }}>
      <Card
        style={{
          width: '100%', maxWidth: 380, borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}
        styles={{ body: { padding: 32 } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
            叁和文化传媒
          </h1>
          <p style={{ color: '#8c8c8c', fontSize: 14, marginTop: 8 }}>内部管理看板系统</p>
        </div>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} size="large">
              登录
            </Button>
          </Form.Item>
        </Form>
        <p style={{ textAlign: 'center', color: '#bfbfbf', fontSize: 12 }}>
          内部系统 · 仅供员工使用
        </p>
      </Card>
    </div>
  )
}
