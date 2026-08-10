import { useState, useMemo } from 'react'
import { Card, Table, Tag, Button, Modal, Form, Input, Select, Popconfirm, message, Row, Col, Progress, Tooltip, InputNumber, Statistic } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, BarChartOutlined, DollarOutlined, DownloadOutlined } from '@ant-design/icons'
import { useStore } from '../store/useStore'
import { calcStaffWorkload, calcStaffEfficiency, getRecentMonths, formatPercent, formatMoney } from '../utils/helpers'
import { exportStaffExcel } from '../utils/exportExcel'
import type { StaffRole } from '../types'
import type { StaffWorkloadResult, StaffEfficiencyResult } from '../utils/helpers'

const allRoles: StaffRole[] = ['组长', '编导', '文案', '摄影师', '剪辑', '剪辑学徒']

// 动态组配色
const groupPalette = [
  { border: '#1677ff', bg: '#e6f4ff', text: '#0958d9' },
  { border: '#52c41a', bg: '#f6ffed', text: '#389e0d' },
  { border: '#722ed1', bg: '#f9f0ff', text: '#531dab' },
  { border: '#fa8c16', bg: '#fff7e6', text: '#d46b08' },
  { border: '#eb2f96', bg: '#fff0f6', text: '#c41d7f' },
  { border: '#13c2c2', bg: '#e6fffb', text: '#08979c' },
]
const fallbackGroupColor = { border: '#8c8c8c', bg: '#fafafa', text: '#595959' }
function getGroupColor(groupId: string, index: number) {
  if (!groupId || index < 0) return fallbackGroupColor
  return groupPalette[index % groupPalette.length] || fallbackGroupColor
}

// 角色颜色
const roleColors: Record<string, string> = {
  '组长': 'gold',
  '编导': 'blue',
  '文案': 'cyan',
  '拍摄': 'purple',
  '剪辑': 'green',
}

export default function StaffManage() {
  const { staff, groups, projects, accounts, monthlyRecords, selectedMonth, addStaff, updateStaff, deleteStaff, staffSalaries, updateStaffSalary } = useStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()
  const [workloadMonth, setWorkloadMonth] = useState(selectedMonth)
  const [effMonth, setEffMonth] = useState(selectedMonth)
  const [activeTab, setActiveTab] = useState<'staff' | 'workload' | 'efficiency'>('workload')
  const [detailStaff, setDetailStaff] = useState<StaffWorkloadResult | null>(null)
  const [effDetailStaff, setEffDetailStaff] = useState<StaffEfficiencyResult | null>(null)
  const isMobile = window.innerWidth <= 768

  // 防御性处理：确保数组有效
  const safeStaff = Array.isArray(staff) ? staff : []
  const safeGroups = Array.isArray(groups) ? groups : []
  const safeProjects = Array.isArray(projects) ? projects : []
  const safeAccounts = Array.isArray(accounts) ? accounts : []
  const safeRecords = Array.isArray(monthlyRecords) ? monthlyRecords : []

  // 计算工作量
  const workloadData = useMemo(() => {
    return calcStaffWorkload(safeStaff, safeProjects, safeAccounts, safeRecords, safeGroups, workloadMonth)
      .filter((w) => w.projectCount > 0)
      .sort((a, b) => b.totalWorkload - a.totalWorkload)
  }, [safeStaff, safeProjects, safeAccounts, safeRecords, safeGroups, workloadMonth])

  const recentMonths = getRecentMonths(6)

  // 计算人效
  const efficiencyData = useMemo(() => {
    return calcStaffEfficiency(safeStaff, safeProjects, safeAccounts, safeRecords, safeGroups, effMonth)
      .filter((e) => e.projectCount > 0)
      .sort((a, b) => b.totalEfficiency - a.totalEfficiency)
  }, [safeStaff, safeProjects, safeAccounts, safeRecords, safeGroups, effMonth])

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (id: string) => {
    const s = safeStaff.find((x) => x.id === id)
    if (s) {
      form.setFieldsValue(s)
      setEditingId(id)
      setModalOpen(true)
    }
  }

  const handleSave = () => {
    form.validateFields().then((values) => {
      if (editingId) {
        updateStaff(editingId, values)
        message.success('已更新')
      } else {
        addStaff({ ...values, status: '在职' })
        message.success('已添加')
      }
      setModalOpen(false)
    })
  }

  const handleDelete = (id: string) => {
    deleteStaff(id)
    message.success('已删除')
  }

  const groupName = (groupId: string) => {
    if (groupId === 'none') return '未分组'
    return safeGroups.find((g) => g.id === groupId)?.name || groupId
  }

  // 最大工作量（用于进度条比例）
  const maxWorkload = workloadData.length > 0 ? workloadData[0].totalWorkload : 1

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22 }}>员工管理</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tooltip title="导出全部三个板块到一个Excel文件">
            <Button icon={<DownloadOutlined />} onClick={() => exportStaffExcel(workloadData, efficiencyData, safeStaff, staffSalaries, safeGroups, workloadMonth, effMonth)}>
              导出全部
            </Button>
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增员工</Button>
        </div>
      </div>

      {/* Tab切换 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button
          type={activeTab === 'workload' ? 'primary' : 'default'}
          icon={<BarChartOutlined />}
          onClick={() => setActiveTab('workload')}
        >
          工作量统计
        </Button>
        <Button
          type={activeTab === 'efficiency' ? 'primary' : 'default'}
          icon={<DollarOutlined />}
          onClick={() => setActiveTab('efficiency')}
        >
          人效计算
        </Button>
        <Button
          type={activeTab === 'staff' ? 'primary' : 'default'}
          icon={<UserOutlined />}
          onClick={() => setActiveTab('staff')}
        >
          员工信息
        </Button>
      </div>

      {/* ===== 工作量统计 ===== */}
      {activeTab === 'workload' && (
        <Card
          size="small"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span>员工工作量统计</span>
              <Select
                size="small"
                value={workloadMonth}
                onChange={setWorkloadMonth}
                style={{ width: 120 }}
                options={recentMonths.map((m) => ({ label: m, value: m }))}
              />
            </div>
          }
          extra={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Tooltip title="导出工作量统计表">
                <Button size="small" icon={<DownloadOutlined />} onClick={() => exportStaffExcel(workloadData, efficiencyData, safeStaff, staffSalaries, safeGroups, workloadMonth, effMonth, '工作量统计')}>
                  导出
                </Button>
              </Tooltip>
              <Tooltip title="工作量 = 各岗位贡献之和。每个岗位贡献 = 该项目本月「已完成」条数 ÷ 该岗位人数。只统计已完成，不统计计划总量。如剪辑2人、本月已完成6条，每人剪辑贡献=3。组长不计入">
                <span style={{ fontSize: 12, color: '#8c8c8c', cursor: 'help' }}>计算说明</span>
              </Tooltip>
            </div>
          }
        >
          {workloadData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <div>暂无工作量数据</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                请先在项目详情页为项目分配参与人员（组长/编导/文案/拍摄/剪辑）
              </div>
            </div>
          ) : (
            <>
              {/* 工作量排行卡片 */}
              <Row gutter={[6, 6]} style={{ marginBottom: 16 }}>
                {workloadData.map((w, idx) => {
                  const colors = getGroupColor(safeStaff.find((s) => s.id === w.staffId)?.groupId || '', idx)
                  return (
                    <Col xs={8} sm={6} md={4} lg={3} key={w.staffId}>
                      <Card
                        size="small"
                        style={{
                          textAlign: 'center',
                          borderTop: `3px solid ${colors.border}`,
                          background: colors.bg,
                          padding: '4px 0',
                        }}
                        bodyStyle={{ padding: '6px 4px' }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: colors.text,
                            fontWeight: 600,
                            marginBottom: 2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            textDecorationStyle: 'dotted',
                            textUnderlineOffset: 3,
                          }}
                          onClick={() => setDetailStaff(w)}
                        >
                          {w.staffName}
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: colors.border, lineHeight: 1.1 }}>
                          {w.totalWorkload}
                        </div>
                        <div style={{ fontSize: 10, color: '#8c8c8c' }}>
                          {w.projectCount}项目
                        </div>
                      </Card>
                    </Col>
                  )
                })}
              </Row>

              {/* 详细表格 */}
              <Table
                dataSource={workloadData}
                rowKey="staffId"
                size="small"
                pagination={false}
                scroll={{ x: isMobile ? 600 : 800 }}
                expandable={{
                  expandedRowRender: (record: any) => (
                    <div style={{ padding: '8px 0' }}>
                      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#fafafa' }}>
                            <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>项目</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>组</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>担任角色</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>角色数</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>项目本月已完成</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>工作量</th>
                          </tr>
                        </thead>
                        <tbody>
                          {record.projectDetails.map((d: any) => (
                            <tr key={d.projectId}>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f5f5f5', fontWeight: 600 }}>
                                {d.projectName}
                              </td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f5f5f5', color: '#8c8c8c' }}>
                                {d.groupName}
                              </td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f5f5f5', textAlign: 'center' }}>
                                {d.roles.map((r: string) => (
                                  <Tag key={r} color={roleColors[r] || 'default'} style={{ marginBottom: 2, fontSize: 11 }}>
                                    {r}
                                  </Tag>
                                ))}
                              </td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f5f5f5', textAlign: 'center', fontWeight: 600 }}>
                                {d.roleCount}
                              </td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f5f5f5', textAlign: 'center' }}>
                                {d.monthCompleted}条
                              </td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f5f5f5', textAlign: 'center', fontWeight: 700, color: '#1677ff' }}>
                                {d.workload}
                              </td>
                            </tr>
                          ))}
                          <tr style={{ background: '#fafafa' }}>
                            <td colSpan={3} style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>
                              合计
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>
                              {record.totalRoleCount}
                            </td>
                            <td></td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#1677ff', fontSize: 14 }}>
                              {record.totalWorkload}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ),
                }}
                columns={[
                  {
                    title: '姓名',
                    dataIndex: 'staffName',
                    width: 80,
                    render: (n: string, record: any) => (
                      <span
                        style={{ fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#1677ff', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
                        onClick={() => setDetailStaff(record)}
                      >
                        {n}
                      </span>
                    ),
                  },
                  {
                    title: '组',
                    dataIndex: 'groupName',
                    width: 70,
                    render: (g: string) => {
                      const idx = safeGroups.findIndex((grp) => grp.name === g)
                      const colors = getGroupColor(idx >= 0 ? safeGroups[idx].id : '', idx)
                      return <Tag style={{ borderColor: colors.border, color: colors.text, background: colors.bg }}>{g}</Tag>
                    },
                  },
                  {
                    title: '参与项目',
                    dataIndex: 'projectCount',
                    width: 80,
                    align: 'center',
                    sorter: (a: any, b: any) => a.projectCount - b.projectCount,
                    render: (v: number) => <span style={{ fontWeight: 600 }}>{v}个</span>,
                  },
                  {
                    title: '总角色数',
                    dataIndex: 'totalRoleCount',
                    width: 80,
                    align: 'center',
                    sorter: (a: any, b: any) => a.totalRoleCount - b.totalRoleCount,
                    render: (v: number) => <Tag color="blue">{v}</Tag>,
                  },
                  {
                    title: '本月工作量',
                    dataIndex: 'totalWorkload',
                    width: isMobile ? 120 : 200,
                    sorter: (a: any, b: any) => a.totalWorkload - b.totalWorkload,
                    defaultSortOrder: 'descend',
                    render: (v: number) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Progress
                          percent={Math.round((v / maxWorkload) * 100)}
                          size="small"
                          style={{ width: isMobile ? 60 : 120, margin: 0 }}
                          format={() => ''}
                        />
                        <span style={{ fontWeight: 700, fontSize: 16, color: '#1677ff' }}>{v}</span>
                      </div>
                    ),
                  },
                  {
                    title: '参与详情',
                    width: 200,
                    render: (_: any, record: any) => (
                      <span style={{ fontSize: 11, color: '#8c8c8c' }}>
                        {record.projectDetails.map((d: any) => d.projectName).join('、')}
                      </span>
                    ),
                  },
                ]}
              />

              {/* 汇总信息 */}
              <div style={{ marginTop: 12, padding: '8px 12px', background: '#f6f8fa', borderRadius: 6, fontSize: 12, color: '#595959' }}>
                {workloadMonth} 共 {workloadData.length} 人参与工作，总工作量 {workloadData.reduce((s, w) => s + w.totalWorkload, 0)}，
                平均每人 {workloadData.length > 0 ? Math.round(workloadData.reduce((s, w) => s + w.totalWorkload, 0) / workloadData.length) : 0}
              </div>
            </>
          )}
        </Card>
      )}

      {/* ===== 人效计算 ===== */}
      {activeTab === 'efficiency' && (
        <Card
          size="small"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span>人效计算</span>
              <Select
                size="small"
                value={effMonth}
                onChange={setEffMonth}
                style={{ width: 120 }}
                options={recentMonths.map((m) => ({ label: m, value: m }))}
              />
            </div>
          }
          extra={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Tooltip title="导出人效计算表">
                <Button size="small" icon={<DownloadOutlined />} onClick={() => exportStaffExcel(workloadData, efficiencyData, safeStaff, staffSalaries, safeGroups, workloadMonth, effMonth, '人效计算')}>
                  导出
                </Button>
              </Tooltip>
              <Tooltip title="项目产值 = 月费 × 完成率（已完成/计划，上限100%）。岗位产值 = 项目产值 / 岗位数（排除组长）。每人某岗位人效 = 岗位产值 / 该岗位人数。一人多岗则各岗位人效相加">
                <span style={{ fontSize: 12, color: '#8c8c8c', cursor: 'help' }}>计算说明</span>
              </Tooltip>
            </div>
          }
        >
          {efficiencyData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
              <div>暂无人效数据</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                需要先为项目分配人员，并录入月度计划/完成数据
              </div>
            </div>
          ) : (
            <>
              {/* 汇总卡片 */}
              <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                <Col xs={12} sm={6}>
                  <Card size="small" style={{ textAlign: 'center', borderTop: '3px solid #1677ff' }}>
                    <Statistic
                      title="总人效"
                      value={efficiencyData.reduce((s, e) => s + e.totalEfficiency, 0)}
                      prefix="¥"
                      valueStyle={{ fontSize: 18, color: '#1677ff' }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" style={{ textAlign: 'center', borderTop: '3px solid #52c41a' }}>
                    <Statistic
                      title="平均人效"
                      value={efficiencyData.length > 0 ? Math.round(efficiencyData.reduce((s, e) => s + e.totalEfficiency, 0) / efficiencyData.length) : 0}
                      prefix="¥"
                      valueStyle={{ fontSize: 18, color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" style={{ textAlign: 'center', borderTop: '3px solid #fa8c16' }}>
                    <Statistic
                      title="工资总额"
                      value={efficiencyData.reduce((s, e) => s + (staffSalaries[e.staffId] || 0), 0)}
                      prefix="¥"
                      valueStyle={{ fontSize: 18, color: '#fa8c16' }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" style={{ textAlign: 'center', borderTop: '3px solid #722ed1' }}>
                    {(() => {
                      const totalEff = efficiencyData.reduce((s, e) => s + e.totalEfficiency, 0)
                      const totalSalary = efficiencyData.reduce((s, e) => s + (staffSalaries[e.staffId] || 0), 0)
                      const diff = totalEff - totalSalary
                      return (
                        <Statistic
                          title="人效-工资"
                          value={diff}
                          prefix="¥"
                          valueStyle={{ fontSize: 18, color: diff >= 0 ? '#52c41a' : '#f5222d' }}
                        />
                      )
                    })()}
                  </Card>
                </Col>
              </Row>

              {/* 人效明细表 */}
              <Table
                dataSource={efficiencyData}
                rowKey="staffId"
                size="small"
                pagination={false}
                scroll={{ x: isMobile ? 700 : 900 }}
                expandable={{
                  expandedRowRender: (record: any) => (
                    <div style={{ padding: '8px 0' }}>
                      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#fafafa' }}>
                            <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>项目</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>月费</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>计划/完成</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>完成率</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>岗位数</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>项目产值</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>担任角色</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>人效</th>
                          </tr>
                        </thead>
                        <tbody>
                          {record.projectDetails.map((d: any) => (
                            <tr key={d.projectId}>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f5f5f5', fontWeight: 600 }}>
                                {d.projectName}
                              </td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f5f5f5', textAlign: 'center' }}>
                                {formatMoney(d.monthlyFee)}
                              </td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f5f5f5', textAlign: 'center' }}>
                                {d.monthCompleted}/{d.monthPlanned}
                              </td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f5f5f5', textAlign: 'center' }}>
                                <Progress
                                  percent={Math.round(d.completionRate * 100)}
                                  size="small"
                                  style={{ width: 60, margin: 0, display: 'inline-flex' }}
                                  format={(p) => `${p}%`}
                                />
                              </td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f5f5f5', textAlign: 'center' }}>
                                {d.numRoles}
                              </td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f5f5f5', textAlign: 'center', fontWeight: 600 }}>
                                ¥{d.projectValue.toLocaleString()}
                              </td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f5f5f5', textAlign: 'center' }}>
                                {d.roles.map((r: string) => (
                                  <Tag key={r} color={roleColors[r] || 'default'} style={{ marginBottom: 2, fontSize: 11 }}>
                                    {r}
                                    {d.roleBreakdown.find((rb: any) => rb.role === r)?.peopleInRole > 1
                                      ? `(${d.roleBreakdown.find((rb: any) => rb.role === r)?.peopleInRole}人)`
                                      : ''}
                                  </Tag>
                                ))}
                              </td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f5f5f5', textAlign: 'center', fontWeight: 700, color: '#1677ff' }}>
                                ¥{d.efficiency.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                          <tr style={{ background: '#fafafa' }}>
                            <td colSpan={7} style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>
                              人效合计
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#1677ff', fontSize: 14 }}>
                              ¥{record.totalEfficiency.toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ),
                }}
                columns={[
                  {
                    title: '姓名',
                    dataIndex: 'staffName',
                    width: 80,
                    render: (n: string, record: any) => (
                      <span
                        style={{ fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#1677ff', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
                        onClick={() => setEffDetailStaff(record)}
                      >
                        {n}
                      </span>
                    ),
                  },
                  {
                    title: '组',
                    dataIndex: 'groupName',
                    width: 70,
                    render: (g: string) => {
                      const idx = safeGroups.findIndex((grp) => grp.name === g)
                      const colors = getGroupColor(idx >= 0 ? safeGroups[idx].id : '', idx)
                      return <Tag style={{ borderColor: colors.border, color: colors.text, background: colors.bg }}>{g}</Tag>
                    },
                  },
                  {
                    title: '项目数',
                    dataIndex: 'projectCount',
                    width: 70,
                    align: 'center',
                    sorter: (a: any, b: any) => a.projectCount - b.projectCount,
                    render: (v: number) => <span style={{ fontWeight: 600 }}>{v}</span>,
                  },
                  {
                    title: '月度人效',
                    dataIndex: 'totalEfficiency',
                    width: 120,
                    sorter: (a: any, b: any) => a.totalEfficiency - b.totalEfficiency,
                    defaultSortOrder: 'descend' as const,
                    render: (v: number) => (
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#1677ff' }}>¥{v.toLocaleString()}</span>
                    ),
                  },
                  {
                    title: '上月工资',
                    width: 130,
                    render: (_: any, record: any) => (
                      <InputNumber
                        size="small"
                        prefix="¥"
                        style={{ width: 110 }}
                        value={staffSalaries[record.staffId]}
                        placeholder="填入工资"
                        formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(v) => Number(v!.replace(/¥\s?|(,*)/g, '')) as 0}
                        onChange={(val) => updateStaffSalary(record.staffId, val || 0)}
                      />
                    ),
                  },
                  {
                    title: '差额',
                    width: 110,
                    render: (_: any, record: any) => {
                      const salary = staffSalaries[record.staffId] || 0
                      const diff = record.totalEfficiency - salary
                      return (
                        <span style={{ fontWeight: 700, color: diff >= 0 ? '#52c41a' : '#f5222d' }}>
                          {diff >= 0 ? '+' : ''}¥{diff.toLocaleString()}
                        </span>
                      )
                    },
                  },
                  {
                    title: '人效/工资',
                    width: 100,
                    render: (_: any, record: any) => {
                      const salary = staffSalaries[record.staffId] || 0
                      if (salary === 0) return <span style={{ color: '#bfbfbf', fontSize: 12 }}>未填工资</span>
                      const ratio = record.totalEfficiency / salary
                      const pct = Math.round(ratio * 100)
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Progress
                            percent={Math.min(pct, 200)}
                            size="small"
                            style={{ width: 50, margin: 0 }}
                            format={() => ''}
                            strokeColor={pct >= 100 ? '#52c41a' : pct >= 70 ? '#fa8c16' : '#f5222d'}
                          />
                          <span style={{ fontSize: 12, fontWeight: 600, color: pct >= 100 ? '#52c41a' : pct >= 70 ? '#fa8c16' : '#f5222d' }}>
                            {pct}%
                          </span>
                        </div>
                      )
                    },
                  },
                ]}
              />

              {/* 计算说明 */}
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#fffbe6', borderRadius: 6, fontSize: 12, color: '#8c8c8c', border: '1px solid #ffe58f', lineHeight: 1.8 }}>
                <div style={{ fontWeight: 600, color: '#d48806', marginBottom: 4 }}>📊 人效计算公式</div>
                <div>1. <b>完成率</b> = 已完成条数 / 计划总条数（上限100%）</div>
                <div>2. <b>项目产值</b> = 项目月费 × 完成率</div>
                <div>3. <b>岗位产值</b> = 项目产值 / 岗位数（排除组长，如文案/拍摄/剪辑=3个岗位则各占1/3）</div>
                <div>4. <b>单人某岗位人效</b> = 岗位产值 / 该岗位人数（如剪辑2人则各分一半）</div>
                <div>5. <b>一人多岗</b>则各岗位人效相加（如同时担任文案+剪辑）</div>
                <div>6. <b>月度总人效</b> = 所有参与项目的人效之和</div>
                <div style={{ marginTop: 4, color: '#bfbfbf' }}>💡 人效/工资 &gt; 100% 表示产出大于人力成本，&lt; 100% 表示产出不足以覆盖工资</div>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ===== 员工信息 ===== */}
      {activeTab === 'staff' && (
        <Card size="small"
          extra={
            <Tooltip title="导出员工信息表">
              <Button size="small" icon={<DownloadOutlined />} onClick={() => exportStaffExcel(workloadData, efficiencyData, safeStaff, staffSalaries, safeGroups, workloadMonth, effMonth, '员工信息')}>
                导出
              </Button>
            </Tooltip>
          }
        >
          <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
            {safeGroups.map((g, gi) => {
              const count = safeStaff.filter((s) => s.groupId === g.id).length
              const colors = getGroupColor(g.id, gi)
              return (
                <Col xs={8} sm={6} key={g.id}>
                  <Card size="small" style={{ textAlign: 'center', borderTop: `3px solid ${colors.border}` }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: colors.border }}>{count}</div>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>{g.name}</div>
                  </Card>
                </Col>
              )
            })}
            <Col xs={8} sm={6}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{safeStaff.filter((s) => s.groupId === 'none').length}</div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>未分组</div>
              </Card>
            </Col>
            <Col xs={8} sm={6}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{safeStaff.length}</div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>总计</div>
              </Card>
            </Col>
          </Row>

          <Table
            dataSource={safeStaff}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 500 }}
            columns={[
              { title: '姓名', dataIndex: 'name', width: 80, render: (n: string) => <span style={{ fontWeight: 600 }}>{n}</span> },
              {
                title: '角色', dataIndex: 'roles', width: 150,
                render: (roles: StaffRole[]) => (
                  <div>{(roles || []).map((r) => <Tag key={r} color="blue" style={{ marginBottom: 2 }}>{r}</Tag>)}</div>
                ),
              },
              { title: '所属组', dataIndex: 'groupId', width: 80, render: (g: string) => groupName(g) },
              {
                title: '状态', dataIndex: 'status', width: 70,
                render: (s: string) => <Tag color={s === '在职' ? 'green' : 'default'}>{s}</Tag>,
              },
              {
                title: '操作', width: 100,
                render: (_: any, record: any) => (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button size="small" type="text" icon={<EditOutlined />} onClick={() => handleEdit(record.id)} />
                    <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      <Modal
        title={editingId ? '编辑员工' : '新增员工'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={isMobile ? '90%' : 400}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="如：张三" />
          </Form.Item>
          <Form.Item name="roles" label="角色（可多选）" rules={[{ required: true, message: '请选择角色' }]}>
            <Select mode="multiple" options={allRoles.map((r) => ({ label: r, value: r }))} />
          </Form.Item>
          <Form.Item name="groupId" label="所属组" rules={[{ required: true }]}>
            <Select options={[
              ...safeGroups.map((g) => ({ label: g.name, value: g.id })),
              { label: '未分组', value: 'none' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== 员工工作量明细 Modal ===== */}
      <Modal
        title={
          detailStaff ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserOutlined />
              <span>{detailStaff.staffName} · 工作量明细</span>
              <Tag color="blue">{workloadMonth}</Tag>
            </div>
          ) : ''
        }
        open={!!detailStaff}
        onCancel={() => setDetailStaff(null)}
        width={isMobile ? '95%' : 720}
        footer={[
          <Button key="close" onClick={() => setDetailStaff(null)}>关闭</Button>,
        ]}
      >
        {detailStaff && (
          <>
            {/* 汇总卡片 */}
            <div style={{
              display: 'flex', gap: isMobile ? 8 : 24, marginBottom: 16,
              padding: '12px 16px', background: '#f6f8fa', borderRadius: 8,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1677ff' }}>{detailStaff.projectCount}</div>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>参与项目</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#722ed1' }}>{detailStaff.totalRoleCount}</div>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>总角色数</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#f5222d' }}>
                  {detailStaff.projectDetails.reduce((s, d) => s + d.monthCompleted, 0)}
                </div>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>已完成(条)</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#52c41a' }}>
                  {detailStaff.projectDetails.reduce((s, d) => s + d.monthPlanned, 0)}
                </div>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>计划总量(条)</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#fa8c16' }}>{detailStaff.totalWorkload}</div>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>总工作量</div>
              </div>
            </div>

            {/* 项目明细列表 */}
            {detailStaff.projectDetails.map((d, idx) => {
              const gIdx = safeGroups.findIndex((gr) => gr.name === d.groupName)
              const gColor = gIdx >= 0 ? getGroupColor(safeGroups[gIdx]?.id || '', gIdx) : fallbackGroupColor
              const completionRate = d.monthPlanned > 0 ? Math.round((d.monthCompleted / d.monthPlanned) * 100) : 0
              return (
                <div
                  key={d.projectId}
                  style={{
                    border: `1px solid ${gColor.border}30`,
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 8,
                    background: gColor.bg + '40',
                  }}
                >
                  {/* 项目名 + 组 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        background: gColor.border,
                      }} />
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#262626' }}>{d.projectName}</span>
                      <Tag style={{
                        borderColor: gColor.border, color: gColor.text, background: gColor.bg,
                        fontSize: 11,
                      }}>{d.groupName}</Tag>
                    </div>
                    <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                      完成率 {completionRate}%
                    </span>
                  </div>

                  {/* 角色标签 */}
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    {d.roles.map((r) => (
                      <Tag key={r} color={roleColors[r] || 'default'} style={{ fontSize: 11 }}>
                        {r}
                      </Tag>
                    ))}
                  </div>

                  {/* 数据指标 */}
                  <div style={{ display: 'flex', gap: isMobile ? 12 : 32, fontSize: 13 }}>
                    <div>
                      <span style={{ color: '#8c8c8c' }}>本月计划 </span>
                      <span style={{ fontWeight: 700, color: '#52c41a' }}>{d.monthPlanned} 条</span>
                    </div>
                    <div>
                      <span style={{ color: '#8c8c8c' }}>已完成 </span>
                      <span style={{ fontWeight: 700, color: '#1677ff' }}>{d.monthCompleted} 条</span>
                    </div>
                    <div>
                      <span style={{ color: '#8c8c8c' }}>工作量 </span>
                      <span style={{ fontWeight: 700, color: '#fa8c16', fontSize: 15 }}>{d.workload}</span>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <Progress
                    percent={completionRate}
                    size="small"
                    showInfo={false}
                    strokeColor={gColor.border}
                    trailColor="#f0f0f0"
                    style={{ marginTop: 6 }}
                  />
                </div>
              )
            })}

            {/* 计算说明 */}
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#fffbe6', borderRadius: 6, fontSize: 11, color: '#8c8c8c', border: '1px solid #ffe58f' }}>
              工作量 = 各角色平摊贡献之和。每个角色贡献 = 项目本月已完成条数 ÷ 该岗位人数。组长不计入。如剪辑2人、已完成6条，每人贡献=3。
            </div>
          </>
        )}
      </Modal>

      {/* ===== 员工人效明细 Modal ===== */}
      <Modal
        title={
          effDetailStaff ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarOutlined />
              <span>{effDetailStaff.staffName} · 人效明细</span>
              <Tag color="gold">{effMonth}</Tag>
            </div>
          ) : ''
        }
        open={!!effDetailStaff}
        onCancel={() => setEffDetailStaff(null)}
        width={isMobile ? '95%' : 760}
        footer={[
          <Button key="close" onClick={() => setEffDetailStaff(null)}>关闭</Button>,
        ]}
      >
        {effDetailStaff && (
          <>
            {/* 汇总卡片 */}
            <div style={{
              display: 'flex', gap: isMobile ? 8 : 20, marginBottom: 16,
              padding: '12px 16px', background: '#f6f8fa', borderRadius: 8, flexWrap: 'wrap',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1677ff' }}>{effDetailStaff.projectCount}</div>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>参与项目</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#52c41a' }}>¥{effDetailStaff.totalEfficiency.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>月度总人效</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#fa8c16' }}>
                  ¥{(staffSalaries[effDetailStaff.staffId] || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>上月工资</div>
              </div>
              {(() => {
                const salary = staffSalaries[effDetailStaff.staffId] || 0
                const diff = effDetailStaff.totalEfficiency - salary
                const ratio = salary > 0 ? Math.round((effDetailStaff.totalEfficiency / salary) * 100) : 0
                return (
                  <>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: diff >= 0 ? '#52c41a' : '#f5222d' }}>
                        {diff >= 0 ? '+' : ''}¥{diff.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: '#8c8c8c' }}>差额</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: ratio >= 100 ? '#52c41a' : ratio >= 70 ? '#fa8c16' : '#f5222d' }}>
                        {salary > 0 ? `${ratio}%` : '—'}
                      </div>
                      <div style={{ fontSize: 11, color: '#8c8c8c' }}>人效/工资</div>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* 项目明细列表 */}
            {effDetailStaff.projectDetails.map((d) => {
              const gIdx = safeGroups.findIndex((gr) => gr.name === d.groupName)
              const gColor = gIdx >= 0 ? getGroupColor(safeGroups[gIdx]?.id || '', gIdx) : fallbackGroupColor
              const completionPct = Math.round(d.completionRate * 100)
              return (
                <div
                  key={d.projectId}
                  style={{
                    border: `1px solid ${gColor.border}30`,
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 8,
                    background: gColor.bg + '40',
                  }}
                >
                  {/* 项目名 + 组 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        background: gColor.border,
                      }} />
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#262626' }}>{d.projectName}</span>
                      <Tag style={{
                        borderColor: gColor.border, color: gColor.text, background: gColor.bg,
                        fontSize: 11,
                      }}>{d.groupName}</Tag>
                    </div>
                    <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                      完成率 {completionPct}%
                    </span>
                  </div>

                  {/* 计算链路 */}
                  <div style={{ display: 'flex', gap: isMobile ? 8 : 16, fontSize: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                    <div style={{ background: '#fff', padding: '4px 8px', borderRadius: 4, border: '1px solid #f0f0f0' }}>
                      <span style={{ color: '#8c8c8c' }}>月费 </span>
                      <span style={{ fontWeight: 600 }}>{formatMoney(d.monthlyFee)}</span>
                    </div>
                    <div style={{ background: '#fff', padding: '4px 8px', borderRadius: 4, border: '1px solid #f0f0f0' }}>
                      <span style={{ color: '#8c8c8c' }}>计划/完成 </span>
                      <span style={{ fontWeight: 600 }}>{d.monthPlanned}/{d.monthCompleted}条</span>
                    </div>
                    <div style={{ background: '#e6f4ff', padding: '4px 8px', borderRadius: 4, border: '1px solid #91caff' }}>
                      <span style={{ color: '#8c8c8c' }}>项目产值 </span>
                      <span style={{ fontWeight: 700, color: '#1677ff' }}>¥{d.projectValue.toLocaleString()}</span>
                    </div>
                    <div style={{ background: '#fff', padding: '4px 8px', borderRadius: 4, border: '1px solid #f0f0f0' }}>
                      <span style={{ color: '#8c8c8c' }}>岗位数 </span>
                      <span style={{ fontWeight: 600 }}>{d.numRoles}</span>
                    </div>
                    <div style={{ background: '#fff7e6', padding: '4px 8px', borderRadius: 4, border: '1px solid #ffd591' }}>
                      <span style={{ color: '#8c8c8c' }}>岗位产值 </span>
                      <span style={{ fontWeight: 700, color: '#fa8c16' }}>¥{Math.round(d.projectValue / d.numRoles).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* 角色明细 */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {d.roleBreakdown.map((rb) => (
                      <div key={rb.role} style={{
                        background: '#fff', padding: '4px 10px', borderRadius: 6,
                        border: `1px solid ${roleColors[rb.role] === 'green' ? '#b7eb8f' : roleColors[rb.role] === 'cyan' ? '#87e8de' : roleColors[rb.role] === 'purple' ? '#d3adf7' : '#91d5ff'}`,
                        fontSize: 12,
                      }}>
                        <Tag color={roleColors[rb.role] || 'default'} style={{ marginBottom: 0, fontSize: 11 }}>{rb.role}</Tag>
                        <span style={{ color: '#8c8c8c', marginLeft: 4 }}>
                          {rb.peopleInRole > 1 ? `${rb.peopleInRole}人平摊` : '1人'} →
                        </span>
                        <span style={{ fontWeight: 700, color: '#fa8c16', marginLeft: 4 }}>
                          ¥{rb.perPerson.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 人效汇总 */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 12px', background: gColor.bg, borderRadius: 6,
                  }}>
                    <span style={{ fontSize: 12, color: gColor.text }}>该项目人效</span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#1677ff' }}>¥{d.efficiency.toLocaleString()}</span>
                  </div>

                  {/* 进度条 */}
                  <Progress
                    percent={completionPct}
                    size="small"
                    showInfo={false}
                    strokeColor={gColor.border}
                    trailColor="#f0f0f0"
                    style={{ marginTop: 6 }}
                  />
                </div>
              )
            })}

            {/* 计算说明 */}
            <div style={{ marginTop: 8, padding: '10px 12px', background: '#fffbe6', borderRadius: 6, fontSize: 11, color: '#8c8c8c', border: '1px solid #ffe58f', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, color: '#d48806', marginBottom: 4 }}>计算公式</div>
              项目产值 = 月费 × 完成率 → 岗位产值 = 项目产值 / 岗位数 → 单人产值 = 岗位产值 / 该岗位人数 → 多岗相加 = 该项目人效
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
