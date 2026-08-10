import { useMemo, useState, useEffect } from 'react'
import { Card, Row, Col, Progress, Tag, Table, Button, Tooltip, Modal, Select, Space } from 'antd'
import { useNavigate } from 'react-router-dom'
import {
  DownloadOutlined, AlertOutlined, VideoCameraOutlined,
  DollarOutlined, CheckCircleOutlined, ProjectOutlined,
  WarningOutlined, RiseOutlined, FallOutlined, EditOutlined,
} from '@ant-design/icons'
import { useStore } from '../store/useStore'
import { calcProjectMonthData, formatMoney, getRecentMonths } from '../utils/helpers'
import { exportToExcel } from '../utils/excel'
import type { MonthlyRecord } from '../types'

const groupColors: Record<string, { border: string; bg: string; light: string; text: string }> = {
  'A组': { border: '#1677ff', bg: '#e6f4ff', light: '#f0f7ff', text: '#0958d9' },
  'B组': { border: '#52c41a', bg: '#f6ffed', light: '#f3fef0', text: '#389e0d' },
  'C组': { border: '#722ed1', bg: '#f9f0ff', light: '#faf5ff', text: '#531dab' },
  'D组': { border: '#fa8c16', bg: '#fff7e6', light: '#fffbf5', text: '#d46b08' },
  'E组': { border: '#eb2f96', bg: '#fff0f6', light: '#fff5fa', text: '#c41d7f' },
  'F组': { border: '#13c2c2', bg: '#e6fffb', light: '#f0fffc', text: '#08979c' },
}

const extraColors = [
  '#fa541c', '#2f54eb', '#a0d911', '#fadb14', '#f5222d', '#722ed1',
]

interface PaymentSummaryRow {
  projectId: string
  projectName: string
  groupName: string
  receivable: number
  received: number
  unpaid: number
}

function getGroupColor(name: string, index: number) {
  return groupColors[name] || {
    border: extraColors[index % extraColors.length],
    bg: `${extraColors[index % extraColors.length]}15`,
    light: `${extraColors[index % extraColors.length]}0a`,
    text: extraColors[index % extraColors.length],
  }
}

/** 根据 paymentStatus 计算已收金额：已收→全额，部分收→实收，未收/不付→0 */
function paidByStatus(r: MonthlyRecord): number {
  if (r.paymentStatus === '已收') return r.paymentAmount
  if (r.paymentStatus === '部分收') return r.paidAmount
  return 0
}

export default function Dashboard() {
  const {
    projects, accounts, monthlyRecords, issues, staff, groups, selectedMonth,
    ensureCarryOver, currentGroup,
  } = useStore()
  const navigate = useNavigate()

  // 应用启动时自动结转上月数据
  useEffect(() => {
    ensureCarryOver()
  }, [ensureCarryOver])

  const [snapshotModalOpen, setSnapshotModalOpen] = useState(false)
  const [snapshotMonth, setSnapshotMonth] = useState(selectedMonth)
  const [unpaidDetailOpen, setUnpaidDetailOpen] = useState(false)
  const [paidDetailOpen, setPaidDetailOpen] = useState(false)
  const [monthReceivedOpen, setMonthReceivedOpen] = useState(false)
  const [monthIssueOpen, setMonthIssueOpen] = useState(false)
  const isMobile = window.innerWidth <= 768

  const lastMonth = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const data = useMemo(() => {
    const activeProjects = projects.filter((p) => p.status === '进行中')
    const activeAccountCount = accounts.filter((a) => {
      const proj = activeProjects.find((p) => p.id === a.projectId)
      return proj && a.status !== '暂停'
    }).length
    const allMonthRecords = monthlyRecords.filter((r) => r.yearMonth === selectedMonth)
    const payableMonthRecords = allMonthRecords.filter((r) => r.paymentStatus !== '不付')
    const lastMonthRecords = monthlyRecords.filter((r) => r.yearMonth === lastMonth && r.paymentStatus !== '不付')

    const monthCompleted = allMonthRecords.reduce((s, r) => s + r.completedCount, 0)
    const lastMonthCompleted = lastMonthRecords.reduce((s, r) => s + r.completedCount, 0)
    const monthPlanned = allMonthRecords.reduce((s, r) => s + r.plannedCount, 0)
    const monthReceivable = payableMonthRecords.reduce((s, r) => s + r.paymentAmount, 0)
    const monthReceived = payableMonthRecords.reduce((s, r) => s + paidByStatus(r), 0)
    // 上月收款数据从 monthlyRecords 自动汇总，按 paymentStatus 计算
    const lastMonthReceivable = lastMonthRecords.reduce((s, r) => s + r.paymentAmount, 0)
    const lastMonthReceived = lastMonthRecords.reduce((s, r) => s + paidByStatus(r), 0)
    const lastMonthUnpaid = lastMonthReceivable - lastMonthReceived
    const monthUnpaid = monthReceivable - monthReceived
    const completionRate = monthPlanned > 0 ? (monthCompleted / monthPlanned) * 100 : 0
    const projectWithIssues = activeProjects.filter((p) =>
      issues.some((i) => i.projectId === p.id && i.status !== '已解决')
    )

    // 各组统计
    const groupStats = groups.map((g) => {
      const gRecords = allMonthRecords.filter((r) => {
        const proj = projects.find((p) => p.id === r.projectId)
        return proj?.groupId === g.id && r.paymentStatus !== '不付'
      })
      const gCompleted = gRecords.reduce((s, r) => s + r.completedCount, 0)
      const gPlanned = gRecords.reduce((s, r) => s + r.plannedCount, 0)
      const gReceived = gRecords.reduce((s, r) => s + paidByStatus(r), 0)
      const gReceivable = gRecords.reduce((s, r) => s + r.paymentAmount, 0)
      const gProjectCount = activeProjects.filter((p) => p.groupId === g.id).length
      const gAccountCount = accounts.filter((a) => {
        const proj = activeProjects.find((p) => p.id === a.projectId)
        return proj?.groupId === g.id && a.status !== '暂停'
      }).length
      const gHasIssues = activeProjects.filter((p) => p.groupId === g.id).filter((p) =>
        issues.some((i) => i.projectId === p.id && i.status !== '已解决')
      ).length

      // 续签率：上月有记录的项目中，本月也有记录的比例
      const lastMonthProjectIds = new Set(
        monthlyRecords.filter((r) => r.yearMonth === lastMonth).map((r) => r.projectId)
      )
      const currentMonthProjectIds = new Set(
        monthlyRecords.filter((r) => r.yearMonth === selectedMonth).map((r) => r.projectId)
      )
      const gLastMonthProjects = projects.filter(
        (p) => p.groupId === g.id && lastMonthProjectIds.has(p.id)
      )
      const gRenewed = gLastMonthProjects.filter((p) => currentMonthProjectIds.has(p.id))
      const gRenewalRate = gLastMonthProjects.length > 0
        ? (gRenewed.length / gLastMonthProjects.length) * 100
        : 0

      return {
        ...g,
        gPlanned, gCompleted, gReceived, gReceivable, gProjectCount, gAccountCount,
        gRate: gPlanned > 0 ? (gCompleted / gPlanned) * 100 : 0,
        gUnpaid: gReceivable - gReceived,
        gHasIssues,
        gRenewalRate,
        gRenewedCount: gRenewed.length,
        gLastMonthCount: gLastMonthProjects.length,
      }
    })

    // 风险预警
    const warnings: { type: string; project: string; desc: string; level: 'high' | 'mid' | 'low' }[] = []
    activeProjects.forEach((p) => {
      const d = calcProjectMonthData(p, accounts, monthlyRecords, issues, selectedMonth)
      if (d.completionRate < 50 && new Date().getDate() > 15) {
        warnings.push({ type: '进度滞后', project: p.name, desc: `本月完成率仅 ${d.completionRate.toFixed(1)}%`, level: 'high' })
      }
      if (d.monthUnpaid > 0) {
        const payDate = p.paymentDate ? ` · 收款时间: ${p.paymentDate}` : ''
        warnings.push({ type: '待收款', project: p.name, desc: `${formatMoney(d.monthUnpaid)}${payDate}`, level: 'mid' })
      }
      // 上月未收预警 - 从 monthlyRecords 自动汇总
      const pLastMonthRecords = monthlyRecords.filter(
        (r) => r.projectId === p.id && r.yearMonth === lastMonth && r.paymentStatus !== '不付'
      )
      const pLastMonthReceivable = pLastMonthRecords.reduce((s, r) => s + r.paymentAmount, 0)
      const pLastMonthReceived = pLastMonthRecords.reduce((s, r) => s + paidByStatus(r), 0)
      const pLastMonthUnpaid = pLastMonthReceivable - pLastMonthReceived
      if (pLastMonthUnpaid > 0) {
        const payDate = p.paymentDate ? ` · 收款时间: ${p.paymentDate}` : ''
        warnings.push({ type: '上月未收', project: p.name, desc: `${formatMoney(pLastMonthUnpaid)}${payDate}`, level: 'high' })
      }
      const unresolved = issues.filter((i) => i.projectId === p.id && i.status !== '已解决')
      unresolved.forEach((i) => {
        warnings.push({ type: i.type, project: p.name, desc: i.description, level: i.type === '违规' ? 'high' : 'low' })
      })
    })

    // 未收款清单
    const unpaidList = activeProjects.map((p) => {
      const d = calcProjectMonthData(p, accounts, monthlyRecords, issues, selectedMonth)
      const projGroup = groups.find((g) => g.id === p.groupId)
      return { ...p, unpaid: d.monthUnpaid, groupName: projGroup?.name || '' }
    }).filter((p) => p.unpaid > 0).sort((a, b) => b.unpaid - a.unpaid)

    // 本月已收项目明细
    const receivedList = activeProjects.map((p) => {
      const d = calcProjectMonthData(p, accounts, monthlyRecords, issues, selectedMonth)
      const projGroup = groups.find((g) => g.id === p.groupId)
      return { ...p, received: d.monthPaidAmount, receivable: d.monthPaymentAmount, groupName: projGroup?.name || '' }
    }).filter((p) => p.received > 0).sort((a, b) => b.received - a.received)

    // 有问题项目列表
    const issueProjects = projectWithIssues.map((p) => {
      const projIssues = issues.filter((i) => i.projectId === p.id && i.status !== '已解决')
      const projGroup = groups.find((g) => g.id === p.groupId)
      return { ...p, issueList: projIssues, groupName: projGroup?.name || '', issueCount: projIssues.length }
    })

    // 近6个月趋势
    const recentMonths = getRecentMonths(6)
    const trendData = recentMonths.map((m) => {
      const mRecords = monthlyRecords.filter((r) => r.yearMonth === m && r.paymentStatus !== '不付')
      return {
        month: m,
        completed: mRecords.reduce((s, r) => s + r.completedCount, 0),
        received: mRecords.reduce((s, r) => s + paidByStatus(r), 0),
      }
    })

    return {
      monthCompleted, lastMonthCompleted, monthReceivable, monthReceived,
      lastMonthReceived, lastMonthReceivable, lastMonthUnpaid,
      monthUnpaid, monthPlanned, completionRate,
      activeProjectCount: activeProjects.length,
      activeAccountCount,
      issueCount: projectWithIssues.length,
      groupStats, warnings, unpaidList, receivedList, issueProjects, trendData,
    }
  }, [projects, accounts, monthlyRecords, issues, staff, groups, selectedMonth, lastMonth])

  const handleExport = () => {
    const exportData = [{
      '月份': selectedMonth,
      '本月完成': data.monthCompleted,
      '上月完成': data.lastMonthCompleted,
      '本月计划': data.monthPlanned,
      '完成率': `${data.completionRate.toFixed(1)}%`,
      '本月应收': data.monthReceivable,
      '本月已收': data.monthReceived,
      '本月未收': data.monthUnpaid,
      '上月应收': data.lastMonthReceivable,
      '上月已收': data.lastMonthReceived,
      '上月未收': data.lastMonthUnpaid,
      '进行中账号': data.activeAccountCount,
      '有问题项目': data.issueCount,
    }]
    exportToExcel(exportData, `汇总面板_${selectedMonth}`, '汇总数据')
  }

  const completedTrend = data.monthCompleted - data.lastMonthCompleted
  const receivedTrend = data.monthReceived - data.lastMonthReceived
  const maxTrendVal = Math.max(...data.trendData.map((x) => x.completed), 1)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22 }}>{selectedMonth} 月度汇总</h2>
        <Space>
          <Button
            icon={<DollarOutlined />}
            onClick={() => {
              setSnapshotMonth(selectedMonth)
              setSnapshotModalOpen(true)
            }}
          >
            月度收款管理
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>导出Excel</Button>
        </Space>
      </div>

      {/* ===== 核心指标卡片 - 大色块 ===== */}
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
        {/* 本月完成 - 蓝色 */}
        <Col xs={12} sm={6}>
          <div style={{
            background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
            borderRadius: 12, padding: '16px 16px 12px', color: '#fff', position: 'relative', overflow: 'hidden',
          }}>
            <VideoCameraOutlined style={{ position: 'absolute', right: 12, top: 12, fontSize: 36, opacity: 0.2 }} />
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>本月完成</div>
            <div style={{ fontSize: isMobile ? 28 : 34, fontWeight: 700, lineHeight: 1.1 }}>
              {data.monthCompleted}<span style={{ fontSize: 14, fontWeight: 400, opacity: 0.8 }}> 条</span>
            </div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
              计划 {data.monthPlanned} 条 · 上月 {data.lastMonthCompleted} 条
            </div>
            {completedTrend !== 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 2,
                background: completedTrend > 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
                borderRadius: 8, padding: '1px 6px', fontSize: 11, marginTop: 4,
              }}>
                {completedTrend > 0 ? <RiseOutlined /> : <FallOutlined />}
                {Math.abs(completedTrend)}
              </div>
            )}
          </div>
        </Col>

        {/* 完成率 - 绿色/橙色 */}
        <Col xs={12} sm={6}>
          <div style={{
            background: `linear-gradient(135deg, ${data.completionRate >= 80 ? '#52c41a' : '#fa8c16'} 0%, ${data.completionRate >= 80 ? '#73d13d' : '#ffa940'} 100%)`,
            borderRadius: 12, padding: '16px 16px 12px', color: '#fff', position: 'relative', overflow: 'hidden',
          }}>
            <CheckCircleOutlined style={{ position: 'absolute', right: 12, top: 12, fontSize: 36, opacity: 0.2 }} />
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>本月完成率</div>
            <div style={{ fontSize: isMobile ? 28 : 34, fontWeight: 700, lineHeight: 1.1 }}>
              {data.completionRate.toFixed(1)}<span style={{ fontSize: 16, fontWeight: 400, opacity: 0.8 }}>%</span>
            </div>
            <div style={{ marginTop: 6 }}>
              <Progress
                percent={data.completionRate}
                showInfo={false}
                size="small"
                strokeColor={{ from: '#fff', to: 'rgba(255,255,255,0.6)' }}
                trailColor="rgba(255,255,255,0.2)"
              />
            </div>
          </div>
        </Col>

        {/* 已收款 - 绿色 */}
        <Col xs={12} sm={6}>
          <div style={{
            background: 'linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%)',
            borderRadius: 12, padding: '16px 16px 12px', color: '#fff', position: 'relative', overflow: 'hidden',
            cursor: data.monthReceived > 0 ? 'pointer' : 'default',
          }}
            onClick={() => { if (data.monthReceived > 0) setMonthReceivedOpen(true) }}
          >
            <DollarOutlined style={{ position: 'absolute', right: 12, top: 12, fontSize: 36, opacity: 0.2 }} />
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>本月已收</div>
            <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 700, lineHeight: 1.1 }}>
              ¥{data.monthReceived.toLocaleString()}<span style={{ fontSize: 14, fontWeight: 400, opacity: 0.8 }}>元</span>
            </div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
              上月 ¥{data.lastMonthReceived.toLocaleString()}元
              {data.monthReceived > 0 && <span style={{ marginLeft: 6, textDecoration: 'underline' }}>点击看明细</span>}
            </div>
            {receivedTrend !== 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 2,
                background: receivedTrend > 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
                borderRadius: 8, padding: '1px 6px', fontSize: 11, marginTop: 4,
              }}>
                {receivedTrend > 0 ? <RiseOutlined /> : <FallOutlined />}
                ¥{Math.abs(receivedTrend).toLocaleString()}
              </div>
            )}
          </div>
        </Col>

        {/* 未收款 - 红色 */}
        <Col xs={12} sm={6}>
          <div style={{
            background: data.monthUnpaid > 0
              ? 'linear-gradient(135deg, #f5222d 0%, #ff7875 100%)'
              : 'linear-gradient(135deg, #52c41a 0%, #95de64 100%)',
            borderRadius: 12, padding: '16px 16px 12px', color: '#fff', position: 'relative', overflow: 'hidden',
            cursor: data.monthUnpaid > 0 ? 'pointer' : 'default',
          }}
            onClick={() => { if (data.monthUnpaid > 0) setUnpaidDetailOpen(true) }}
          >
            <WarningOutlined style={{ position: 'absolute', right: 12, top: 12, fontSize: 36, opacity: 0.2 }} />
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>{data.monthUnpaid > 0 ? '待收款' : '全部收齐'}</div>
            <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 700, lineHeight: 1.1 }}>
              ¥{data.monthUnpaid.toLocaleString()}<span style={{ fontSize: 14, fontWeight: 400, opacity: 0.8 }}>元</span>
            </div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
              应收 ¥{data.monthReceivable.toLocaleString()}元 · {data.unpaidList.length}个项目待收
              {data.monthUnpaid > 0 && <span style={{ marginLeft: 6, textDecoration: 'underline' }}>点击看明细</span>}
            </div>
          </div>
        </Col>
      </Row>

      {/* ===== 次级指标 - 小卡片 ===== */}
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} style={{ marginTop: isMobile ? 8 : 16 }}>
        <Col xs={8}>
          <Card size="small" style={{ textAlign: 'center', borderRadius: 10, borderColor: '#d9d9d9' }}>
            <ProjectOutlined style={{ fontSize: 18, color: '#1677ff' }} />
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#262626', marginTop: 2 }}>
              {data.activeAccountCount}
            </div>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>进行中账号</div>
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" style={{
            textAlign: 'center', borderRadius: 10,
            borderColor: data.issueCount > 0 ? '#ffccc7' : '#d9d9d9',
            cursor: data.issueCount > 0 ? 'pointer' : 'default',
          }}
            onClick={() => { if (data.issueCount > 0) setMonthIssueOpen(true) }}
          >
            <AlertOutlined style={{ fontSize: 18, color: data.issueCount > 0 ? '#f5222d' : '#52c41a' }} />
            <div style={{
              fontSize: isMobile ? 20 : 24, fontWeight: 700, marginTop: 2,
              color: data.issueCount > 0 ? '#f5222d' : '#52c41a',
            }}>
              {data.issueCount}
            </div>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>有问题项目</div>
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" style={{ textAlign: 'center', borderRadius: 10, borderColor: '#d9d9d9' }}>
            <VideoCameraOutlined style={{ fontSize: 18, color: '#722ed1' }} />
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#262626', marginTop: 2 }}>
              {data.monthPlanned}
            </div>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>本月计划(条)</div>
          </Card>
        </Col>
      </Row>

      {/* ===== 上月收款情况（自动计算） ===== */}
      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WarningOutlined style={{ color: data.lastMonthUnpaid > 0 ? '#f5222d' : '#52c41a' }} />
            {lastMonth} 收款情况
            <Tag color="blue" style={{ fontSize: 11 }}>自动计算</Tag>
          </span>
        }
        size="small"
        style={{ marginTop: isMobile ? 8 : 16, borderRadius: 10, borderColor: data.lastMonthUnpaid > 0 ? '#ffd591' : '#d9d9d9' }}
        extra={
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setSnapshotMonth(lastMonth)
              setSnapshotModalOpen(true)
            }}
          >
            查看明细
          </Button>
        }
      >
        <Row gutter={[16, 8]}>
          <Col xs={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#595959' }}>¥{data.lastMonthReceivable.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>上月应收</div>
          </Col>
          <Col xs={8} style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#52c41a',
                cursor: data.lastMonthReceived > 0 ? 'pointer' : 'default',
                textDecoration: data.lastMonthReceived > 0 ? 'underline' : 'none',
                textDecorationStyle: 'dashed',
                textUnderlineOffset: 4,
              }}
              onClick={() => {
                if (data.lastMonthReceived > 0) setPaidDetailOpen(true)
              }}
            >
              ¥{data.lastMonthReceived.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>
              上月已收
              {data.lastMonthReceived > 0 && <span style={{ color: '#52c41a', marginLeft: 4 }}>点击查看</span>}
            </div>
          </Col>
          <Col xs={8} style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: data.lastMonthUnpaid > 0 ? '#f5222d' : '#52c41a',
                cursor: data.lastMonthUnpaid > 0 ? 'pointer' : 'default',
                textDecoration: data.lastMonthUnpaid > 0 ? 'underline' : 'none',
                textDecorationStyle: 'dashed',
                textUnderlineOffset: 4,
              }}
              onClick={() => {
                if (data.lastMonthUnpaid > 0) setUnpaidDetailOpen(true)
              }}
            >
              ¥{data.lastMonthUnpaid.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>
              上月未收
              {data.lastMonthUnpaid > 0 && <span style={{ color: '#1677ff', marginLeft: 4 }}>点击查看</span>}
            </div>
          </Col>
        </Row>
        {data.lastMonthUnpaid > 0 && (
          <div
            style={{
              marginTop: 8, padding: '6px 10px', background: '#fff2f0', borderRadius: 6,
              border: '1px solid #ffccc7', fontSize: 12, color: '#cf1322',
              cursor: 'pointer',
            }}
            onClick={() => setUnpaidDetailOpen(true)}
          >
            ⚠️ 上月仍有 ¥{data.lastMonthUnpaid.toLocaleString()}元 未收回，请尽快跟进收款 → 点击查看明细
          </div>
        )}
      </Card>

      {/* ===== 各组进度对比 - 三色卡片 ===== */}
      <Card title="各组本月进度" size="small" style={{ marginTop: 16, borderRadius: 10 }}>
        <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
          {data.groupStats.map((g, i) => {
            const colors = getGroupColor(g.name, i)
            const isOwnGroup = currentGroup && g.id === currentGroup
            return (
              <Col xs={24} sm={8} key={g.id}>
                <div style={{
                  background: colors.light,
                  borderRadius: 10,
                  padding: 12,
                  borderLeft: isOwnGroup ? `6px solid ${colors.border}` : `4px solid ${colors.border}`,
                  boxShadow: isOwnGroup ? `0 0 12px ${colors.border}30` : undefined,
                  opacity: isOwnGroup ? 1 : 0.75,
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                  onClick={() => navigate(`/overview?group=${g.id}`)}
                  title={`点击查看${g.name}全部项目`}
                >
                  {/* 组名 + 项目数 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: colors.border, display: 'inline-block',
                      }} />
                      <strong style={{ fontSize: 15, color: colors.text }}>{g.name}</strong>
                      {isOwnGroup && (
                        <Tag color="blue" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>
                          我的组
                        </Tag>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: '#8c8c8c' }}>{g.gAccountCount} 个账号</span>
                  </div>

                  {/* 完成数 大字 */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                    <span style={{ fontSize: 28, fontWeight: 700, color: colors.text }}>{g.gCompleted}</span>
                    <span style={{ fontSize: 14, color: '#8c8c8c' }}>/ {g.gPlanned} 条</span>
                    {g.gHasIssues > 0 && (
                      <Tag color="red" style={{ fontSize: 10, marginLeft: 'auto', marginInlineEnd: 0 }}>
                        {g.gHasIssues}个问题
                      </Tag>
                    )}
                  </div>

                  {/* 进度条 */}
                  <Progress
                    percent={g.gRate}
                    size="small"
                    showInfo={false}
                    strokeColor={colors.border}
                    trailColor={`${colors.border}20`}
                  />

                  {/* 收款信息 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
                    <span style={{ color: '#595959' }}>
                      已收 <strong style={{ color: '#13c2c2' }}>¥{g.gReceived.toLocaleString()}元</strong>
                    </span>
                    {g.gUnpaid > 0 && (
                      <span style={{ color: '#f5222d' }}>
                        待收 ¥{g.gUnpaid.toLocaleString()}元
                      </span>
                    )}
                  </div>

                  {/* 完成率标签 */}
                  <div style={{ marginTop: 6 }}>
                    <Tag style={{
                      background: colors.bg,
                      border: `1px solid ${colors.border}40`,
                      color: colors.text,
                      fontSize: 12, fontWeight: 600,
                    }}>
                      完成率 {g.gRate.toFixed(1)}%
                    </Tag>
                  </div>
                </div>
              </Col>
            )
          })}
        </Row>
      </Card>

      {/* ===== 三组对比分析 ===== */}
      <Card title="各组对比分析" size="small" style={{ marginTop: 16, borderRadius: 10 }}>
        {/* 1. 本月合作项目数对比 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#595959', marginBottom: 10 }}>
            📊 本月合作项目数
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {data.groupStats.map((g, i) => {
              const colors = getGroupColor(g.name, i)
              const maxCount = Math.max(...data.groupStats.map((x) => x.gProjectCount), 1)
              const widthPct = (g.gProjectCount / maxCount) * 100
              const isOwnGroup = currentGroup && g.id === currentGroup
              return (
                <div key={g.id} style={{ flex: 1, minWidth: 120, opacity: isOwnGroup ? 1 : 0.75, transition: 'opacity 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: isOwnGroup ? 700 : 600, color: colors.text }}>
                      {g.name}{isOwnGroup ? <span style={{ fontSize: 10, color: colors.border, marginLeft: 4 }}>●</span> : ''}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>{g.gProjectCount}<span style={{ fontSize: 11, color: '#8c8c8c' }}>个</span></span>
                  </div>
                  <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${widthPct}%`, height: '100%', background: colors.border, borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 2. 本月总合作费用对比（回款+未回款） */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#595959', marginBottom: 10 }}>
            💰 本月合作费用（已收 / 未收）
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {data.groupStats.map((g, i) => {
              const colors = getGroupColor(g.name, i)
              const maxFee = Math.max(...data.groupStats.map((x) => x.gReceivable), 1)
              const receivedPct = g.gReceivable > 0 ? (g.gReceived / g.gReceivable) * 100 : 0
              const unpaidPct = g.gReceivable > 0 ? (g.gUnpaid / g.gReceivable) * 100 : 0
              const barWidth = (g.gReceivable / maxFee) * 100
              const isOwnGroup = currentGroup && g.id === currentGroup
              return (
                <div key={g.id} style={{ flex: 1, minWidth: 140, opacity: isOwnGroup ? 1 : 0.75, transition: 'opacity 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: isOwnGroup ? 700 : 600, color: colors.text }}>
                      {g.name}{isOwnGroup ? <span style={{ fontSize: 10, color: colors.border, marginLeft: 4 }}>●</span> : ''}
                    </span>
                    <span style={{ fontSize: 12, color: '#595959' }}>¥{g.gReceivable.toLocaleString()}</span>
                  </div>
                  {/* 堆叠条 */}
                  <div style={{ height: 16, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${barWidth * receivedPct / 100}%`, height: '100%', background: '#52c41a', borderRadius: '4px 0 0 4px' }} />
                    <div style={{ width: `${barWidth * unpaidPct / 100}%`, height: '100%', background: '#f5222d' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
                    <span style={{ color: '#52c41a' }}>已收 ¥{g.gReceived.toLocaleString()}</span>
                    {g.gUnpaid > 0 && <span style={{ color: '#f5222d' }}>未收 ¥{g.gUnpaid.toLocaleString()}</span>}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 11, color: '#8c8c8c' }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#52c41a', borderRadius: 2, marginRight: 4 }} />已收回款</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#f5222d', borderRadius: 2, marginRight: 4 }} />未收回款</span>
          </div>
        </div>

        {/* 3. 续签率 */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#595959', marginBottom: 10 }}>
            🔄 续签率（上月项目本月继续合作）
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {data.groupStats.map((g, i) => {
              const colors = getGroupColor(g.name, i)
              const isOwnGroup = currentGroup && g.id === currentGroup
              return (
                <div key={g.id} style={{
                  flex: 1, minWidth: 120,
                  background: colors.light, borderRadius: 8, padding: '8px 12px',
                  borderLeft: isOwnGroup ? `5px solid ${colors.border}` : `3px solid ${colors.border}`,
                  opacity: isOwnGroup ? 1 : 0.75,
                  boxShadow: isOwnGroup ? `0 0 10px ${colors.border}20` : undefined,
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>{g.name}</span>
                    <span style={{
                      fontSize: 18, fontWeight: 700,
                      color: g.gRenewalRate >= 80 ? '#52c41a' : g.gRenewalRate >= 50 ? '#fa8c16' : '#f5222d',
                    }}>
                      {g.gRenewalRate.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                    {g.gRenewedCount}/{g.gLastMonthCount} 个项目续签
                  </div>
                  <Progress
                    percent={g.gRenewalRate}
                    size="small"
                    showInfo={false}
                    strokeColor={g.gRenewalRate >= 80 ? '#52c41a' : g.gRenewalRate >= 50 ? '#fa8c16' : '#f5222d'}
                    trailColor="#f0f0f0"
                    style={{ marginTop: 4 }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* ===== 6月趋势 ===== */}
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} style={{ marginTop: 16 }}>
        {/* 6个月趋势 - 渐变柱状图 */}
        <Col xs={24}>
          <Card title="近6个月完成趋势" size="small" style={{ borderRadius: 10, height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, padding: '0 4px' }}>
              {data.trendData.map((t, i) => {
                const h = (t.completed / maxTrendVal) * 100
                const isCurrent = i === data.trendData.length - 1
                return (
                  <Tooltip key={t.month} title={`${t.month} | 完成 ${t.completed} 条 | 收款 ¥${t.received.toLocaleString()}`}>
                    <div style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: isCurrent ? '#1677ff' : '#595959' }}>
                        {t.completed}
                      </div>
                      <div style={{
                        height: `${h}%`,
                        background: isCurrent
                          ? 'linear-gradient(180deg, #1677ff 0%, #69b1ff 100%)'
                          : 'linear-gradient(180deg, #91caff 0%, #bae0ff 100%)',
                        borderRadius: '6px 6px 0 0',
                        minHeight: 4,
                        transition: 'height 0.3s',
                        boxShadow: isCurrent ? '0 0 8px rgba(22,119,255,0.3)' : 'none',
                      }} />
                      <div style={{ fontSize: 10, color: isCurrent ? '#1677ff' : '#8c8c8c', marginTop: 4, fontWeight: isCurrent ? 600 : 400 }}>
                        {t.month.slice(5)}月
                      </div>
                    </div>
                  </Tooltip>
                )
              })}
            </div>
          </Card>
        </Col>
      </Row>

      {/* ===== 风险预警 ===== */}
      {data.warnings.length > 0 && (
        <Card
          title={<span><AlertOutlined style={{ color: '#f5222d' }} /> 风险预警 <Tag color="red" style={{ marginLeft: 8 }}>{data.warnings.length}</Tag></span>}
          size="small"
          style={{ marginTop: 16, borderRadius: 10, borderColor: '#ffccc7' }}
        >
          {data.warnings.map((w, i) => {
            const colorMap = {
              high: { bg: '#fff2f0', border: '#ffccc7', tag: 'red' },
              mid: { bg: '#fff7e6', border: '#ffd591', tag: 'orange' },
              low: { bg: '#fffbe6', border: '#ffe58f', tag: 'gold' },
            }
            const c = colorMap[w.level]
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', marginBottom: i < data.warnings.length - 1 ? 6 : 0,
                background: c.bg, borderRadius: 6, border: `1px solid ${c.border}`,
              }}>
                <Tag color={c.tag} style={{ margin: 0, minWidth: 56, textAlign: 'center' }}>{w.type}</Tag>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{w.project}</span>
                <span style={{ color: '#595959', fontSize: 12, marginLeft: 'auto' }}>{w.desc}</span>
              </div>
            )
          })}
        </Card>
      )}

      {/* ===== 未收款清单 ===== */}
      {data.unpaidList.length > 0 && (
        <Card title={`本月未收款清单 · 共 ${data.unpaidList.length} 个项目`} size="small" style={{ marginTop: 16, borderRadius: 10 }}>
          <Table
            dataSource={data.unpaidList}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              {
                title: '组', dataIndex: 'groupName', width: 60,
                render: (g: string) => {
                  const idx = groups.findIndex((gr) => gr.name === g)
                  const c = idx >= 0 ? getGroupColor(g, idx) : null
                  return c ? (
                    <span style={{
                      display: 'inline-block', padding: '1px 8px', borderRadius: 4,
                      background: c.bg, color: c.text, fontSize: 12, fontWeight: 600,
                    }}>{g}</span>
                  ) : g
                },
              },
              { title: '项目', dataIndex: 'name', width: 140, render: (n: string) => <span style={{ fontWeight: 700, fontSize: 14 }}>{n}</span> },
              { title: '对接人', dataIndex: 'contactName', width: 80 },
              {
                title: '未收金额', dataIndex: 'unpaid',
                render: (v: number) => (
                  <span style={{ color: '#f5222d', fontWeight: 700, fontSize: 15 }}>
                    {formatMoney(v)}
                  </span>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* ===== 月度收款明细 Modal ===== */}
      <Modal
        title={
          <Space>
            <DollarOutlined />
            {snapshotMonth} 收款明细
            <Tag color="blue">自动计算</Tag>
          </Space>
        }
        open={snapshotModalOpen}
        onCancel={() => setSnapshotModalOpen(false)}
        width={isMobile ? '95%' : 900}
        footer={[
          <Button key="close" onClick={() => setSnapshotModalOpen(false)}>关闭</Button>,
        ]}
      >
        {/* 月份选择 */}
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#595959' }}>选择月份：</span>
          <Select
            size="small"
            value={snapshotMonth}
            onChange={setSnapshotMonth}
            style={{ width: 120 }}
            options={getRecentMonths(6).map((m) => ({ label: m, value: m }))}
          />
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            数据根据该月各项目的 monthlyRecords 自动汇总，应收/未收不可手动锁定
          </span>
        </div>

        {(() => {
          // 按项目聚合 monthlyRecords
          const monthRecords = monthlyRecords.filter(
            (r) => r.yearMonth === snapshotMonth && r.paymentStatus !== '不付'
          )
          const projectMap = new Map<string, PaymentSummaryRow>()
          monthRecords.forEach((r) => {
            const p = projects.find((proj) => proj.id === r.projectId)
            if (!p) return
            const g = groups.find((gr) => gr.id === p.groupId)
            const key = p.id
            const paid = paidByStatus(r)
            const existing = projectMap.get(key)
            if (existing) {
              existing.receivable += r.paymentAmount
              existing.received += paid
              existing.unpaid = existing.receivable - existing.received
            } else {
              projectMap.set(key, {
                projectId: p.id,
                projectName: p.name,
                groupName: g?.name || '',
                receivable: r.paymentAmount,
                received: paid,
                unpaid: r.paymentAmount - paid,
              })
            }
          })
          const rows = Array.from(projectMap.values()).sort((a, b) => b.unpaid - a.unpaid)
          const totalReceivable = rows.reduce((s, x) => s + x.receivable, 0)
          const totalReceived = rows.reduce((s, x) => s + x.received, 0)
          const totalUnpaid = rows.reduce((s, x) => s + x.unpaid, 0)

          return (
            <>
              <Table<PaymentSummaryRow>
                dataSource={rows}
                rowKey="projectId"
                size="small"
                pagination={false}
                scroll={{ y: 400 }}
                columns={[
                  {
                    title: '项目', width: 150,
                    render: (_, record) => (
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{record.projectName}</span>
                        <div style={{ fontSize: 11, color: '#8c8c8c' }}>{record.groupName}</div>
                      </div>
                    ),
                  },
                  {
                    title: '应收', width: 110,
                    render: (_, record) => (
                      <span>¥{record.receivable.toLocaleString()}</span>
                    ),
                  },
                  {
                    title: '已收', width: 110,
                    render: (_, record) => (
                      <span style={{ color: '#52c41a' }}>¥{record.received.toLocaleString()}</span>
                    ),
                  },
                  {
                    title: '未收', width: 110,
                    render: (_, record) => (
                      <span style={{ color: record.unpaid > 0 ? '#f5222d' : '#52c41a', fontWeight: 600 }}>
                        ¥{record.unpaid.toLocaleString()}
                      </span>
                    ),
                  },
                ]}
              />
              <div style={{ marginTop: 12, padding: '10px 16px', background: '#fafafa', borderRadius: 8, display: 'flex', gap: 32, fontSize: 13 }}>
                <span>应收 <strong>¥{totalReceivable.toLocaleString()}</strong></span>
                <span style={{ color: '#52c41a' }}>已收 <strong>¥{totalReceived.toLocaleString()}</strong></span>
                <span style={{ color: totalUnpaid > 0 ? '#f5222d' : '#52c41a' }}>未收 <strong>¥{totalUnpaid.toLocaleString()}</strong></span>
              </div>
            </>
          )
        })()}
      </Modal>
      {/* ===== 上月未收明细 Modal ===== */}
      <Modal
        title={
          <Space>
            <WarningOutlined style={{ color: '#f5222d' }} />
            {lastMonth} 未收款明细
            <Tag color="red">{data.lastMonthUnpaid > 0 ? `待收 ¥${data.lastMonthUnpaid.toLocaleString()}` : '全部收齐'}</Tag>
          </Space>
        }
        open={unpaidDetailOpen}
        onCancel={() => setUnpaidDetailOpen(false)}
        width={isMobile ? '95%' : 900}
        footer={[
          <Button key="close" onClick={() => setUnpaidDetailOpen(false)}>关闭</Button>,
        ]}
      >
        {(() => {
          // 筛选上月所有非"不付"的 monthlyRecords，按项目聚合未收明细
          const lastMonthRecords = monthlyRecords.filter(
            (r) => r.yearMonth === lastMonth && r.paymentStatus !== '不付'
          )
          // 按项目分组
          const projectMap = new Map<string, {
            projectName: string
            groupName: string
            records: typeof lastMonthRecords
            totalReceivable: number
            totalReceived: number
            totalUnpaid: number
            totalPlanned: number
            totalCompleted: number
          }>()
          lastMonthRecords.forEach((r) => {
            const p = projects.find((proj) => proj.id === r.projectId)
            if (!p) return
            const g = groups.find((gr) => gr.id === p.groupId)
            const key = p.id
            const paid = paidByStatus(r)
            const existing = projectMap.get(key)
            if (existing) {
              existing.records.push(r)
              existing.totalReceivable += r.paymentAmount
              existing.totalReceived += paid
              existing.totalUnpaid += Math.max(r.paymentAmount - paid, 0)
              existing.totalPlanned += r.plannedCount
              existing.totalCompleted += r.completedCount
            } else {
              projectMap.set(key, {
                projectName: p.name,
                groupName: g?.name || '',
                records: [r],
                totalReceivable: r.paymentAmount,
                totalReceived: paid,
                totalUnpaid: Math.max(r.paymentAmount - paid, 0),
                totalPlanned: r.plannedCount,
                totalCompleted: r.completedCount,
              })
            }
          })
          // 只显示有未收金额的项目
          const unpaidProjects = Array.from(projectMap.values())
            .filter((p) => p.totalUnpaid > 0)
            .sort((a, b) => b.totalUnpaid - a.totalUnpaid)

          if (unpaidProjects.length === 0) {
            return (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#52c41a', fontSize: 16 }}>
                <CheckCircleOutlined style={{ fontSize: 40, marginBottom: 12 }} />
                <div>上月所有款项已全部收齐</div>
              </div>
            )
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {unpaidProjects.map((proj, idx) => {
                const gIdx = groups.findIndex((gr) => gr.name === proj.groupName)
                const gColor = gIdx >= 0 ? getGroupColor(proj.groupName, gIdx) : null
                return (
                  <div
                    key={idx}
                    style={{
                      border: `1px solid ${gColor ? gColor.border + '40' : '#ffd591'}`,
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}
                  >
                    {/* 项目标题栏 */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: gColor ? gColor.light : '#fffbe6',
                      borderBottom: `1px solid ${gColor ? gColor.border + '20' : '#ffe58f'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {gColor && (
                          <span style={{
                            display: 'inline-block', padding: '1px 8px', borderRadius: 4,
                            background: gColor.bg, color: gColor.text, fontSize: 12, fontWeight: 600,
                          }}>{proj.groupName}</span>
                        )}
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#262626' }}>{proj.projectName}</span>
                      </div>
                      <span style={{ color: '#f5222d', fontWeight: 700, fontSize: 15 }}>
                        未收 ¥{proj.totalUnpaid.toLocaleString()}
                      </span>
                    </div>

                    {/* 账号明细表 */}
                    <Table
                      dataSource={proj.records}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      style={{ background: '#fff' }}
                      columns={[
                        {
                          title: '账号',
                          dataIndex: 'accountId',
                          width: isMobile ? 100 : 130,
                          render: (accId: string) => {
                            const acc = accounts.find((a) => a.id === accId)
                            return (
                              <span style={{ fontWeight: 600, fontSize: 13 }}>
                                {acc?.name || '未知账号'}
                              </span>
                            )
                          },
                        },
                        {
                          title: '视频数量',
                          width: isMobile ? 90 : 110,
                          align: 'center' as const,
                          render: (_: unknown, record: MonthlyRecord) => (
                            <div style={{ fontSize: 12 }}>
                              <span style={{ color: '#595959' }}>
                                完成 <strong style={{ color: '#1677ff', fontSize: 14 }}>{record.completedCount}</strong>
                              </span>
                              <span style={{ color: '#bfbfbf', margin: '0 2px' }}>/</span>
                              <span style={{ color: '#8c8c8c' }}>计划 {record.plannedCount}</span>
                            </div>
                          ),
                        },
                        {
                          title: '应收',
                          dataIndex: 'paymentAmount',
                          width: 80,
                          align: 'right' as const,
                          render: (v: number) => <span>¥{v.toLocaleString()}</span>,
                        },
                        {
                          title: '已收',
                          width: 80,
                          align: 'right' as const,
                          render: (_: unknown, record: MonthlyRecord) => {
                            const paid = paidByStatus(record)
                            return (
                              <span style={{ color: '#52c41a' }}>¥{paid.toLocaleString()}</span>
                            )
                          },
                        },
                        {
                          title: '未收',
                          width: 90,
                          align: 'right' as const,
                          render: (_: unknown, record: MonthlyRecord) => {
                            const unpaid = record.paymentAmount - paidByStatus(record)
                            return (
                              <span style={{ color: unpaid > 0 ? '#f5222d' : '#52c41a', fontWeight: 700 }}>
                                ¥{unpaid.toLocaleString()}
                              </span>
                            )
                          },
                        },
                        {
                          title: '状态',
                          dataIndex: 'paymentStatus',
                          width: 70,
                          align: 'center' as const,
                          render: (status: string) => {
                            const colorMap: Record<string, string> = {
                              '未收': 'red',
                              '部分收': 'orange',
                              '已收': 'green',
                              '不付': 'default',
                            }
                            return <Tag color={colorMap[status] || 'default'} style={{ margin: 0, fontSize: 11 }}>{status}</Tag>
                          },
                        },
                      ]}
                    />

                    {/* 项目汇总 */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 12px', background: '#fafafa', fontSize: 12, color: '#595959',
                    }}>
                      <span>
                        合计 · 完成 <strong style={{ color: '#1677ff' }}>{proj.totalCompleted}</strong> / {proj.totalPlanned} 条
                      </span>
                      <span>
                        应收 ¥{proj.totalReceivable.toLocaleString()} · 已收 ¥{proj.totalReceived.toLocaleString()} · 未收 <strong style={{ color: '#f5222d' }}>¥{proj.totalUnpaid.toLocaleString()}</strong>
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* 总计 */}
              <div style={{
                padding: '10px 16px', background: '#fff2f0', borderRadius: 8,
                border: '1px solid #ffccc7', display: 'flex', justifyContent: 'space-between',
                fontSize: 14, fontWeight: 600,
              }}>
                <span>共 {unpaidProjects.length} 个项目未收款</span>
                <span style={{ color: '#f5222d' }}>
                  未收合计 ¥{data.lastMonthUnpaid.toLocaleString()}
                </span>
              </div>
            </div>
          )
        })()}
      </Modal>
      {/* ===== 上月已收明细 Modal ===== */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            {lastMonth} 已收款明细
            <Tag color="green">已收 ¥{data.lastMonthReceived.toLocaleString()}</Tag>
          </Space>
        }
        open={paidDetailOpen}
        onCancel={() => setPaidDetailOpen(false)}
        width={isMobile ? '95%' : 900}
        footer={[
          <Button key="close" onClick={() => setPaidDetailOpen(false)}>关闭</Button>,
        ]}
      >
        {(() => {
          const lastMonthRecords = monthlyRecords.filter(
            (r) => r.yearMonth === lastMonth && r.paymentStatus !== '不付'
          )
          const projectMap = new Map<string, {
            projectName: string
            groupName: string
            records: typeof lastMonthRecords
            totalReceivable: number
            totalReceived: number
            totalUnpaid: number
            totalPlanned: number
            totalCompleted: number
          }>()
          lastMonthRecords.forEach((r) => {
            const p = projects.find((proj) => proj.id === r.projectId)
            if (!p) return
            const g = groups.find((gr) => gr.id === p.groupId)
            const key = p.id
            const paid = paidByStatus(r)
            const existing = projectMap.get(key)
            if (existing) {
              existing.records.push(r)
              existing.totalReceivable += r.paymentAmount
              existing.totalReceived += paid
              existing.totalUnpaid += Math.max(r.paymentAmount - paid, 0)
              existing.totalPlanned += r.plannedCount
              existing.totalCompleted += r.completedCount
            } else {
              projectMap.set(key, {
                projectName: p.name,
                groupName: g?.name || '',
                records: [r],
                totalReceivable: r.paymentAmount,
                totalReceived: paid,
                totalUnpaid: Math.max(r.paymentAmount - paid, 0),
                totalPlanned: r.plannedCount,
                totalCompleted: r.completedCount,
              })
            }
          })
          const paidProjects = Array.from(projectMap.values())
            .filter((p) => p.totalReceived > 0)
            .sort((a, b) => b.totalReceived - a.totalReceived)

          if (paidProjects.length === 0) {
            return (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c', fontSize: 16 }}>
                <WarningOutlined style={{ fontSize: 40, marginBottom: 12 }} />
                <div>上月无已收款记录</div>
              </div>
            )
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {paidProjects.map((proj, idx) => {
                const gIdx = groups.findIndex((gr) => gr.name === proj.groupName)
                const gColor = gIdx >= 0 ? getGroupColor(proj.groupName, gIdx) : null
                return (
                  <div
                    key={idx}
                    style={{
                      border: `1px solid ${gColor ? gColor.border + '40' : '#b7eb8f'}`,
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: gColor ? gColor.light : '#f6ffed',
                      borderBottom: `1px solid ${gColor ? gColor.border + '20' : '#d9f7be'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {gColor && (
                          <span style={{
                            display: 'inline-block', padding: '1px 8px', borderRadius: 4,
                            background: gColor.bg, color: gColor.text, fontSize: 12, fontWeight: 600,
                          }}>{proj.groupName}</span>
                        )}
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#262626' }}>{proj.projectName}</span>
                      </div>
                      <span style={{ color: '#52c41a', fontWeight: 700, fontSize: 15 }}>
                        已收 ¥{proj.totalReceived.toLocaleString()}
                      </span>
                    </div>

                    <Table
                      dataSource={proj.records}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      style={{ background: '#fff' }}
                      columns={[
                        {
                          title: '账号',
                          dataIndex: 'accountId',
                          width: isMobile ? 100 : 130,
                          render: (accId: string) => {
                            const acc = accounts.find((a) => a.id === accId)
                            return (
                              <span style={{ fontWeight: 600, fontSize: 13 }}>
                                {acc?.name || '未知账号'}
                              </span>
                            )
                          },
                        },
                        {
                          title: '视频数量',
                          width: isMobile ? 90 : 110,
                          align: 'center' as const,
                          render: (_: unknown, record: MonthlyRecord) => (
                            <div style={{ fontSize: 12 }}>
                              <span style={{ color: '#595959' }}>
                                完成 <strong style={{ color: '#1677ff', fontSize: 14 }}>{record.completedCount}</strong>
                              </span>
                              <span style={{ color: '#bfbfbf', margin: '0 2px' }}>/</span>
                              <span style={{ color: '#8c8c8c' }}>计划 {record.plannedCount}</span>
                            </div>
                          ),
                        },
                        {
                          title: '应收',
                          dataIndex: 'paymentAmount',
                          width: 80,
                          align: 'right' as const,
                          render: (v: number) => <span>¥{v.toLocaleString()}</span>,
                        },
                        {
                          title: '已收',
                          width: 80,
                          align: 'right' as const,
                          render: (_: unknown, record: MonthlyRecord) => {
                            const paid = paidByStatus(record)
                            return (
                              <span style={{ color: '#52c41a', fontWeight: 600 }}>¥{paid.toLocaleString()}</span>
                            )
                          },
                        },
                        {
                          title: '未收',
                          width: 90,
                          align: 'right' as const,
                          render: (_: unknown, record: MonthlyRecord) => {
                            const unpaid = record.paymentAmount - paidByStatus(record)
                            return (
                              <span style={{ color: unpaid > 0 ? '#f5222d' : '#bfbfbf' }}>
                                ¥{unpaid.toLocaleString()}
                              </span>
                            )
                          },
                        },
                        {
                          title: '状态',
                          dataIndex: 'paymentStatus',
                          width: 70,
                          align: 'center' as const,
                          render: (status: string) => {
                            const colorMap: Record<string, string> = {
                              '未收': 'red',
                              '部分收': 'orange',
                              '已收': 'green',
                              '不付': 'default',
                            }
                            return <Tag color={colorMap[status] || 'default'} style={{ margin: 0, fontSize: 11 }}>{status}</Tag>
                          },
                        },
                      ]}
                    />

                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 12px', background: '#fafafa', fontSize: 12, color: '#595959',
                    }}>
                      <span>
                        合计 · 完成 <strong style={{ color: '#1677ff' }}>{proj.totalCompleted}</strong> / {proj.totalPlanned} 条
                      </span>
                      <span>
                        应收 ¥{proj.totalReceivable.toLocaleString()} · 已收 <strong style={{ color: '#52c41a' }}>¥{proj.totalReceived.toLocaleString()}</strong> · 未收 ¥{proj.totalUnpaid.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )
              })}

              <div style={{
                padding: '10px 16px', background: '#f6ffed', borderRadius: 8,
                border: '1px solid #b7eb8f', display: 'flex', justifyContent: 'space-between',
                fontSize: 14, fontWeight: 600,
              }}>
                <span>共 {paidProjects.length} 个项目已收款</span>
                <span style={{ color: '#52c41a' }}>
                  已收合计 ¥{data.lastMonthReceived.toLocaleString()}
                </span>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ===== 本月已收明细 Modal ===== */}
      <Modal
        title={<Space><DollarOutlined style={{ color: '#13c2c2' }} />{selectedMonth} 已收款明细<Tag color="green">¥{data.monthReceived.toLocaleString()}</Tag></Space>}
        open={monthReceivedOpen}
        onCancel={() => setMonthReceivedOpen(false)}
        width={isMobile ? '95%' : 800}
        footer={<Button onClick={() => setMonthReceivedOpen(false)}>关闭</Button>}
      >
        {data.receivedList.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#bfbfbf', padding: 30 }}>本月无已收款记录</div>
        ) : (
          <Table
            dataSource={data.receivedList}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: '组', dataIndex: 'groupName', width: 60, render: (g: string) => {
                const idx = groups.findIndex((gr) => gr.name === g)
                const c = idx >= 0 ? getGroupColor(g, idx) : null
                return c ? <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 4, background: c.bg, color: c.text, fontSize: 12, fontWeight: 600 }}>{g}</span> : g
              }},
              { title: '项目', dataIndex: 'name', width: 160, render: (n: string) => <span style={{ fontWeight: 700, fontSize: 14 }}>{n}</span> },
              { title: '对接人', dataIndex: 'contactName', width: 80 },
              { title: '本月应收', width: 110, render: (_: any, r: any) => <span style={{ color: '#595959', fontWeight: 600 }}>¥{r.receivable.toLocaleString()}</span> },
              { title: '本月已收', width: 110, render: (_: any, r: any) => <span style={{ color: '#13c2c2', fontWeight: 700, fontSize: 15 }}>¥{r.received.toLocaleString()}</span> },
              { title: '收款状态', width: 80, render: (_: any, r: any) => r.receivable <= r.received ? <Tag color="green">已收齐</Tag> : <Tag color="orange">部分收</Tag> },
            ]}
          />
        )}
      </Modal>

      {/* ===== 本月待收明细 Modal ===== */}
      <Modal
        title={<Space><WarningOutlined style={{ color: '#f5222d' }} />{selectedMonth} 待收款明细<Tag color="red">{data.unpaidList.length}个项目</Tag></Space>}
        open={unpaidDetailOpen}
        onCancel={() => setUnpaidDetailOpen(false)}
        width={isMobile ? '95%' : 800}
        footer={<Button onClick={() => setUnpaidDetailOpen(false)}>关闭</Button>}
      >
        {data.unpaidList.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#52c41a', padding: 30, fontSize: 16 }}>本月款项已全部收齐</div>
        ) : (
          <Table
            dataSource={data.unpaidList}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: '组', dataIndex: 'groupName', width: 60, render: (g: string) => {
                const idx = groups.findIndex((gr) => gr.name === g)
                const c = idx >= 0 ? getGroupColor(g, idx) : null
                return c ? <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 4, background: c.bg, color: c.text, fontSize: 12, fontWeight: 600 }}>{g}</span> : g
              }},
              { title: '项目', dataIndex: 'name', width: 160, render: (n: string) => <span style={{ fontWeight: 700, fontSize: 14 }}>{n}</span> },
              { title: '对接人', dataIndex: 'contactName', width: 80 },
              { title: '待收金额', dataIndex: 'unpaid', render: (v: number) => <span style={{ color: '#f5222d', fontWeight: 700, fontSize: 15 }}>{formatMoney(v)}</span> },
            ]}
          />
        )}
        <div style={{ marginTop: 12, textAlign: 'right', color: '#8c8c8c', fontSize: 12 }}>
          待收合计：<strong style={{ color: '#f5222d', fontSize: 15 }}>¥{data.monthUnpaid.toLocaleString()}</strong>
        </div>
      </Modal>

      {/* ===== 有问题项目明细 Modal ===== */}
      <Modal
        title={<Space><AlertOutlined style={{ color: '#f5222d' }} />有问题项目明细<Tag color="red">{data.issueCount}个</Tag></Space>}
        open={monthIssueOpen}
        onCancel={() => setMonthIssueOpen(false)}
        width={isMobile ? '95%' : 800}
        footer={<Button onClick={() => setMonthIssueOpen(false)}>关闭</Button>}
      >
        {data.issueProjects.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#52c41a', padding: 30, fontSize: 16 }}>所有项目运行正常</div>
        ) : (
          data.issueProjects.map((p: any) => (
            <div key={p.id} style={{
              padding: 12, marginBottom: 8, background: '#fff2f0', borderRadius: 8, border: '1px solid #ffccc7',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</span>
                <Tag>{p.groupName}</Tag>
                <span style={{ fontSize: 12, color: '#8c8c8c' }}>{p.contactName}</span>
                <span style={{ marginLeft: 'auto', color: '#f5222d', fontWeight: 600, fontSize: 13 }}>{p.issueCount}个问题</span>
              </div>
              {p.issueList.map((iss: any) => (
                <div key={iss.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px',
                  background: '#fff', borderRadius: 4, marginBottom: 4, fontSize: 13,
                }}>
                  <Tag color={iss.type === '违规' ? 'red' : iss.type === '进度' ? 'orange' : 'default'} style={{ margin: 0, fontSize: 11 }}>
                    {iss.type}
                  </Tag>
                  <span style={{ color: '#595959' }}>{iss.description}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#bfbfbf' }}>{iss.reportedAt}</span>
                </div>
              ))}
            </div>
          ))
        )}
      </Modal>
    </div>
  )
}
