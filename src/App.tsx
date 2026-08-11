import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useStore } from './store/useStore'
import ResponsiveLayout from './components/ResponsiveLayout'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProjectOverview from './pages/ProjectOverview'
import GroupDetail from './pages/GroupDetail'
import ProjectDetail from './pages/ProjectDetail'
import Performance from './pages/Performance'
import StaffManage from './pages/StaffManage'
import Analysis from './pages/Analysis'

function AppRoutes() {
  const { isLoggedIn } = useStore()

  if (!isLoggedIn) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <ResponsiveLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/overview" element={<ProjectOverview />} />
        <Route path="/group/:groupId" element={<GroupDetail />} />
        <Route path="/project/:projectId" element={<ProjectDetail />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/ranking" element={<Navigate to="/analysis" replace />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/staff" element={<StaffManage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ResponsiveLayout>
  )
}

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
        },
      }}
    >
      <AntApp>
        <HashRouter>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </HashRouter>
      </AntApp>
    </ConfigProvider>
  )
}
