import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Row, Col, Tag, Button, Table, Progress, Modal, Form, Input, InputNumber,
  Select, DatePicker, Space, message, Descriptions, Timeline, Empty, Popconfirm,
  Tooltip,
} from 'antd'
import {
  ArrowLeftOutlined, PlusOutlined, EditOutlined, DownloadOutlined, DeleteOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import { useStore } from '../store/useStore'
import type { PaymentStatus } from '../types'
import { calcProjectMonthData, formatMoney, getStaffNames, issueTypeColors, getRecentMonths } from '../utils/helpers'
import { exportToExcel } from '../utils/excel'
import StaffSelect from '../components/StaffSelect'
import dayjs from 'dayjs'

export default function ProjectDetail() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const {
    projects, accounts, monthlyRecords, issues, staff, groups,
    selectedMonth, setSelectedMonth,
    updateProject, addAccount, updateAccount, deleteAccount,
    addMonthlyRecord, updateMonthlyRecord, incrementCompleted,
    addIssue, updateIssue, deleteIssue,
  } = useStore()

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [editAccountModalOpen, setEditAccountModalOpen] = useState(false)
  const [issueModalOpen, setIssueModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)

  const [editForm] = Form.useForm()
  const [accountForm] = Form.useForm()
  const [editAccountForm] = Form.useForm()
  const [issueForm] = Form.useForm()
  const [paymentForm] = Form.useForm()
  const isMobile = window.innerWidth <= 768

  const project = projects.find((p) => p.id === projectId)

  if (!project) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Empty description="项目不存在" />
        <Button onClick={() => navigate(-1)}>返回</Button>
      </div>
    )
  }

  const projectAccounts = accounts.filter((a) => a.projectId === project.id)
  const projectIssues = issues.filter((i) => i.projectId === project.id)
  const d = calcProjectMonthData(project, accounts, monthlyRecords, issues, selectedMonth)

  const leaders = getStaffNames(staff, project.leaderIds)
  const directors = getStaffNames(staff, project.directorIds)
  const copywriters = getStaffNames(staff, project.copywriterIds)
  const videographers = getStaffNames(staff, project.videographerIds)
  const editors = getStaffNames(staff, project.editorIds)

  const monthRecords = monthlyRecords.filter((r) => r.projectId === project.id && r.yearMonth === selectedMonth)
  const recentMonths = getRecentMonths(6)

  const handleEditProject = () => {
    editForm.validateFields().then((values) => {
      updateProject(project.id, {
        ...values,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        leaderIds: values.leaderIds || [],
        directorIds: values.directorIds || [],
        copywriterIds: values.copywriterIds || [],
        videographerIds: values.videographerIds || [],
        editorIds: values.editorIds || [],
      })
      message.success('项目已更新')
      setEditModalOpen(false)
    })
  }

  const handleAddAccount = () => {
    accountForm.validateFields().then((values) => {
      addAccount({ ...values, projectId: project.id, status: '正常' })
      message.success('账号已添加')
      accountForm.resetFields()
      setAccountModalOpen(false)
    })
  }

  const handleEditAccount = () => {
    editAccountForm.validateFields().then((values) => {
      if (editingAccountId) {
        const updateValues = { ...values }
        if (values.status !== '异常') {
          updateValues.abnormalNote = ''
        }
        updateAccount(editingAccountId, updateValues)
        message.success('账号已更新')
        setEditAccountModalOpen(false)
      }
    })
  }

  const handleEditPayment = () => {
    paymentForm.validateFields().then((values) => {
      if (editingRecordId) {
        const status = values.paymentStatus
        const isNoPay = status === '不付'
        const paymentAmount = isNoPay ? 0 : (values.paymentAmount || 0)
        let paidAmount = isNoPay ? 0 : (values.paidAmount || 0)
        if (status === '未收') paidAmount = 0
        if (status === '已收') paidAmount = paymentAmount
        updateMonthlyRecord(editingRecordId, {
          paymentAmount,
          paidAmount,
          paymentStatus: status,
          plannedCount: values.plannedCount || 0,
        })
        message.success('收款信息已更新')
        setPaymentModalOpen(false)
      }
    })
  }

  const handleAddIssue = () => {
    issueForm.validateFields().then((values) => {
      addIssue({
        ...values,
        projectId: project.id,
        status: '未处理',
        occurredDate: new Date().toISOString().slice(0, 10),
      })
      // 问题类型为"暂停"时，项目状态自动变为"暂停"
      if (values.type === '暂停') {
        updateProject(project.id, { status: '暂停' })
      }
      message.success('问题已记录')
      issueForm.resetFields()
      setIssueModalOpen(false)
    })
  }

  const handleExport = () => {
    const data = recentMonths.map((m) => {
      const records = monthlyRecords.filter((r) => r.projectId === project.id && r.yearMonth === m)
      return {
        '月份': m,
        '计划': records.reduce((s, r) => s + r.plannedCount, 0),
        '已完成': records.reduce((s, r) => s + r.completedCount, 0),
        '应收': records.reduce((s, r) => s + r.paymentAmount, 0),
        '已收': records.reduce((s, r) => s + r.paidAmount, 0),
      }
    })
    exportToExcel(data, `${project.name}_月度记录`, '月度记录')
  }

  const ensureAndUpdateRecord = (record: any, updates: Partial<MonthlyRecord>) => {
    if (record.isEmpty) {
      addMonthlyRecord({
        accountId: record.accountId,
        projectId: project.id,
        yearMonth: record.month,
        plannedCount: 0,
        completedCount: 0,
        thisWeekPlan: 0,
        lastWeekPlan: 0,
        lastWeekActual: 0,
        paymentAmount: 0,
        paymentStatus: '未收',
        paidAmount: 0,
        ...updates,
      })
    } else {
      updateMonthlyRecord(record.id, updates)
    }
  }

  const activeStaff = staff.filter((s) => s.status === '在职')

  return (
    <div>
      {/* 顶部信息 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} type="text" />
        <h2 style={{ margin: 0, flex: 1, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: '#262626' }}>{project.name}</h2>
        <Button icon={<EditOutlined />} onClick={() => {
          editForm.setFieldsValue({
            ...project,
            startDate: project.startDate ? dayjs(project.startDate) : null,
          })
          setEditModalOpen(true)
        }}>编辑项目</Button>
      </div>

      {/* 基本信息 + 人员 */}
      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>
          <Card title="基本信息" size="small" extra={
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => {
              editForm.setFieldsValue({
                ...project,
                startDate: project.startDate ? dayjs(project.startDate) : null,
              })
              setEditModalOpen(true)
            }} />
          }>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="对接人">{project.contactName}</Descriptions.Item>
              <Descriptions.Item label="所属组">{groups.find((g) => g.id === project.groupId)?.name}</Descriptions.Item>
              <Descriptions.Item label="合作时间">{project.cooperationPeriod}</Descriptions.Item>
              <Descriptions.Item label="付款方式">{project.paymentType}</Descriptions.Item>
              <Descriptions.Item label="收款时间">{project.paymentDate || '-'}</Descriptions.Item>
              <Descriptions.Item label="月费">{formatMoney(project.monthlyFee)}</Descriptions.Item>
              <Descriptions.Item label="开始日期">{project.startDate}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={project.status === '进行中' ? 'blue' : project.status === '暂停' ? 'orange' : 'default'}>{project.status}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="项目人员" size="small" extra={
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => {
              editForm.setFieldsValue({
                ...project,
                startDate: project.startDate ? dayjs(project.startDate) : null,
              })
              setEditModalOpen(true)
            }} />
          }>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="组长">{leaders.join('、') || '-'}</Descriptions.Item>
              <Descriptions.Item label="编导">{directors.join('、') || '-'}</Descriptions.Item>
              <Descriptions.Item label="文案">{copywriters.join('、') || '-'}</Descriptions.Item>
              <Descriptions.Item label="摄影师">{videographers.join('、') || '-'}</Descriptions.Item>
              <Descriptions.Item label="剪辑">{editors.join('、') || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* 本月进度 */}
      <Card
        title={`${selectedMonth} 月度进度`}
        size="small"
        style={{ marginTop: 12 }}
        extra={
          <Select size="small" value={selectedMonth} onChange={setSelectedMonth}
            style={{ width: 100 }}
            options={recentMonths.map((m) => ({ label: m, value: m }))} />
        }
      >
        <Row gutter={[16, 12]}>
          <Col xs={12} sm={6} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{d.monthPlanned}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>本月计划</div>
          </Col>
          <Col xs={12} sm={6} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1677ff' }}>{d.monthCompleted}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>已完成</div>
          </Col>
          <Col xs={12} sm={6} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: d.monthRemaining > 0 ? '#fa8c16' : '#52c41a' }}>{d.monthRemaining}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>剩余</div>
          </Col>
          <Col xs={12} sm={6} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: d.completionRate >= 80 ? '#52c41a' : '#fa8c16' }}>{d.completionRate.toFixed(1)}%</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>完成率</div>
          </Col>
        </Row>
        <Progress percent={d.completionRate} style={{ marginTop: 12 }}
          format={(p) => `${(p ?? 0).toFixed(1)}%`}
          strokeColor={d.completionRate >= 80 ? '#52c41a' : d.completionRate >= 50 ? '#1677ff' : '#fa8c16'} />
        <Row gutter={[16, 8]} style={{ marginTop: 12 }}>
          <Col xs={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{formatMoney(d.monthPaymentAmount)}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>应收</div>
          </Col>
          <Col xs={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#52c41a' }}>{formatMoney(d.monthPaidAmount)}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>已收</div>
          </Col>
          <Col xs={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: d.monthUnpaid > 0 ? '#f5222d' : '#52c41a' }}>{formatMoney(d.monthUnpaid)}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>未收</div>
          </Col>
        </Row>
      </Card>

      {/* 账号管理 - 全字段可编辑 */}
      <Card
        title="账号管理" size="small" style={{ marginTop: 12 }}
        extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setAccountModalOpen(true)}>添加账号</Button>}
      >
        <Table
          dataSource={projectAccounts}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 700 }}
          columns={[
            {
              title: '账号名', dataIndex: 'name', width: 120,
              render: (name: string, record: any) => (
                <Space>
                  <span>{name}</span>
                  <Button size="small" type="text" icon={<EditOutlined />} onClick={() => {
                    setEditingAccountId(record.id)
                    editAccountForm.setFieldsValue(record)
                    setEditAccountModalOpen(true)
                  }} />
                </Space>
              ),
            },
            {
              title: '每月配额', dataIndex: 'monthlyQuota', width: 80,
              render: (val: number, record: any) => (
                <InputNumber
                  size="small" value={val} min={0}
                  onChange={(v) => updateAccount(record.id, { monthlyQuota: v ?? 0 })}
                  style={{ width: 60 }}
                />
              ),
            },
            {
              title: '本月已完成', width: 130,
              render: (_, record: any) => {
                const mr = monthRecords.find((r) => r.accountId === record.id)
                if (!mr) return '-'
                return (
                  <Space>
                    <InputNumber
                      size="small" value={mr.completedCount}
                      onChange={(v) => updateMonthlyRecord(mr.id, { completedCount: v ?? 0 })}
                      style={{ width: 60 }}
                    />
                    <Button size="small" type="primary" shape="circle" icon={<PlusOutlined />}
                      onClick={() => incrementCompleted(mr.id)} />
                  </Space>
                )
              },
            },
            {
              title: '收款', width: 200,
              render: (_, record: any) => {
                const mr = monthRecords.find((r) => r.accountId === record.id)
                if (!mr) return '-'
                const statusColor = mr.paymentStatus === '已收' ? 'green' : mr.paymentStatus === '部分收' ? 'orange' : mr.paymentStatus === '不付' ? 'default' : 'red'
                return (
                  <Space>
                    <Tag color={statusColor}>{mr.paymentStatus}</Tag>
                    {mr.paymentStatus !== '不付' && (
                      <span style={{ fontSize: 12, color: '#595959' }}>
                        {formatMoney(mr.paidAmount)}/{formatMoney(mr.paymentAmount)}
                      </span>
                    )}
                    <Tooltip title="编辑收款信息">
                      <Button size="small" type="text" icon={<DollarOutlined />} onClick={() => {
                        setEditingRecordId(mr.id)
                        paymentForm.setFieldsValue({
                          plannedCount: mr.plannedCount,
                          paymentAmount: mr.paymentAmount,
                          paidAmount: mr.paidAmount,
                          paymentStatus: mr.paymentStatus,
                        })
                        setPaymentModalOpen(true)
                      }} />
                    </Tooltip>
                  </Space>
                )
              },
            },
            {
              title: '状态', dataIndex: 'status', width: 120,
              render: (s: string, record: any) => (
                <Space direction="vertical" size={0}>
                  <Space size={4}>
                    <Tag color={s === '正常' ? 'green' : s === '暂停' ? 'orange' : 'red'}>{s}</Tag>
                    <Button size="small" type="text" icon={<EditOutlined />} onClick={() => {
                      setEditingAccountId(record.id)
                      editAccountForm.setFieldsValue(record)
                      setEditAccountModalOpen(true)
                    }} />
                  </Space>
                  {s === '异常' && record.abnormalNote && (
                    <span style={{ fontSize: 11, color: '#f5222d' }}>{record.abnormalNote}</span>
                  )}
                </Space>
              ),
            },
            {
              title: '', width: 50,
              render: (_, record: any) => (
                <Popconfirm title="确认删除此账号？" onConfirm={() => { deleteAccount(record.id); message.success('已删除') }}>
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>

      {/* 月度历史 - 可编辑 */}
      <Card
        title="月度记录历史（可编辑）" size="small" style={{ marginTop: 12 }}
        extra={<Button size="small" icon={<DownloadOutlined />} onClick={handleExport}>导出</Button>}
      >
        <Table
          dataSource={recentMonths.flatMap((m) => {
            if (projectAccounts.length === 0) {
              return [{ key: `${m}_empty`, month: m, isEmpty: true, noAccount: true }]
            }
            return projectAccounts.map((account, idx) => {
              const record = monthlyRecords.find((r) => r.projectId === project.id && r.accountId === account.id && r.yearMonth === m)
              const base = {
                key: record?.id || `${m}_${account.id}`,
                month: m,
                accountId: account.id,
                accountName: account.name,
                isEmpty: !record,
                rowSpan: idx === 0 ? projectAccounts.length : 0,
              }
              if (record) return { ...record, ...base }
              return {
                ...base,
                plannedCount: 0,
                completedCount: 0,
                paymentAmount: 0,
                paidAmount: 0,
                paymentStatus: '未收' as PaymentStatus,
              }
            })
          })}
          rowKey="key"
          size="small"
          pagination={false}
          scroll={{ x: 700 }}
          columns={[
            { title: '月份', dataIndex: 'month', width: 80,
              render: (m: string, record: any) => ({
                children: <span style={{ fontWeight: 600 }}>{m}</span>,
                props: { rowSpan: record.rowSpan || 0 },
              }),
            },
            { title: '账号', dataIndex: 'accountName', width: 120,
              render: (name: string, record: any) => record.noAccount ? <span style={{ color: '#bfbfbf' }}>无账号</span> : name,
            },
            { title: '计划', dataIndex: 'plannedCount', width: 70,
              render: (v: number, record: any) => record.noAccount ? '-' : (
                <InputNumber
                  size="small" value={v} min={0}
                  onChange={(val) => ensureAndUpdateRecord(record, { plannedCount: val ?? 0 })}
                  style={{ width: 56 }}
                />
              ),
            },
            { title: '已完成', width: 80,
              render: (_, record: any) => record.noAccount ? '-' : (
                <InputNumber
                  size="small" value={record.completedCount}
                  onChange={(v) => ensureAndUpdateRecord(record, { completedCount: v ?? 0 })}
                  style={{ width: 56 }}
                />
              ),
            },
            { title: '应收', width: 90,
              render: (_, record: any) => record.noAccount ? '-' : (
                <InputNumber
                  size="small" value={record.paymentAmount}
                  onChange={(v) => ensureAndUpdateRecord(record, { paymentAmount: v ?? 0 })}
                  style={{ width: 72 }}
                  prefix="¥"
                  disabled={record.paymentStatus === '不付'}
                />
              ),
            },
            { title: '已收', width: 90,
              render: (_, record: any) => record.noAccount ? '-' : (
                <InputNumber
                  size="small" value={record.paidAmount}
                  onChange={(v) => {
                    const val = v ?? 0
                    const status = val >= record.paymentAmount ? '已收' : val > 0 ? '部分收' : '未收'
                    ensureAndUpdateRecord(record, { paidAmount: val, paymentStatus: status })
                  }}
                  style={{ width: 72 }}
                  prefix="¥"
                  disabled={record.paymentStatus === '不付'}
                />
              ),
            },
            { title: '状态', width: 90,
              render: (_, record: any) => record.noAccount ? '-' : (
                <Select
                  size="small" value={record.paymentStatus}
                  style={{ width: 72 }}
                  onChange={(v) => {
                    if (v === '不付') {
                      ensureAndUpdateRecord(record, { paymentStatus: '不付', paymentAmount: 0, paidAmount: 0 })
                    } else if (v === '未收') {
                      ensureAndUpdateRecord(record, { paymentStatus: '未收', paidAmount: 0 })
                    } else if (v === '已收') {
                      ensureAndUpdateRecord(record, { paymentStatus: '已收', paidAmount: record.paymentAmount })
                    } else {
                      // 部分收：保持当前已收金额（如果之前是0或全额，则默认0让用户手动输入）
                      const current = record.paidAmount
                      const nextPaid = current > 0 && current < record.paymentAmount ? current : 0
                      ensureAndUpdateRecord(record, { paymentStatus: '部分收', paidAmount: nextPaid })
                    }
                  }}
                  options={[
                    { label: '未收', value: '未收' },
                    { label: '部分收', value: '部分收' },
                    { label: '已收', value: '已收' },
                    { label: '不付', value: '不付' },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 问题记录 */}
      <Card
        title={`问题记录 (${projectIssues.length})`} size="small" style={{ marginTop: 12 }}
        extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setIssueModalOpen(true)}>记录问题</Button>}
      >
        {projectIssues.length === 0 ? (
          <Empty description="暂无问题" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Timeline
            items={projectIssues.map((i) => ({
              color: i.status === '已解决' ? 'green' : i.status === '处理中' ? 'orange' : 'red',
              children: (
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Tag color={issueTypeColors[i.type]}>{i.type}</Tag>
                    <span>{i.description}</span>
                    <Button size="small" type="text" danger icon={<DeleteOutlined />}
                      onClick={() => { deleteIssue(i.id); message.success('已删除') }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                    {i.occurredDate} · 状态:
                    <Select
                      size="small" value={i.status} style={{ width: 80, marginLeft: 4 }}
                      onChange={(v) => updateIssue(i.id, { status: v, resolvedDate: v === '已解决' ? new Date().toISOString().slice(0, 10) : undefined })}
                      options={[{ label: '未处理', value: '未处理' }, { label: '处理中', value: '处理中' }, { label: '已解决', value: '已解决' }]}
                    />
                  </div>
                </div>
              ),
            }))}
          />
        )}
      </Card>

      {/* ===== 编辑项目 Modal ===== */}
      <Modal
        title="编辑项目" open={editModalOpen}
        onOk={handleEditProject} onCancel={() => setEditModalOpen(false)}
        width={isMobile ? '95%' : 600}
        style={isMobile ? { top: 20, paddingBottom: 20 } : undefined}
        styles={isMobile ? { body: { maxHeight: '75vh', overflowY: 'auto' } } : undefined}
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="name" label="项目名称" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactName" label="对接人" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="groupId" label="所属组" rules={[{ required: true }]}>
                <Select options={groups.map((g) => ({ label: g.name, value: g.id }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="状态">
                <Select options={['进行中', '暂停', '已完成', '已终止'].map((s) => ({ label: s, value: s }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="cooperationPeriod" label="合作时间">
                <Input placeholder="如：尝试两个月" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paymentType" label="付款方式">
                <Select options={['月付后付', '月付预付', '一次性', '季度付'].map((p) => ({ label: p, value: p }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={24}>
              <Form.Item name="paymentDate" label="收款时间">
                <Input placeholder="如：每月5日、首次拍摄收50%预计8月16日、根据情况而定" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="monthlyFee" label="月度费用">
                <Input style={{ width: '100%' }} placeholder="如：5000 或 无基础费用，提成50%" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="startDate" label="开始日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ fontWeight: 600, marginBottom: 8, marginTop: 8 }}>人员配置（可多选，可跨组）</div>
          <Row gutter={8}>
            <Col xs={24} md={12}>
              <Form.Item name="leaderIds" label="组长">
                <StaffSelect staff={activeStaff} isMobile={isMobile} placeholder="选择组长" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="directorIds" label="编导">
                <StaffSelect staff={activeStaff} isMobile={isMobile} placeholder="选择编导" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col xs={24} md={12}>
              <Form.Item name="copywriterIds" label="文案">
                <StaffSelect staff={activeStaff} isMobile={isMobile} placeholder="选择文案" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="videographerIds" label="摄影师">
                <StaffSelect staff={activeStaff} isMobile={isMobile} placeholder="选择摄影师" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="editorIds" label="剪辑">
            <StaffSelect staff={activeStaff} isMobile={isMobile} placeholder="选择剪辑" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== 添加账号 Modal ===== */}
      <Modal
        title="添加账号" open={accountModalOpen}
        onOk={handleAddAccount} onCancel={() => { setAccountModalOpen(false); accountForm.resetFields() }}
        width={isMobile ? '90%' : 400}
      >
        <Form form={accountForm} layout="vertical">
          <Form.Item name="name" label="账号名称" rules={[{ required: true }]}>
            <Input placeholder="如：拾景园主号" />
          </Form.Item>
          <Form.Item name="monthlyQuota" label="每月条数" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} placeholder="如：10" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== 编辑账号 Modal ===== */}
      <Modal
        title="编辑账号" open={editAccountModalOpen}
        onOk={handleEditAccount} onCancel={() => setEditAccountModalOpen(false)}
        width={isMobile ? '90%' : 400}
      >
        <Form form={editAccountForm} layout="vertical">
          <Form.Item name="name" label="账号名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="monthlyQuota" label="每月配额" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[
              { label: '正常', value: '正常' },
              { label: '暂停', value: '暂停' },
              { label: '异常', value: '异常' },
            ]} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.status !== cur.status}>
            {({ getFieldValue }) => getFieldValue('status') === '异常' && (
              <Form.Item name="abnormalNote" label="异常说明" rules={[{ required: true, message: '请填写异常说明' }]}>
                <Input.TextArea rows={2} placeholder="如：账号被限流、违规封禁等" />
              </Form.Item>
            )}
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== 编辑收款 Modal ===== */}
      <Modal
        title="编辑收款信息" open={paymentModalOpen}
        onOk={handleEditPayment} onCancel={() => setPaymentModalOpen(false)}
        width={isMobile ? '90%' : 400}
      >
        <Form form={paymentForm} layout="vertical">
          <Form.Item name="plannedCount" label="本月计划条数">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="paymentAmount" label="应收金额">
            <InputNumber style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
          <Form.Item name="paidAmount" label="已收金额">
            <InputNumber style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
          <Form.Item name="paymentStatus" label="收款状态">
            <Select options={[
              { label: '未收', value: '未收' },
              { label: '部分收', value: '部分收' },
              { label: '已收', value: '已收' },
              { label: '不付（自有账号）', value: '不付' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== 问题录入 Modal ===== */}
      <Modal
        title="记录问题" open={issueModalOpen}
        onOk={handleAddIssue} onCancel={() => { setIssueModalOpen(false); issueForm.resetFields() }}
        width={isMobile ? '90%' : 400}
      >
        <Form form={issueForm} layout="vertical">
          <Form.Item name="type" label="问题类型" rules={[{ required: true }]} initialValue="限流">
            <Select options={[
              { label: '限流', value: '限流' },
              { label: '暂停', value: '暂停' },
              { label: '违规', value: '违规' },
              { label: '其他', value: '其他' },
            ]} />
          </Form.Item>
          <Form.Item name="description" label="问题描述" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="一句话描述问题" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
