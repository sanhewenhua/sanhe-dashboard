import { useMemo, useState } from 'react'
import { Card, Tag, Table, Select, Space, Tooltip, Progress, Empty, Typography, Row, Col } from 'antd'
import { useNavigate } from 'react-router-dom'
import {
  TrophyOutlined, RiseOutlined, StarOutlined,
  DollarOutlined, FireOutlined, TagsOutlined,
  SafetyCertificateOutlined, HistoryOutlined, WarningOutlined,
  FilterOutlined, ArrowRightOutlined,
} from '@ant-design/icons'
import { useStore } from '../store/useStore'
import { calcProjectQualityRanking, formatMoney } from '../utils/helpers'
import type { ProjectQualityScore } from '../utils/helpers'

const { Text } = Typography

// 档次颜色
const tierConfig: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode; label: string }> = {
  '优质': {
    bg: 'linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%)',
    border: '#ffd666',
    text: '#d48806',
    icon: <TrophyOutlined style={{ color: '#faad14' }} />,
    label: '优质',
  },
  '良好': {
    bg: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
    border: '#95de64',
    text: '#389e0d',
    icon: <StarOutlined style={{ color: '#52c41a' }} />,
    label: '良好',
  },
  '一般': {
    bg: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
    border: '#91d5ff',
    text: '#096dd9',
    icon: <RiseOutlined style={{ color: '#1677ff' }} />,
    label: '一般',
  },
  '劣质': {
    bg: 'linear-gradient(135deg, #fff2f0 0%, #ffccc7 100%)',
    border: '#ffa39e',
    text: '#cf1322',
    icon: <WarningOutlined style={{ color: '#f5222d' }} />,
    label: '劣质',
  },
}

const groupColors: Record<string, string> = {
  'A组': '#1677ff', 'B组': '#52c41a', 'C组': '#722ed1',
  'D组': '#fa8c16', 'E组': '#eb2f96', 'F组': '#13c2c2',
}

function getGroupColor(name: string): string {
  return groupColors[name] || '#8c8c8c'
}

// 维度信息
const dimensions = [
  { key: 'totalPriceScore' as const, label: '总价', max: 30, icon: <DollarOutlined />, color: '#faad14', desc: '月费总收入规模' },
  { key: 'unitPriceScore' as const, label: '单价', max: 30, icon: <TagsOutlined />, color: '#1677ff', desc: '月费÷产出 vs 全局均价' },
  { key: 'cooperationScore' as const, label: '稳定力', max: 20, icon: <HistoryOutlined />, color: '#722ed1', desc: '合作时长价值（首次→深度）' },
  { key: 'paymentScore' as const, label: '回款', max: 10, icon: <SafetyCertificateOutlined />, color: '#52c41a', desc: '回款健康度' },
  { key: 'roiScore' as const, label: '回报', max: 10, icon: <FireOutlined />, color: '#f5222d', desc: '人均产值回报' },
]

// 排行榜数字样式
const rankBadgeColors: Record<number, { bg: string; text: string; shadow: string }> = {
  1: { bg: 'linear-gradient(135deg, #ffd700, #ffb800)', text: '#fff', shadow: '0 2px 12px rgba(250,173,20,0.4)' },
  2: { bg: 'linear-gradient(135deg, #c0c0c0, #a8a8a8)', text: '#fff', shadow: '0 2px 8px rgba(140,140,140,0.3)' },
  3: { bg: 'linear-gradient(135deg, #cd7f32, #b8702a)', text: '#fff', shadow: '0 2px 8px rgba(184,112,42,0.3)' },
}

export default function ProjectRanking() {
  const { projects, accounts, monthlyRecords, issues, staff, groups, selectedMonth } = useStore()
  const navigate = useNavigate()
  const [filterGroup, setFilterGroup] = useState<string>('all')
  const [filterTier, setFilterTier] = useState<string>('all')
  const isMobile = window.innerWidth <= 768

  // 评估月 = 上月
  const evalMonth = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const ranking = useMemo(() => {
    return calcProjectQualityRanking(
      projects, accounts, monthlyRecords, issues, staff, groups, evalMonth,
    )
  }, [projects, accounts, monthlyRecords, issues, staff, groups, evalMonth])

  // 过滤
  const filtered = useMemo(() => {
    return ranking.filter((r) => {
      if (filterGroup !== 'all' && r.groupId !== filterGroup) return false
      if (filterTier !== 'all' && r.tier !== filterTier) return false
      return true
    })
  }, [ranking, filterGroup, filterTier])

  // 统计
  const stats = useMemo(() => {
    const active = ranking.filter((r) => r.tier !== '劣质' || r.status !== '已终止')
    const counts = { '优质': 0, '良好': 0, '一般': 0, '劣质': 0 }
    active.forEach((r) => { counts[r.tier]++ })
    const avgScore = active.length > 0
      ? active.reduce((s, r) => s + r.totalScore, 0) / active.length
      : 0
    return { counts, avgScore, total: active.length }
  }, [ranking])

  // 表格列定义
  const columns = [
    {
      title: '排名',
      key: 'rank',
      width: isMobile ? 50 : 60,
      align: 'center' as const,
      render: (_: unknown, __: unknown, index: number) => {
        const rank = index + 1
        const badge = rankBadgeColors[rank]
        if (badge) {
          return (
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: badge.bg, color: badge.text,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 16, boxShadow: badge.shadow,
              margin: '0 auto',
            }}>
              {rank}
            </div>
          )
        }
        return <span style={{ fontWeight: 700, color: '#8c8c8c', fontSize: 15 }}>#{rank}</span>
      },
    },
    {
      title: '项目',
      key: 'project',
      width: isMobile ? 120 : 160,
      render: (_: unknown, record: ProjectQualityScore) => (
        <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/project/${record.projectId}`)}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#262626', marginBottom: 2 }}>
            {record.projectName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Tag
              style={{
                margin: 0, fontSize: 10, padding: '0 6px', lineHeight: '18px',
                borderColor: getGroupColor(record.groupName),
                color: getGroupColor(record.groupName),
                background: `${getGroupColor(record.groupName)}10`,
              }}
            >
              {record.groupName}
            </Tag>
            <span style={{ fontSize: 11, color: '#8c8c8c' }}>{record.contactName}</span>
          </div>
        </div>
      ),
    },
    {
      title: '总评分',
      key: 'score',
      width: isMobile ? 70 : 90,
      align: 'center' as const,
      sorter: (a: ProjectQualityScore, b: ProjectQualityScore) => b.totalScore - a.totalScore,
      defaultSortOrder: 'descend' as const,
      render: (_: unknown, record: ProjectQualityScore) => {
        const tier = tierConfig[record.tier]
        return (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: tier.text, lineHeight: 1.2 }}>
              {record.totalScore}
            </div>
            <Tag
              style={{
                margin: '2px 0 0', fontSize: 10, padding: '0 6px',
                background: tier.text, color: '#fff', border: 'none',
              }}
            >
              {tier.label}
            </Tag>
          </div>
        )
      },
    },
    {
      title: isMobile ? '维度' : '各维度得分',
      key: 'dimensions',
      width: isMobile ? 100 : 240,
      render: (_: unknown, record: ProjectQualityScore) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {dimensions.map((dim) => {
            const pct = (record[dim.key] / dim.max) * 100
            return (
              <Tooltip
                key={dim.key}
                title={`${dim.label}(${dim.desc})：${record[dim.key]} / ${dim.max} 分`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: '#8c8c8c', width: 36, textAlign: 'right', flexShrink: 0 }}>
                    {dim.label}
                  </span>
                  <div style={{
                    flex: 1, height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${pct}%`, height: '100%',
                      background: pct >= 80 ? dim.color : `${dim.color}80`,
                      borderRadius: 3, transition: 'width 0.3s',
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: dim.color, fontWeight: 600, width: 24, flexShrink: 0 }}>
                    {record[dim.key]}
                  </span>
                </div>
              </Tooltip>
            )
          })}
        </div>
      ),
    },
    {
      title: '关键指标',
      key: 'metrics',
      width: isMobile ? 100 : 150,
      responsive: ['md' as const],
      render: (_: unknown, record: ProjectQualityScore) => (
        <div style={{ fontSize: 12 }}>
          <div>
            <span style={{ color: '#8c8c8c' }}>月费 </span>
            <span style={{ fontWeight: 600, color: '#262626' }}>
              {typeof record.monthlyFee === 'number' && record.monthlyFee > 0
                ? formatMoney(record.monthlyFee)
                : <Tag style={{ margin: 0, fontSize: 10 }}>提成制</Tag>}
            </span>
          </div>
          <div>
            <span style={{ color: '#8c8c8c' }}>视频 </span>
            <span style={{ fontWeight: 600, color: '#1677ff' }}>{record.lastMonthCompleted}条</span>
            <span style={{ color: '#bfbfbf', margin: '0 2px' }}>/</span>
            <span style={{ color: '#8c8c8c' }}>{record.lastMonthPlanned}条</span>
          </div>
          <div>
            <span style={{ color: '#8c8c8c' }}>回款 </span>
            <span style={{
              fontWeight: 600,
              color: record.paymentRate >= 0.8 ? '#52c41a' : record.paymentRate > 0 ? '#f5222d' : '#8c8c8c',
            }}>
              {record.lastMonthReceived > 0 ? formatMoney(record.lastMonthReceived) : '无'}
            </span>
          </div>
          <div>
            <span style={{ color: '#8c8c8c' }}>团队 </span>
            <span style={{ fontWeight: 600, color: '#722ed1' }}>{record.staffCount}人</span>
            <span style={{ color: '#8c8c8c', marginLeft: 4 }}>· {record.consecutiveMonths}月</span>
          </div>
        </div>
      ),
    },
    {
      title: '备注',
      key: 'warnings',
      width: 100,
      responsive: ['lg' as const],
      render: (_: unknown, record: ProjectQualityScore) => (
        <div>
          {record.warnings.length === 0 ? (
            <span style={{ fontSize: 11, color: '#52c41a' }}>无异常</span>
          ) : (
            record.warnings.map((w, i) => (
              <Tag key={i} color="orange" style={{ margin: '1px 0', fontSize: 10, display: 'block', maxWidth: 100 }}>
                {w}
              </Tag>
            ))
          )}
          {record.status !== '进行中' && (
            <Tag color="default" style={{ margin: '1px 0', fontSize: 10, display: 'block' }}>
              {record.status}
            </Tag>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22 }}>
          <TrophyOutlined style={{ color: '#faad14', marginRight: 8 }} />
          项目质量排名
        </h2>
        <Tag color="blue" style={{ fontSize: 13, padding: '2px 10px' }}>
          评估月：{evalMonth}
        </Tag>
      </div>

      {/* 评分说明 */}
      <Card size="small" style={{ marginBottom: 12, borderRadius: 10, background: '#fafafa' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 8 : 16, fontSize: 12, color: '#595959' }}>
          {dimensions.map((dim) => (
            <Tooltip key={dim.key} title={dim.desc}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: 2,
                  background: dim.color,
                }} />
                <strong>{dim.label}</strong>
                <span style={{ color: '#8c8c8c' }}>{dim.max}分</span>
              </span>
            </Tooltip>
          ))}
          <span style={{ color: '#8c8c8c' }}>
            · 总分100 = 总价(30) + 单价(30) + 稳定力(20) + 回款(10) + 回报(10)
          </span>
        </div>
      </Card>

      {/* 统计概览 */}
      <Row gutter={[isMobile ? 8 : 12, isMobile ? 8 : 12]} style={{ marginBottom: 16 }}>
        {(['优质', '良好', '一般', '劣质'] as const).map((tier) => {
          const config = tierConfig[tier]
          return (
            <Col xs={6} key={tier}>
              <Card
                size="small"
                style={{
                  textAlign: 'center', borderRadius: 10, cursor: 'pointer',
                  borderColor: filterTier === tier ? config.border : '#d9d9d9',
                  borderWidth: filterTier === tier ? 2 : 1,
                  opacity: filterTier === 'all' || filterTier === tier ? 1 : 0.5,
                  transition: 'all 0.2s',
                }}
                onClick={() => setFilterTier(filterTier === tier ? 'all' : tier)}
              >
                <div style={{ fontSize: 22, marginBottom: 2 }}>{config.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: config.text }}>
                  {stats.counts[tier]}
                </div>
                <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                  {config.label}项目
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>

      {/* 平均分 */}
      <div style={{
        marginBottom: 12, padding: '8px 14px', background: '#f0f5ff', borderRadius: 8,
        border: '1px solid #d6e4ff', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <StarOutlined style={{ color: '#1677ff' }} />
        <span style={{ fontSize: 13, color: '#595959' }}>
          共 <strong>{stats.total}</strong> 个项目参评，平均分
        </span>
        <span style={{ fontSize: 20, fontWeight: 800, color: '#1677ff' }}>
          {stats.avgScore.toFixed(1)}
        </span>
        <span style={{ fontSize: 13, color: '#8c8c8c' }}>
          分
        </span>
      </div>

      {/* 筛选 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <FilterOutlined style={{ color: '#8c8c8c' }} />
        <Select
          size="small"
          value={filterGroup}
          onChange={setFilterGroup}
          style={{ width: 100 }}
          options={[
            { label: '全部组', value: 'all' },
            ...groups.map((g) => ({ label: g.name, value: g.id })),
          ]}
        />
        <Select
          size="small"
          value={filterTier}
          onChange={setFilterTier}
          style={{ width: 100 }}
          options={[
            { label: '全部档次', value: 'all' },
            { label: '优质 ⭐⭐⭐', value: '优质' },
            { label: '良好 ⭐⭐', value: '良好' },
            { label: '一般 ⭐', value: '一般' },
            { label: '劣质 ⚠️', value: '劣质' },
          ]}
        />
        {filtered.length < ranking.length && (
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            显示 {filtered.length}/{ranking.length} 个项目
          </span>
        )}
      </div>

      {/* 排名表格 */}
      {filtered.length === 0 ? (
        <Empty description="没有符合条件的项目" style={{ marginTop: 40 }} />
      ) : (
        <Table
          dataSource={filtered}
          rowKey="projectId"
          columns={columns}
          size="small"
          pagination={false}
          rowClassName={(record: ProjectQualityScore) => {
            const tier = tierConfig[record.tier]
            if (record.status === '已终止') return ''
            return ''
          }}
          onRow={(record: ProjectQualityScore) => ({
            style: {
              background: record.status === '已终止' ? '#f5f5f5' : undefined,
              opacity: record.status === '已终止' ? 0.6 : 1,
              borderLeft: `4px solid ${tierConfig[record.tier].border}`,
            },
            onClick: () => navigate(`/project/${record.projectId}`),
          })}
        />
      )}

      {/* 底部说明 */}
      <Card size="small" style={{ marginTop: 16, borderRadius: 10, background: '#fffbe6', borderColor: '#ffe58f' }}>
        <div style={{ fontSize: 12, color: '#ad6800', lineHeight: 1.8 }}>
          <strong>评分规则：</strong><br />
          · 基于上月（{evalMonth}）数据自动计算，每月更新<br />
          · <strong>总价(30分)</strong>：月费总额 ÷ 全局最高月费 × 30，提成制给基础分9分<br />
          · <strong>单价(30分)</strong>：月费 ÷ 上月产出视频数，与全局均价对比。达到均值得18分，2倍均价满分<br />
          · <strong>稳定力(20分)</strong>：按连续合作月数分级 —— 首次(4分) / 磨合期2-3月(10分) / 成长期4-6月(15分) / 稳定期7-11月(18分) / 深度合作12+月(20分)，暂停-3、未解决问题-2<br />
          · <strong>回款(10分)</strong>：上月回款比例 × 10，无应收默认7分<br />
          · <strong>回报(10分)</strong>：人均产值 = 上月已收金额 ÷ 参与人数，与全局人均对比。达到均值得6分，1.67倍人均满分<br />
          · 已终止项目不参与排名，总分归零
        </div>
      </Card>
    </div>
  )
}
