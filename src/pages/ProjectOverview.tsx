import { useMemo, useState } from 'react'
import { Card, Row, Col, Tag, Button, Table, Modal, Form, Input, InputNumber, Select, DatePicker, Steps, Popconfirm, message } from 'antd'
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { calcProjectMonthData, formatMoney, getStaffNames, getProgressColor } from '../utils/helpers'
import { exportToExcel } from '../utils/excel'
import type { LeadStage, Account, MonthlyRecord } from '../types'
import dayjs from 'dayjs'

const stageSteps = ['初次接触', '需求沟通', '方案报价', '待签约', '已签约转正式']
const stageStepIndex: Record<string, number> = {
  '初次接触': 0, '需求沟通': 1, '方案报价': 2, '待签约': 3, '已签约转正式': 4, '已流失': -1,
}

// 各组配色（淡色背景 + 深色边框/标题）
const groupTheme: Record<string, { border: string; bg: string; headerBg: string; dot: string; darkBg: string; darkBorder: string }> = {
  A: { border: '#1677ff', bg: '#f0f7ff', headerBg: '#e6f4ff', dot: '#1677ff', darkBg: '#d6e8ff', darkBorder: '#003eb3' },
  B: { border: '#52c41a', bg: '#f3faf0', headerBg: '#f6ffed', dot: '#52c41a', darkBg: '#d9f7be', darkBorder: '#1d6b00' },
  C: { border: '#722ed1', bg: '#f8f3ff', headerBg: '#f9f0ff', dot: '#722ed1', darkBg: '#efdbff', darkBorder: '#391085' },
  D: { border: '#fa8c16', bg: '#fffbf5', headerBg: '#fff7e6', dot: '#fa8c16', darkBg: '#ffe7ba', darkBorder: '#8c3a00' },
  E: { border: '#eb2f96', bg: '#fff5fa', headerBg: '#fff0f6', dot: '#eb2f96', darkBg: '#ffd6e7', darkBorder: '#8c0054' },
  F: { border: '#13c2c2', bg: '#f0fffc', headerBg: '#e6fffb', dot: '#13c2c2', darkBg: '#b5f5ec', darkBorder: '#004d4d' },
}
const extraGroupColors = ['#fa541c', '#2f54eb', '#a0d911', '#fadb14', '#f5222d']
function getGroupTheme(id: string, index: number) {
  return groupTheme[id] || {
    border: extraGroupColors[index % extraGroupColors.length],
    bg: `${extraGroupColors[index % extraGroupColors.length]}0a`,
    headerBg: `${extraGroupColors[index % extraGroupColors.length]}15`,
    dot: extraGroupColors[index % extraGroupColors.length],
    darkBg: `${extraGroupColors[index % extraGroupColors.length]}30`,
    darkBorder: extraGroupColors[index % extraGroupColors.length],
  }
}

const leadTheme = { border: '#fa8c16', bg: '#fffbf5', headerBg: '#fff7e6', dot: '#fa8c16' }

export default function ProjectOverview() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const filterGroupId = searchParams.get('group') || ''
  const { projects, accounts, monthlyRecords, issues, staff, groups, leads, selectedMonth, currentGroup, addLead, updateLead, convertLeadToProject } = useStore()
  const [leadModalOpen, setLeadModalOpen] = useState(false)
  const [leadForm] = Form.useForm()
  const isMobile = window.innerWidth <= 768

  const activeProjects = projects.filter((p) => p.status === '进行中' || p.status === '暂停')

  const groupProjects = useMemo(() => {
    const targetGroups = filterGroupId ? groups.filter((g) => g.id === filterGroupId) : groups
    return targetGroups.map((g) => {
      const gProjects = activeProjects.filter((p) => p.groupId === g.id)
      return {
        ...g,
        projects: gProjects.map((p) => {
          const d = calcProjectMonthData(p, accounts, monthlyRecords, issues, selectedMonth)
          const leaders = getStaffNames(staff, p.leaderIds)
          // 每个账号的独立数据
          const accountDetails = d.accounts.map((acc: Account) => {
            const record = d.currentMonthRecords.find((r: MonthlyRecord) => r.accountId === acc.id)
            return {
              ...acc,
              planned: record?.plannedCount || acc.monthlyQuota,
              completed: record?.completedCount || 0,
              rate: record && record.plannedCount > 0 ? (record.completedCount / record.plannedCount) * 100 : 0,
              paidAmount: record?.paidAmount || 0,
              paymentAmount: record?.paymentAmount || 0,
            }
          })
          return { ...p, ...d, leaders, accountDetails }
        }),
      }
    })
  }, [projects, accounts, monthlyRecords, issues, staff, groups, selectedMonth, filterGroupId])

  const activeLeads = leads.filter((l) => l.stage !== '已签约转正式' && l.stage !== '已流失')
  const negotiatorName = (id: string) => staff.find((s) => s.id === id)?.name || ''

  const handleAddLead = () => {
    leadForm.validateFields().then((values) => {
      addLead({
        ...values,
        nextFollowUpDate: values.nextFollowUpDate?.format('YYYY-MM-DD'),
        groupId: values.groupId || '待定',
      })
      message.success('洽谈项目已添加')
      leadForm.resetFields()
      setLeadModalOpen(false)
    })
  }

  const handleConvert = (leadId: string) => {
    const projectId = convertLeadToProject(leadId)
    message.success('已转为正式项目')
    if (projectId) navigate(`/project/${projectId}`)
  }

  const handleExport = () => {
    const data = activeProjects.map((p) => {
      const d = calcProjectMonthData(p, accounts, monthlyRecords, issues, selectedMonth)
      return {
        '项目名称': p.name,
        '所属组': groups.find((g) => g.id === p.groupId)?.name || '',
        '对接人': p.contactName,
        '状态': p.status,
        '本月计划': d.monthPlanned,
        '本月已完成': d.monthCompleted,
        '完成率': `${d.completionRate.toFixed(1)}%`,
        '月费': p.monthlyFee,
        '已收': d.monthPaidAmount,
        '未收': d.monthUnpaid,
      }
    })
    exportToExcel(data, `项目总览_${selectedMonth}`, '进行中项目')
  }

  const handleExportLeads = () => {
    const data = activeLeads.map((l) => ({
      '项目名称': l.name,
      '对接人': l.contactName,
      '洽谈人': negotiatorName(l.negotiatorId),
      '倾向组': l.groupId === '待定' ? '待定' : groups.find((g) => g.id === l.groupId)?.name || '',
      '预估月费': l.estimatedMonthlyFee || '',
      '洽谈阶段': l.stage,
      '最新进展': l.stageNote,
      '下次跟进': l.nextFollowUpDate || '',
    }))
    exportToExcel(data, `洽谈项目_${selectedMonth}`, '洽谈中项目')
  }

  // 渲染单个项目卡片（含多账号）
  const renderProjectCard = (p: any, theme: typeof groupTheme.A, isOwnGroup: boolean) => (
    <Card
      key={p.id}
      size="small"
      hoverable
      onClick={() => navigate(`/project/${p.id}`)}
      style={{
        marginBottom: 8,
        borderLeft: `4px solid ${isOwnGroup ? theme.darkBorder : '#d9d9d9'}`,
        background: isOwnGroup ? theme.darkBg : '#fafafa',
        boxShadow: isOwnGroup ? `0 1px 6px ${theme.border}40` : undefined,
      }}
      styles={{ body: { padding: 10 } }}
    >
      {/* 项目标题行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 16, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#262626' }}>{p.name}</span>
        {p.hasIssues && <Tag color="red" style={{ margin: 0, padding: '0 4px', fontSize: 11 }}>⚠问题</Tag>}
        {p.status === '暂停' && <Tag color="orange" style={{ margin: 0, padding: '0 4px', fontSize: 11 }}>暂停</Tag>}
      </div>
      {/* 对接信息 */}
      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 6 }}>
        {p.contactName} · {p.leaders.join(',')}
      </div>
      {/* 各账号独立进度 */}
      {p.accountDetails.map((acc: any) => (
        <div key={acc.id} style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
            <span style={{ color: '#595959' }}>
              {acc.status === '暂停' && <Tag color="orange" style={{ margin: 0, padding: '0 2px', fontSize: 10, lineHeight: '14px' }}>停</Tag>}
              {acc.status === '异常' && <Tag color="red" style={{ margin: 0, padding: '0 2px', fontSize: 10, lineHeight: '14px' }}>异</Tag>}
              {' '}{acc.name}
            </span>
            <span>
              <span style={{ fontWeight: 600, color: getProgressColor(acc.rate) }}>{acc.completed}</span>
              <span style={{ color: '#bfbfbf' }}>/{acc.planned}条</span>
            </span>
          </div>
          <div style={{ height: 3, background: '#f0f0f0', borderRadius: 2, marginTop: 2, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(acc.rate, 100)}%`, height: '100%',
              background: getProgressColor(acc.rate),
              borderRadius: 2,
            }} />
          </div>
        </div>
      ))}
      {/* 底部收款状态 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 4, borderTop: '1px dashed #e8e8e8' }}>
        <span style={{ fontSize: 12, color: '#8c8c8c' }}>
          合计 {p.monthCompleted}/{p.monthPlanned}条
        </span>
        <span style={{ fontSize: 12 }}>
          {p.monthUnpaid > 0
            ? <span style={{ color: '#f5222d' }}>未收 {formatMoney(p.monthUnpaid)}</span>
            : p.monthPaymentAmount === 0
              ? <span style={{ color: '#8c8c8c' }}>自有不付</span>
              : <span style={{ color: '#52c41a' }}>✅已收</span>}
        </span>
      </div>
    </Card>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22 }}>
          项目总览
          {filterGroupId && (() => {
            const fg = groups.find((g) => g.id === filterGroupId)
            const theme = fg ? getGroupTheme(fg.id, 0) : null
            return (
              <span style={{ marginLeft: 12 }}>
                <Tag closable onClose={() => navigate('/overview')} style={{
                  margin: 0, fontSize: 13, padding: '2px 10px', fontWeight: 600,
                  borderColor: theme?.border, color: theme?.border, background: theme?.bg,
                }}>
                  {fg?.name || filterGroupId}
                </Tag>
              </span>
            )
          })()}
        </h2>
        <Button icon={<DownloadOutlined />} onClick={handleExport}>导出</Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        {(filterGroupId ? groups.filter((g) => g.id === filterGroupId) : groups).map((g, gi) => {
          const theme = getGroupTheme(g.id, gi)
          const gAccountCount = accounts.filter((a) => {
            const proj = activeProjects.find((p) => p.id === a.projectId)
            return proj?.groupId === g.id && a.status !== '暂停'
          }).length
          const isOwnGroup = !!(currentGroup && g.id === currentGroup)
          return (
            <Col xs={8} sm={groups.length > 4 ? 4 : 6} key={g.id}>
              <Card size="small" style={{
                textAlign: 'center',
                borderTop: `${isOwnGroup ? 5 : 3}px solid ${isOwnGroup ? theme.darkBorder : '#d9d9d9'}`,
                background: isOwnGroup ? theme.darkBg : '#fafafa',
                boxShadow: isOwnGroup ? `0 0 16px ${theme.border}40` : undefined,
                transform: isOwnGroup ? 'scale(1.05)' : undefined,
                transition: 'all 0.3s ease',
                zIndex: isOwnGroup ? 1 : 0,
              }}>
                <div style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: isOwnGroup ? theme.darkBorder : '#595959',
                }}>{gAccountCount}</div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                  {g.name}
                  {isOwnGroup && <span style={{ color: theme.darkBorder, marginLeft: 2, fontWeight: 700 }}> · 我的</span>}
                </div>
              </Card>
            </Col>
          )
        })}
        <Col xs={8} sm={4}>
          <Card size="small" style={{ textAlign: 'center', borderTop: '3px solid #fa8c16' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#fa8c16' }}>{activeLeads.length}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>洽谈中</div>
          </Card>
        </Col>
        <Col xs={8} sm={4}>
          <Card size="small" style={{ textAlign: 'center', borderTop: '3px solid #8c8c8c' }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{accounts.filter((a) => {
              const proj = activeProjects.find((p) => p.id === a.projectId)
              return proj && a.status !== '暂停'
            }).length}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>进行中账号</div>
          </Card>
        </Col>
      </Row>

      {/* 各组分区看板 */}
      <div style={groups.length > 4 ? { overflowX: 'auto', paddingBottom: 8 } : undefined}>
        <Row gutter={[12, 12]} style={groups.length > 4 ? { flexWrap: 'nowrap', minWidth: 'max-content' } : undefined}>
        {groupProjects.map((g, gi) => {
          const theme = getGroupTheme(g.id, gi)
          const colSpan = groups.length <= 3 ? 8 : groups.length === 4 ? 6 : 6
          const isOwnGroup = !!(currentGroup && g.id === currentGroup)
          return (
            <Col xs={24} md={colSpan} key={g.id} style={{
              ...(groups.length > 4 ? { minWidth: 300 } : {}),
              transform: isOwnGroup ? 'scale(1.02)' : undefined,
              transition: 'all 0.3s ease',
            }}>
              <Card
                size="small"
                style={{
                  height: '100%',
                  background: isOwnGroup ? theme.darkBg : '#f5f5f5',
                  borderColor: isOwnGroup ? theme.darkBorder : '#d9d9d9',
                  borderWidth: isOwnGroup ? 3 : 1,
                  boxShadow: isOwnGroup ? `0 0 20px ${theme.border}50` : undefined,
                }}
                styles={{ body: { padding: 10 } }}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      display: 'inline-block',
                      width: isOwnGroup ? 12 : 8, height: isOwnGroup ? 12 : 8,
                      borderRadius: '50%', background: theme.dot,
                      boxShadow: isOwnGroup ? `0 0 6px ${theme.border}` : undefined,
                    }} />
                    <span style={{
                      color: isOwnGroup ? theme.darkBorder : '#8c8c8c',
                      fontWeight: isOwnGroup ? 800 : 600,
                      fontSize: isOwnGroup ? 16 : 14,
                    }}>{g.name}</span>
                    <span style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 400 }}>({g.projects.length}个)</span>
                    {isOwnGroup && <Tag color="blue" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>我的组</Tag>}
                  </div>
                }
              >
                {g.projects.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#bfbfbf', padding: 20 }}>暂无项目</div>
                ) : (
                  g.projects.map((p) => renderProjectCard(p, theme, isOwnGroup))
                )}
              </Card>
            </Col>
          )
        })}
      </Row>
      </div>

      {/* 洽谈中项目 */}
      <Card
        size="small"
        style={{ marginTop: 16, background: leadTheme.headerBg, borderColor: leadTheme.border }}
        styles={{ body: { padding: 12 } }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: leadTheme.dot }} />
            <span style={{ color: leadTheme.border, fontWeight: 700 }}>洽谈中项目</span>
            <span style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 400 }}>({activeLeads.length})</span>
          </div>
        }
        extra={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="small" icon={<DownloadOutlined />} onClick={handleExportLeads}>导出</Button>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setLeadModalOpen(true)}>新增</Button>
          </div>
        }
      >
        {activeLeads.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#bfbfbf', padding: 20 }}>暂无洽谈中项目</div>
        ) : isMobile ? (
          activeLeads.map((l) => (
            <Card key={l.id} size="small" style={{ marginBottom: 8, borderLeft: `4px solid ${leadTheme.border}`, background: leadTheme.bg }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{l.name}</span>
                  <Tag color="orange" style={{ marginLeft: 8 }}>{l.stage}</Tag>
                </div>
                <Button size="small" type="link" onClick={() => handleConvert(l.id)}>转正式</Button>
              </div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                对接人: {l.contactName} | 洽谈人: {negotiatorName(l.negotiatorId)} | 预估: ¥{l.estimatedMonthlyFee || 0}/月
              </div>
              <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>{l.stageNote}</div>
              {l.nextFollowUpDate && <div style={{ fontSize: 12, color: '#fa8c16' }}>下次跟进: {l.nextFollowUpDate}</div>}
            </Card>
          ))
        ) : (
          <Table
            dataSource={activeLeads}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              {
                title: '项目名', dataIndex: 'name', width: 130,
                render: (v: string, record) => (
                  <Input
                    size="small"
                    variant="borderless"
                    value={v}
                    style={{ fontWeight: 700, fontSize: 14, padding: '2px 4px' }}
                    onChange={(e) => updateLead(record.id, { name: e.target.value })}
                  />
                ),
              },
              {
                title: '对接人', dataIndex: 'contactName', width: 90,
                render: (v: string, record) => (
                  <Input
                    size="small"
                    variant="borderless"
                    value={v}
                    style={{ padding: '2px 4px' }}
                    onChange={(e) => updateLead(record.id, { contactName: e.target.value })}
                  />
                ),
              },
              {
                title: '洽谈人', dataIndex: 'negotiatorId', width: 90,
                render: (v: string, record) => (
                  <Select
                    size="small"
                    variant="borderless"
                    value={v}
                    style={{ width: '100%' }}
                    onChange={(val) => updateLead(record.id, { negotiatorId: val })}
                    options={staff.filter((s) => s.status === '在职').map((s) => ({ label: s.name, value: s.id }))}
                  />
                ),
              },
              {
                title: '倾向组', width: 90, render: (_, record) => (
                  <Select
                    size="small"
                    variant="borderless"
                    value={record.groupId || '待定'}
                    style={{ width: '100%' }}
                    onChange={(v) => updateLead(record.id, { groupId: v })}
                    options={[...groups.map((g) => ({ label: g.name, value: g.id })), { label: '待定', value: '待定' }]}
                  />
                ),
              },
              {
                title: '预估月费', dataIndex: 'estimatedMonthlyFee', width: 100,
                render: (v: number | undefined, record) => (
                  <InputNumber
                    size="small"
                    variant="borderless"
                    value={v}
                    style={{ width: '100%' }}
                    placeholder="0"
                    onChange={(val) => updateLead(record.id, { estimatedMonthlyFee: val ?? undefined })}
                  />
                ),
              },
              {
                title: '洽谈阶段', dataIndex: 'stage', width: 280,
                render: (stage: LeadStage) => {
                  const idx = stageStepIndex[stage]
                  if (idx < 0) return <Tag>{stage}</Tag>
                  return (
                    <Steps
                      size="small"
                      current={idx}
                      style={{ maxWidth: 250 }}
                      items={stageSteps.slice(0, 5).map((s) => ({ title: s }))}
                    />
                  )
                },
              },
              {
                title: '最新进展', dataIndex: 'stageNote', width: 150,
                render: (v: string, record) => (
                  <Input.TextArea
                    size="small"
                    variant="borderless"
                    value={v}
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    style={{ padding: '2px 4px', fontSize: 12 }}
                    placeholder="一句话描述"
                    onChange={(e) => updateLead(record.id, { stageNote: e.target.value })}
                  />
                ),
              },
              {
                title: '操作', width: 110,
                render: (_, record) => (
                  <Select
                    size="small"
                    value="操作"
                    style={{ width: 100 }}
                    onChange={(v) => {
                      if (v === 'convert') {
                        handleConvert(record.id)
                      } else if (v === 'lost') {
                        updateLead(record.id, { stage: '已流失' })
                      } else {
                        updateLead(record.id, { stage: v as LeadStage })
                      }
                    }}
                    options={[
                      { label: '阶段', options: stageSteps.map((s) => ({ label: s, value: s })) },
                      { label: '操作', options: [
                        { label: '转正式项目', value: 'convert' },
                        { label: '标记为已流失', value: 'lost' },
                      ]},
                    ]}
                  />
                ),
              },
            ]}
          />
        )}
      </Card>

      {/* 新增洽谈项目 Modal */}
      <Modal
        title="新增洽谈项目"
        open={leadModalOpen}
        onOk={handleAddLead}
        onCancel={() => { setLeadModalOpen(false); leadForm.resetFields() }}
        width={isMobile ? '95%' : 500}
      >
        <Form form={leadForm} layout="vertical">
          <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="如：户外露营基地" />
          </Form.Item>
          <Form.Item name="contactName" label="对接人" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="如：赵总" />
          </Form.Item>
          <Form.Item name="negotiatorId" label="洽谈人" rules={[{ required: true, message: '请选择' }]}>
            <Select
              placeholder="选择洽谈人"
              options={staff.filter((s) => s.status === '在职').map((s) => ({ label: `${s.name} (${s.roles.join('/')})`, value: s.id }))}
            />
          </Form.Item>
          <Form.Item name="groupId" label="倾向组">
            <Select allowClear placeholder="待定" options={[...groups.map((g) => ({ label: g.name, value: g.id })), { label: '待定', value: '待定' }]} />
          </Form.Item>
          <Form.Item name="estimatedMonthlyFee" label="预估月费">
            <Input type="number" placeholder="如：8000" />
          </Form.Item>
          <Form.Item name="stage" label="洽谈阶段" initialValue="初次接触">
            <Select options={stageSteps.map((s) => ({ label: s, value: s }))} />
          </Form.Item>
          <Form.Item name="stageNote" label="最新进展">
            <Input.TextArea rows={2} placeholder="一句话描述当前进展" />
          </Form.Item>
          <Form.Item name="nextFollowUpDate" label="下次跟进日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
