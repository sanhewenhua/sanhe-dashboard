import { useMemo, useState } from 'react'
import { Card, Row, Col, Table, Tag, Select, Button, Tabs, Space } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { useStore } from '../store/useStore'
import { calcProjectMonthData, getRecentMonths, formatMoney } from '../utils/helpers'
import { exportMultiSheet } from '../utils/excel'

export default function Performance() {
  const { projects, accounts, monthlyRecords, issues, staff, groups, selectedMonth, setSelectedMonth } = useStore()
  const [activeTab, setActiveTab] = useState('person')
  const isMobile = window.innerWidth <= 768
  const recentMonths = getRecentMonths(6)
  const lastMonth = recentMonths[recentMonths.length - 2] || selectedMonth

  // 按人统计
  const personData = useMemo(() => {
    const activeStaff = staff.filter((s) => s.status === '在职')
    return activeStaff.map((s) => {
      // 找出该人参与的所有项目
      const involvedProjects = projects.filter((p) =>
        p.leaderIds.includes(s.id) || p.directorIds.includes(s.id) ||
        p.copywriterIds.includes(s.id) || p.videographerIds.includes(s.id) ||
        p.editorIds.includes(s.id)
      )
      // 本月完成数 = 所有参与项目的本月已完成之和
      const monthRecords = monthlyRecords.filter((r) => {
        const proj = projects.find((p) => p.id === r.projectId)
        return proj && involvedProjects.includes(proj) && r.yearMonth === selectedMonth
      })
      const monthCompleted = monthRecords.reduce((sum, r) => sum + r.completedCount, 0)

      const lastMonthRecords = monthlyRecords.filter((r) => {
        const proj = projects.find((p) => p.id === r.projectId)
        return proj && involvedProjects.includes(proj) && r.yearMonth === lastMonth
      })
      const lastMonthCompleted = lastMonthRecords.reduce((sum, r) => sum + r.completedCount, 0)

      const change = lastMonthCompleted > 0
        ? ((monthCompleted - lastMonthCompleted) / lastMonthCompleted * 100).toFixed(1)
        : '0.0'

      return {
        key: s.id,
        name: s.name,
        roles: s.roles.join('/'),
        group: s.groupId === 'none' ? '未分组' : `${s.groupId}组`,
        projectCount: involvedProjects.length,
        monthCompleted,
        lastMonthCompleted,
        change: parseFloat(change),
        projects: involvedProjects.map((p) => p.name).join('、'),
      }
    }).sort((a, b) => b.monthCompleted - a.monthCompleted)
  }, [staff, projects, monthlyRecords, selectedMonth, lastMonth, recentMonths])

  // 按组统计
  const groupData = useMemo(() => {
    return groups.map((g) => {
      const gProjects = projects.filter((p) => p.groupId === g.id)
      const gRecords = monthlyRecords.filter((r) => {
        const proj = projects.find((p) => p.id === r.projectId)
        return proj?.groupId === g.id && r.yearMonth === selectedMonth
      })
      const gLastRecords = monthlyRecords.filter((r) => {
        const proj = projects.find((p) => p.id === r.projectId)
        return proj?.groupId === g.id && r.yearMonth === lastMonth
      })
      const planned = gRecords.reduce((s, r) => s + r.plannedCount, 0)
      const completed = gRecords.reduce((s, r) => s + r.completedCount, 0)
      const received = gRecords.reduce((s, r) => s + r.paidAmount, 0)
      const lastCompleted = gLastRecords.reduce((s, r) => s + r.completedCount, 0)
      const gIssues = issues.filter((i) => {
        const proj = projects.find((p) => p.id === i.projectId)
        return proj?.groupId === g.id && i.status !== '已解决'
      })
      return {
        key: g.id,
        name: g.name,
        planned, completed,
        rate: planned > 0 ? (completed / planned * 100) : 0,
        lastCompleted,
        change: lastCompleted > 0 ? ((completed - lastCompleted) / lastCompleted * 100).toFixed(1) : '0',
        received,
        projectCount: gProjects.filter((p) => p.status === '进行中').length,
        issueCount: gIssues.length,
      }
    })
  }, [groups, projects, monthlyRecords, issues, selectedMonth, lastMonth])

  // 按项目统计
  const projectData = useMemo(() => {
    return projects.filter((p) => p.status === '进行中').map((p) => {
      const d = calcProjectMonthData(p, accounts, monthlyRecords, issues, selectedMonth)
      const last3Months = recentMonths.slice(-3)
      const last3Records = monthlyRecords.filter((r) => r.projectId === p.id && last3Months.includes(r.yearMonth))
      const last3Rates = last3Records.map((r) => r.plannedCount > 0 ? r.completedCount / r.plannedCount : 0)
      const avgRate = last3Rates.length > 0 ? last3Rates.reduce((a, b) => a + b, 0) / last3Rates.length * 100 : 0
      const projectIssues = issues.filter((i) => i.projectId === p.id)
      return {
        key: p.id,
        name: p.name,
        planned: d.monthPlanned,
        completed: d.monthCompleted,
        rate: d.completionRate,
        avgRate,
        fee: p.monthlyFee,
        paymentStatus: d.monthUnpaid > 0 ? '未收' : '已收',
        issueCount: projectIssues.length,
      }
    })
  }, [projects, accounts, monthlyRecords, issues, selectedMonth, recentMonths])

  const handleExport = () => {
    exportMultiSheet([
      {
        name: '按人统计',
        data: personData.map((p) => ({
          '姓名': p.name, '角色': p.roles, '所属组': p.group,
          '参与项目数': p.projectCount, '本月完成': p.monthCompleted,
          '上月完成': p.lastMonthCompleted, '环比(%)': p.change,
          '参与项目': p.projects,
        })),
      },
      {
        name: '按组统计',
        data: groupData.map((g) => ({
          '组名': g.name, '本月计划': g.planned, '本月已完成': g.completed,
          '完成率(%)': g.rate.toFixed(1), '上月完成': g.lastCompleted,
          '环比(%)': g.change, '本月收款': g.received,
          '项目数': g.projectCount, '问题数': g.issueCount,
        })),
      },
      {
        name: '按项目统计',
        data: projectData.map((p) => ({
          '项目名': p.name, '本月计划': p.planned,
          '本月完成': p.completed, '完成率(%)': p.rate.toFixed(1),
          '近3月平均完成率(%)': p.avgRate.toFixed(1),
          '月费': p.fee, '收款状态': p.paymentStatus, '问题数': p.issueCount,
        })),
      },
    ], `绩效统计_${selectedMonth}`)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22 }}>绩效统计</h2>
        <Space>
          <Select size="small" value={selectedMonth} onChange={setSelectedMonth}
            style={{ width: 100 }}
            options={recentMonths.map((m) => ({ label: m, value: m }))} />
          <Button icon={<DownloadOutlined />} onClick={handleExport}>导出Excel</Button>
        </Space>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'person',
          label: '按人员',
          children: (
            <Table
              dataSource={personData}
              rowKey="key"
              size="small"
              scroll={{ x: 600 }}
              pagination={false}
              columns={[
                { title: '#', width: 40, render: (_, __, i) => i + 1 },
                { title: '姓名', dataIndex: 'name', width: 80, render: (n: string, r: any) => <span style={{ fontWeight: 600 }}>{n}</span> },
                { title: '角色', dataIndex: 'roles', width: 100 },
                { title: '组', dataIndex: 'group', width: 70 },
                { title: '项目数', dataIndex: 'projectCount', width: 60, align: 'center' as const },
                { title: '本月完成', dataIndex: 'monthCompleted', width: 80, align: 'center' as const, render: (v: number) => <span style={{ fontWeight: 600, color: '#1677ff' }}>{v}</span> },
                { title: '上月完成', dataIndex: 'lastMonthCompleted', width: 80, align: 'center' as const },
                {
                  title: '环比', dataIndex: 'change', width: 70, align: 'center' as const,
                  render: (v: number) => <span style={{ color: v >= 0 ? '#52c41a' : '#f5222d' }}>{v >= 0 ? '+' : ''}{v}%</span>,
                },
                { title: '参与项目', dataIndex: 'projects', ellipsis: true },
              ]}
            />
          ),
        },
        {
          key: 'group',
          label: '按组',
          children: (
            <Row gutter={[12, 12]}>
              {groupData.map((g) => (
                <Col xs={24} sm={8} key={g.key}>
                  <Card size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <strong style={{ fontSize: 16 }}>{g.name}</strong>
                      {g.issueCount > 0 && <Tag color="red">{g.issueCount}个问题</Tag>}
                    </div>
                    <div style={{ textAlign: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 32, fontWeight: 700, color: g.rate >= 80 ? '#52c41a' : '#fa8c16' }}>{g.completed}</span>
                      <span style={{ fontSize: 14, color: '#8c8c8c' }}>/{g.planned}条</span>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 13, color: '#8c8c8c', marginBottom: 8 }}>
                      完成率 {g.rate.toFixed(1)}% | 上月 {g.lastCompleted}条
                    </div>
                    <div style={{ fontSize: 12, color: '#595959', display: 'flex', justifyContent: 'space-between' }}>
                      <span>收款: {formatMoney(g.received)}</span>
                      <span>项目: {g.projectCount}个</span>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          ),
        },
        {
          key: 'project',
          label: '按项目',
          children: (
            <Table
              dataSource={projectData}
              rowKey="key"
              size="small"
              scroll={{ x: 600 }}
              pagination={false}
              columns={[
                { title: '项目名', dataIndex: 'name', width: 150, render: (n: string) => <span style={{ fontWeight: 700, fontSize: 14 }}>{n}</span> },
                { title: '本月计划', dataIndex: 'planned', width: 70, align: 'center' as const },
                { title: '本月完成', dataIndex: 'completed', width: 70, align: 'center' as const, render: (v: number) => <span style={{ fontWeight: 600 }}>{v}</span> },
                {
                  title: '完成率', dataIndex: 'rate', width: 100,
                  render: (rate: number) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ flex: 1, height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${rate}%`, height: '100%', background: rate >= 80 ? '#52c41a' : rate >= 50 ? '#1677ff' : '#fa8c16' }} />
                      </div>
                      <span style={{ fontSize: 12 }}>{rate.toFixed(1)}%</span>
                    </div>
                  ),
                },
                { title: '3月均率', dataIndex: 'avgRate', width: 70, align: 'center' as const, render: (v: number) => `${v.toFixed(1)}%` },
                { title: '月费', dataIndex: 'fee', width: 70, render: (v: number) => formatMoney(v) },
                { title: '收款', dataIndex: 'paymentStatus', width: 60, render: (s: string) => <Tag color={s === '已收' ? 'green' : 'red'}>{s}</Tag> },
                { title: '问题', dataIndex: 'issueCount', width: 50, align: 'center' as const, render: (v: number) => v > 0 ? <Tag color="red">{v}</Tag> : '-' },
              ]}
            />
          ),
        },
      ]} />
    </div>
  )
}
