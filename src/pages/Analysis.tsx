import { useState } from 'react'
import { Tabs, Card } from 'antd'
import {
  TrophyOutlined,
  ExperimentOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import ProjectRanking from './ProjectRanking'

const isMobile = window.innerWidth <= 768

interface AnalysisTab {
  key: string
  label: string
  icon: React.ReactNode
  component: React.ReactNode
  disabled?: boolean
}

export default function Analysis() {
  const [activeKey, setActiveKey] = useState('ranking')

  const tabs: AnalysisTab[] = [
    {
      key: 'ranking',
      label: '项目质量排名',
      icon: <TrophyOutlined />,
      component: <ProjectRanking />,
    },
    {
      key: 'trend',
      label: '趋势分析',
      icon: <BarChartOutlined />,
      component: (
        <Card style={{ textAlign: 'center', padding: '60px 20px', borderRadius: 10 }}>
          <ExperimentOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
          <div style={{ fontSize: 15, color: '#8c8c8c', marginBottom: 8 }}>
            趋势分析模块即将上线
          </div>
          <div style={{ fontSize: 13, color: '#bfbfbf' }}>
            将支持收入趋势、成本趋势、完成量趋势等多维度分析
          </div>
        </Card>
      ),
      disabled: true,
    },
    {
      key: 'compare',
      label: '对比分析',
      icon: <ExperimentOutlined />,
      component: (
        <Card style={{ textAlign: 'center', padding: '60px 20px', borderRadius: 10 }}>
          <ExperimentOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
          <div style={{ fontSize: 15, color: '#8c8c8c', marginBottom: 8 }}>
            对比分析模块即将上线
          </div>
          <div style={{ fontSize: 13, color: '#bfbfbf' }}>
            将支持项目间横向对比、组间对比等多维度分析
          </div>
        </Card>
      ),
      disabled: true,
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22 }}>
          <BarChartOutlined style={{ color: '#1677ff', marginRight: 8 }} />
          运营分析
        </h2>
      </div>

      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        size="large"
        items={tabs.map((tab) => ({
          key: tab.key,
          label: (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {tab.icon}
              {tab.label}
            </span>
          ),
          disabled: tab.disabled,
          children: tab.component,
        }))}
      />
    </div>
  )
}
