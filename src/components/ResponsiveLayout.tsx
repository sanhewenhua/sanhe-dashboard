import { useState } from 'react'
import { Layout, Menu, theme, Modal, Input, Button, message, Popconfirm, Tag } from 'antd'
import {
  DashboardOutlined,
  AppstoreOutlined,
  TeamOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  PlusOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'

const { Header, Content, Sider } = Layout

function SyncIndicator() {
  const syncConnected = useStore((s) => s.syncConnected)
  return (
    <Tag
      color={syncConnected ? 'success' : 'error'}
      style={{ margin: 0, fontSize: 11, lineHeight: '18px', padding: '0 6px' }}
    >
      {syncConnected ? '已同步' : '未连接'}
    </Tag>
  )
}

export default function ResponsiveLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string } | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { displayName, currentGroup, logout, groups, addGroup, updateGroup } = useStore()
  const { token } = theme.useToken()

  const isMobile = window.innerWidth <= 768
  const currentPath = location.pathname === '/group' ? '/group/A' : location.pathname

  const handleMenuClick = (path: string) => {
    navigate(path)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleAddGroup = () => {
    if (!newGroupName.trim()) {
      message.warning('请输入组名')
      return
    }
    const id = addGroup(newGroupName.trim())
    message.success(`已添加 ${newGroupName.trim()}`)
    setNewGroupName('')
    setGroupModalOpen(false)
    navigate(`/group/${id}`)
  }

  const handleSaveGroupName = () => {
    if (!editingGroup) return
    if (!editingGroup.name.trim()) {
      message.warning('组名不能为空')
      return
    }
    updateGroup(editingGroup.id, { name: editingGroup.name.trim() })
    message.success('组名已更新')
    setEditingGroup(null)
  }

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '汇总面板' },
    { key: '/overview', icon: <AppstoreOutlined />, label: '项目总览' },
    ...groups.map((g) => ({
      key: `/group/${g.id}`,
      icon: <TeamOutlined />,
      label: g.name,
    })),
    { key: '/performance', icon: <BarChartOutlined />, label: '绩效统计' },
    { key: '/staff', icon: <SettingOutlined />, label: '员工管理' },
  ]

  if (isMobile) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <Header style={{
          position: 'sticky', top: 0, zIndex: 100, width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', background: '#001529',
        }}>
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>叁和文化</span>
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
            <SyncIndicator />
            <PlusOutlined onClick={() => setGroupModalOpen(true)} style={{ cursor: 'pointer' }} />
            <span>
              {displayName}
              {currentGroup && (
                <Tag color="blue" style={{ fontSize: 10, margin: '0 0 0 6px', padding: '0 4px', lineHeight: '16px', verticalAlign: 'middle' }}>
                  {currentGroup}组
                </Tag>
              )}
            </span>
            <LogoutOutlined onClick={handleLogout} style={{ cursor: 'pointer' }} />
          </span>
        </Header>
        <Content style={{ padding: '12px', paddingBottom: 60 }}>
          {children}
        </Content>
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: '#fff', borderTop: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'space-around', padding: '6px 0',
          paddingBottom: 'calc(6px + env(safe-area-inset-bottom))',
        }}>
          {menuItems.map((item) => {
            const active = currentPath === item.key ||
              (item.key.startsWith('/group') && currentPath.startsWith('/group'))
            return (
              <div
                key={item.key}
                onClick={() => handleMenuClick(item.key)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 2, cursor: 'pointer', padding: '4px 8px',
                  color: active ? '#1677ff' : '#8c8c8c', fontSize: 10,
                  minWidth: 44,
                }}
              >
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            )
          })}
        </div>

        {/* 新增组 Modal (mobile) */}
        <Modal
          title="新增组"
          open={groupModalOpen}
          onOk={handleAddGroup}
          onCancel={() => { setGroupModalOpen(false); setNewGroupName('') }}
          width="90%"
        >
          <Input
            placeholder="如：D组、华东组等"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onPressEnter={handleAddGroup}
            autoFocus
          />
        </Modal>

        {/* 编辑组名 Modal (mobile) */}
        <Modal
          title="修改组名"
          open={editingGroup !== null}
          onOk={handleSaveGroupName}
          onCancel={() => setEditingGroup(null)}
          width="90%"
        >
          <Input
            placeholder="组名"
            value={editingGroup?.name || ''}
            onChange={(e) => setEditingGroup(editingGroup ? { ...editingGroup, name: e.target.value } : null)}
            onPressEnter={handleSaveGroupName}
            autoFocus
          />
        </Modal>
      </Layout>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ overflow: 'auto', height: '100vh', position: 'sticky', top: 0, left: 0 }}
      >
        <div style={{
          height: 48, margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: collapsed ? 14 : 18, fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          {collapsed ? '叁和' : '叁和文化管理看板'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentPath]}
          items={menuItems}
          onClick={({ key }) => handleMenuClick(key)}
        />
        {/* 组管理区域 */}
        <div style={{ position: 'absolute', bottom: 100, width: '100%', padding: '0 16px' }}>
          <Button
            block
            type="dashed"
            ghost
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setGroupModalOpen(true)}
            style={{ marginBottom: 4 }}
          >
            {collapsed ? '' : '新增组'}
          </Button>
          {!collapsed && groups.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {groups.map((g) => (
                <div
                  key={g.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    color: 'rgba(255,255,255,0.45)', fontSize: 12, padding: '2px 4px',
                    cursor: 'pointer', borderRadius: 4,
                  }}
                  onClick={() => setEditingGroup({ id: g.id, name: g.name })}
                >
                  <span>{g.name}</span>
                  <EditOutlined style={{ fontSize: 11 }} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ position: 'absolute', bottom: 48, width: '100%', padding: '0 16px' }}>
          <Menu
            theme="dark"
            mode="inline"
            items={[{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }]}
            onClick={handleLogout}
          />
        </div>
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px', background: token.colorBgContainer,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 14, color: '#8c8c8c' }}>
            欢迎回来，{displayName}
            {currentGroup && (
              <Tag color="blue" style={{ fontSize: 10, margin: '0 0 0 6px', padding: '0 4px', lineHeight: '16px' }}>
                {currentGroup}组
              </Tag>
            )}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <SyncIndicator />
            <LogoutOutlined onClick={handleLogout} style={{ fontSize: 16, cursor: 'pointer', color: '#8c8c8c' }} />
          </span>
        </Header>
        <Content style={{ margin: 16, padding: 24, background: token.colorBgContainer, borderRadius: 8, overflow: 'auto' }}>
          {children}
        </Content>
      </Layout>

      {/* 新增组 Modal */}
      <Modal
        title="新增组"
        open={groupModalOpen}
        onOk={handleAddGroup}
        onCancel={() => { setGroupModalOpen(false); setNewGroupName('') }}
        width={360}
      >
        <Input
          placeholder="如：D组、华东组等"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onPressEnter={handleAddGroup}
          autoFocus
        />
      </Modal>

      {/* 编辑组名 Modal */}
      <Modal
        title="修改组名"
        open={editingGroup !== null}
        onOk={handleSaveGroupName}
        onCancel={() => setEditingGroup(null)}
        width={360}
      >
        <Input
          placeholder="组名"
          value={editingGroup?.name || ''}
          onChange={(e) => setEditingGroup(editingGroup ? { ...editingGroup, name: e.target.value } : null)}
          onPressEnter={handleSaveGroupName}
          autoFocus
        />
      </Modal>
    </Layout>
  )
}
