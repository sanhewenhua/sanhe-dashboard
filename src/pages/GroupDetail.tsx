import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Table, Tag, Button, Input, InputNumber, Select, Progress, Space, Tooltip, Popconfirm, message, Row, Col, Modal, Form, DatePicker, Collapse } from 'antd'
import { PlusOutlined, MinusOutlined, EditOutlined, FileTextOutlined, DeleteOutlined, ThunderboltOutlined, CaretRightOutlined } from '@ant-design/icons'
import { useStore } from '../store/useStore'
import { calcProjectMonthData, formatMoney, getStaffNames, issueTypeColors } from '../utils/helpers'
import { exportToExcel } from '../utils/excel'
import StaffSelect from '../components/StaffSelect'
import type { MonthlyRecord, IssueType, OneTimeProject } from '../types'
import dayjs from 'dayjs'

export default function GroupDetail() {
  const { groupId = 'A' } = useParams()
  const navigate = useNavigate()
  const {
    projects, accounts, monthlyRecords, issues, staff, groups,
    selectedMonth, setSelectedMonth, updateMonthlyRecord, incrementCompleted,
    addIssue, addProject, deleteProject, updateProject,
    oneTimeProjects, addOneTimeProject, updateOneTimeProject, deleteOneTimeProject,
  } = useStore()

  const [editingRecord, setEditingRecord] = useState<string | null>(null)
  const [issueModalFor, setIssueModalFor] = useState<string | null>(null)
  const [newIssue, setNewIssue] = useState<{ type: IssueType; desc: string }>({ type: '限流', desc: '' })
  const [addProjectModalOpen, setAddProjectModalOpen] = useState(false)
  const [projectForm] = Form.useForm()
  const [otModalOpen, setOtModalOpen] = useState(false)
  const [editingOtId, setEditingOtId] = useState<string | null>(null)
  const [otForm] = Form.useForm()
  const isMobile = window.innerWidth <= 768

  const group = groups.find((g) => g.id === groupId)
  const groupStaff = staff.filter((s) => s.groupId === groupId)
  const groupProjects = projects.filter((p) => p.groupId === groupId)

  const tableData = useMemo(() => {
    return groupProjects.map((p) => {
      const d = calcProjectMonthData(p, accounts, monthlyRecords, issues, selectedMonth)
      const leaders = getStaffNames(staff, p.leaderIds)
      const copywriters = getStaffNames(staff, p.copywriterIds)
      const videographers = getStaffNames(staff, p.videographerIds)
      const editors = getStaffNames(staff, p.editorIds)
      const projectIssues = issues.filter((i) => i.projectId === p.id && i.status !== '已解决')
      const firstRecord = d.currentMonthRecords[0]
      return {
        ...p,
        ...d,
        leaders, copywriters, videographers, editors,
        projectIssues,
        firstRecord,
        allStaff: [leaders, copywriters, videographers, editors].flat().filter(Boolean),
      }
    })
  }, [groupProjects, accounts, monthlyRecords, issues, staff, selectedMonth])

  const handleExport = () => {
    const data = tableData.map((p) => ({
      '项目名称': p.name,
      '对接人': p.contactName,
      '状态': p.status,
      '本月计划': p.monthPlanned,
      '本月已完成': p.monthCompleted,
      '剩余': p.monthRemaining,
      '完成率': `${p.completionRate.toFixed(1)}%`,
      '月费': p.monthlyFee,
      '已收': p.monthPaidAmount,
      '未收': p.monthUnpaid,
      '问题': p.projectIssues.map((i: any) => i.type).join(',') || '正常',
    }))
    exportToExcel(data, `${group?.name}项目明细_${selectedMonth}`, group?.name || '项目明细')
  }

  const handleAddIssue = (projectId: string) => {
    if (!newIssue.desc.trim()) {
      message.warning('请输入问题描述')
      return
    }
    addIssue({
      projectId,
      type: newIssue.type,
      description: newIssue.desc,
      status: '未处理',
      occurredDate: new Date().toISOString().slice(0, 10),
    })
    // 问题类型为"暂停"时，项目状态自动变为"暂停"
    if (newIssue.type === '暂停') {
      updateProject(projectId, { status: '暂停' })
    }
    message.success('问题已记录')
    setIssueModalFor(null)
    setNewIssue({ type: '限流', desc: '' })
  }

  const activeStaff = staff.filter((s) => s.status === '在职')

  const handleAddProject = () => {
    projectForm.validateFields().then((values) => {
      addProject({
        groupId,
        name: values.name,
        contactName: values.contactName || '',
        status: values.status || '进行中',
        cooperationPeriod: values.cooperationPeriod || '',
        paymentType: values.paymentType || '月付后付',
        paymentDate: values.paymentDate || '',
        monthlyFee: values.monthlyFee || 0,
        startDate: values.startDate ? dayjs(values.startDate).format('YYYY-MM-DD') : new Date().toISOString().slice(0, 10),
        leaderIds: values.leaderIds || [],
        directorIds: values.directorIds || [],
        copywriterIds: values.copywriterIds || [],
        videographerIds: values.videographerIds || [],
        editorIds: values.editorIds || [],
      })
      message.success('项目已添加')
      projectForm.resetFields()
      setAddProjectModalOpen(false)
    })
  }

  const handleDeleteProject = (projectId: string, projectName: string) => {
    deleteProject(projectId)
    message.success(`「${projectName}」已删除`)
  }

  const handleOpenOtNew = () => {
    setEditingOtId(null)
    otForm.resetFields()
    setOtModalOpen(true)
  }
  const handleOpenOtEdit = (item: OneTimeProject) => {
    setEditingOtId(item.id)
    otForm.setFieldsValue({
      ...item,
      paymentDate: item.paymentDate ? dayjs(item.paymentDate) : undefined,
    })
    setOtModalOpen(true)
  }
  const handleSaveOt = () => {
    otForm.validateFields().then((values) => {
      const data = {
        ...values,
        paymentDate: values.paymentDate ? dayjs(values.paymentDate).format('YYYY-MM-DD') : '',
      }
      if (editingOtId) {
        updateOneTimeProject(editingOtId, data)
        message.success('已更新')
      } else {
        addOneTimeProject({ ...data, groupId })
        message.success('单次项目已添加')
      }
      otForm.resetFields()
      setOtModalOpen(false)
    })
  }
  const handleDeleteOt = (id: string, name: string) => {
    deleteOneTimeProject(id)
    message.success(`「${name}」已删除`)
  }

  const groupOneTimeProjects = oneTimeProjects.filter((ot) => ot.groupId === groupId)

  const columns = [
    {
      title: '项目',
      dataIndex: 'name',
      width: 130,
      fixed: 'left' as const,
      render: (name: string, record: any) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, cursor: 'pointer', color: '#1677ff' }}
            onClick={() => navigate(`/project/${record.id}`)}>
            {name}
          </div>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>{record.contactName}</div>
        </div>
      ),
    },
    {
      title: '状态', dataIndex: 'status', width: 70,
      render: (s: string) => {
        const colors: Record<string, string> = { '进行中': 'blue', '暂停': 'orange', '已完成': 'green', '已终止': 'default' }
        return <Tag color={colors[s]}>{s}</Tag>
      },
    },
    {
      title: '人员', dataIndex: 'allStaff', width: 120,
      render: (names: string[]) => (
        <div style={{ fontSize: 11 }}>{names.join('、')}</div>
      ),
    },
    {
      title: '本月', children: [
        {
          title: '计划', dataIndex: 'monthPlanned', width: 50,
          render: (v: number) => <span style={{ fontSize: 13 }}>{v}</span>,
        },
        {
          title: '已完成', dataIndex: 'monthCompleted', width: 70,
          render: (v: number, row: any) => (
            <span style={{ fontWeight: 600, color: row.completionRate >= 80 ? '#52c41a' : row.completionRate >= 50 ? '#1677ff' : '#fa8c16' }}>
              {v}
            </span>
          ),
        },
        {
          title: '剩余', dataIndex: 'monthRemaining', width: 50,
          render: (v: number) => <span style={{ color: v > 0 ? '#fa8c16' : '#52c41a' }}>{v}</span>,
        },
        {
          title: '完成率', dataIndex: 'completionRate', width: 90,
          render: (rate: number) => (
            <Progress
              percent={rate} size="small" showInfo
              format={(p) => `${(p ?? 0).toFixed(1)}%`}
              strokeColor={rate >= 80 ? '#52c41a' : rate >= 50 ? '#1677ff' : '#fa8c16'}
            />
          ),
        },
      ],
    },
    {
      title: '财务', children: [
        {
          title: '月费', dataIndex: 'monthlyFee', width: 70,
          render: (v: number) => <span style={{ fontSize: 12 }}>{formatMoney(v)}</span>,
        },
        {
          title: '已收', dataIndex: 'monthPaidAmount', width: 70,
          render: (v: number, row: any) => {
            const records = row.currentMonthRecords
            if (!records || records.length === 0) return formatMoney(v)
            const isAllNoPay = records.every((r: MonthlyRecord) => r.paymentStatus === '不付')
            if (isAllNoPay) return <Tag style={{ margin: 0 }}>不付</Tag>
            const record = row.firstRecord
            const isEditing = record && editingRecord === `paid_${record.id}`
            return isEditing ? (
              <InputNumber
                size="small" value={record.paidAmount} autoFocus
                onChange={(val) => {
                  const status = val >= record.paymentAmount ? '已收' : val > 0 ? '部分收' : '未收'
                  updateMonthlyRecord(record.id, { paidAmount: val ?? 0, paymentStatus: status })
                }}
                onBlur={() => setEditingRecord(null)}
                onPressEnter={() => setEditingRecord(null)}
                style={{ width: 60 }}
              />
            ) : (
              <span style={{ cursor: 'pointer', color: v > 0 ? '#52c41a' : '#8c8c8c' }}
                onClick={() => record && setEditingRecord(`paid_${record.id}`)}>
                {formatMoney(v)}
              </span>
            )
          },
        },
        {
          title: '未收', dataIndex: 'monthUnpaid', width: 70,
          render: (v: number, row: any) => {
            const records = row.currentMonthRecords
            if (records && records.length > 0 && records.every((r: MonthlyRecord) => r.paymentStatus === '不付'))
              return <span style={{ color: '#bfbfbf' }}>-</span>
            return <span style={{ color: v > 0 ? '#f5222d' : '#52c41a', fontWeight: v > 0 ? 600 : 400 }}>{formatMoney(v)}</span>
          },
        },
      ],
    },
    {
      title: '问题', dataIndex: 'projectIssues', width: 80,
      render: (projectIssues: any[], record: any) => (
        <div>
          {projectIssues.length > 0 ? (
            projectIssues.map((i) => (
              <Tag key={i.id} color={issueTypeColors[i.type]} style={{ marginBottom: 2, fontSize: 11 }}>
                {i.type}
              </Tag>
            ))
          ) : (
            <span style={{ color: '#52c41a', fontSize: 12 }}>正常</span>
          )}
          <Button
            size="small" type="link" icon={<PlusOutlined />}
            onClick={() => setIssueModalFor(record.id)}
            style={{ padding: '0 4px', fontSize: 11 }}
          />
        </div>
      ),
    },
    {
      title: '操作', width: 100, fixed: 'right' as const,
      render: (_: unknown, record: any) => (
        <Space size="small">
          <Tooltip title="完成+1">
            <Button
              size="small" type="primary" shape="circle"
              icon={<PlusOutlined />}
              onClick={() => {
                if (record.firstRecord) {
                  incrementCompleted(record.firstRecord.id)
                  message.success(`${record.name} +1`)
                }
              }}
            />
          </Tooltip>
          <Tooltip title="完成-1">
            <Button
              size="small" shape="circle"
              icon={<MinusOutlined />}
              onClick={() => {
                if (record.firstRecord && record.firstRecord.completedCount > 0) {
                  updateMonthlyRecord(record.firstRecord.id, { completedCount: record.firstRecord.completedCount - 1 })
                }
              }}
            />
          </Tooltip>
          <Button size="small" type="text" icon={<FileTextOutlined />}
            onClick={() => navigate(`/project/${record.id}`)} />
          <Popconfirm
            title="删除项目"
            description={`确定删除「${record.name}」？关联的账号、月度记录、问题将一并删除，不可恢复。`}
            onConfirm={() => handleDeleteProject(record.id, record.name)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* 组信息 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 8]} align="middle">
          <Col>
            <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22 }}>{group?.name}</h2>
          </Col>
          <Col>
            <span style={{ color: '#8c8c8c' }}>组长: {staff.find((s) => s.id === group?.leaderId)?.name}</span>
          </Col>
          <Col flex="auto">
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {groupStaff.map((s) => (
                <Tag key={s.id} color="blue">{s.name} · {s.roles.join('/')}</Tag>
              ))}
            </div>
          </Col>
          <Col>
            <Select
              size="small"
              value={selectedMonth}
              onChange={setSelectedMonth}
              style={{ width: 100 }}
              options={Array.from({ length: 6 }).map((_, i) => {
                const d = new Date()
                d.setMonth(d.getMonth() - i)
                return { label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
              })}
            />
          </Col>
          <Col>
            <Button size="small" icon={<EditOutlined />} onClick={handleExport}>导出</Button>
          </Col>
          <Col>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setAddProjectModalOpen(true)}>新增项目</Button>
          </Col>
        </Row>
      </Card>

      {/* 项目表格 */}
      <Table
        dataSource={tableData}
        rowKey="id"
        columns={columns}
        size="small"
        scroll={{ x: 1000, y: 480 }}
        pagination={tableData.length > 8 ? { pageSize: 8, size: 'small', showTotal: (t) => `共 ${t} 个项目` } : false}
        rowClassName={(record: any) => record.projectIssues.length > 0 ? 'has-issue' : ''}
      />

      {/* 单次项目区块 */}
      <Card
        size="small"
        style={{ marginTop: 16 }}
        title={
          <span style={{ fontSize: 15, fontWeight: 700 }}>
            <ThunderboltOutlined style={{ marginRight: 6, color: '#fa8c16' }} />
            单次项目
            {groupOneTimeProjects.length > 0 && (
              <Tag color="orange" style={{ marginLeft: 8 }}>{groupOneTimeProjects.length}</Tag>
            )}
          </span>
        }
        extra={
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={handleOpenOtNew}>
            添加单次项目
          </Button>
        }
      >
        {groupOneTimeProjects.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#bfbfbf', padding: 40 }}>暂无单次项目，点击上方按钮添加</div>
        ) : (
          <Table
            dataSource={groupOneTimeProjects}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              {
                title: '项目名', dataIndex: 'name', width: 140,
                render: (v: string, record) => (
                  <Input
                    size="small" variant="borderless"
                    value={v} style={{ fontWeight: 600, padding: '2px 4px' }}
                    onChange={(e) => updateOneTimeProject(record.id, { name: e.target.value })}
                  />
                ),
              },
              {
                title: '对接人', dataIndex: 'contactName', width: 80,
                render: (v: string, record) => (
                  <Input
                    size="small" variant="borderless"
                    value={v} style={{ padding: '2px 4px' }}
                    onChange={(e) => updateOneTimeProject(record.id, { contactName: e.target.value })}
                  />
                ),
              },
              {
                title: '参与人员', dataIndex: 'staffIds', width: 150,
                render: (ids: string[], record) => (
                  <Select
                    mode="multiple" size="small" variant="borderless"
                    value={ids} style={{ width: '100%', minWidth: 120 }}
                    onChange={(val) => updateOneTimeProject(record.id, { staffIds: val })}
                    options={activeStaff.map((s) => ({ label: s.name, value: s.id }))}
                  />
                ),
              },
              {
                title: '费用', dataIndex: 'fee', width: 90,
                render: (v: number, record) => (
                  <InputNumber
                    size="small" variant="borderless"
                    value={v} min={0} style={{ width: '100%' }}
                    onChange={(val) => updateOneTimeProject(record.id, { fee: val ?? 0 })}
                  />
                ),
              },
              {
                title: '回款时间', dataIndex: 'paymentDate', width: 120,
                render: (v: string, record) => (
                  <DatePicker
                    size="small" variant="borderless"
                    value={v ? dayjs(v) : undefined}
                    style={{ width: '100%' }}
                    onChange={(d) => updateOneTimeProject(record.id, { paymentDate: d ? d.format('YYYY-MM-DD') : '' })}
                  />
                ),
              },
              {
                title: '状态', dataIndex: 'status', width: 90,
                render: (v: string, record) => (
                  <Select
                    size="small" variant="borderless"
                    value={v}
                    style={{ width: '100%' }}
                    onChange={(val) => updateOneTimeProject(record.id, { status: val as OneTimeProject['status'] })}
                    options={[
                      { label: '待收款', value: '待收款' },
                      { label: '已收款', value: '已收款' },
                    ]}
                  />
                ),
              },
              {
                title: '备注', dataIndex: 'notes', width: 150,
                render: (v: string | undefined, record) => (
                  <Input
                    size="small" variant="borderless"
                    value={v || ''} style={{ padding: '2px 4px', fontSize: 12 }}
                    placeholder="备注"
                    onChange={(e) => updateOneTimeProject(record.id, { notes: e.target.value })}
                  />
                ),
              },
              {
                title: '操作', width: 60, fixed: 'right' as const,
                render: (_, record) => (
                  <Popconfirm
                    title="确定删除？"
                    onConfirm={() => handleDeleteOt(record.id, record.name)}
                    okText="删除" cancelText="取消"
                    okButtonProps={{ danger: true }}
                  >
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                ),
              },
            ]}
          />
        )}
      </Card>

      {/* 问题录入弹窗 */}
      <Modal
        title="记录问题"
        open={issueModalFor !== null}
        onOk={() => issueModalFor && handleAddIssue(issueModalFor)}
        onCancel={() => { setIssueModalFor(null); setNewIssue({ type: '限流', desc: '' }) }}
        width={isMobile ? '90%' : 400}
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ marginBottom: 6, display: 'block' }}>问题类型</label>
          <Select
            value={newIssue.type}
            onChange={(v) => setNewIssue({ ...newIssue, type: v })}
            style={{ width: '100%' }}
            options={[
              { label: '限流', value: '限流' },
              { label: '暂停', value: '暂停' },
              { label: '违规', value: '违规' },
              { label: '其他', value: '其他' },
            ]}
          />
        </div>
        <div>
          <label style={{ marginBottom: 6, display: 'block' }}>问题描述</label>
          <Input.TextArea
            value={newIssue.desc}
            onChange={(e) => setNewIssue({ ...newIssue, desc: e.target.value })}
            rows={2}
            placeholder="一句话描述问题"
          />
        </div>
      </Modal>

      {/* 新增项目 Modal */}
      <Modal
        title={`新增项目 - ${group?.name}`}
        open={addProjectModalOpen}
        onOk={handleAddProject}
        onCancel={() => { setAddProjectModalOpen(false); projectForm.resetFields() }}
        width={isMobile ? '95%' : 600}
        style={isMobile ? { top: 20, paddingBottom: 20 } : undefined}
        styles={isMobile ? { body: { maxHeight: '75vh', overflowY: 'auto' } } : undefined}
      >
        <Form form={projectForm} layout="vertical" initialValues={{ status: '进行中', paymentType: '月付后付' }}>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
                <Input placeholder="如：拾景园" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactName" label="对接人">
                <Input placeholder="如：王总" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="status" label="状态">
                <Select options={['进行中', '暂停', '已完成', '已终止'].map((s) => ({ label: s, value: s }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paymentType" label="付款方式">
                <Select options={['月付后付', '月付预付', '一次性', '季度付'].map((p) => ({ label: p, value: p }))} />
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
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="cooperationPeriod" label="合作时间">
                <Input placeholder="如：尝试两个月" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paymentDate" label="收款时间">
                <Input placeholder="如：每月5日" />
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

      {/* 新增/编辑单次项目 Modal */}
      <Modal
        title={editingOtId ? '编辑单次项目' : '新增单次项目'}
        open={otModalOpen}
        onOk={handleSaveOt}
        onCancel={() => { setOtModalOpen(false); otForm.resetFields() }}
        width={isMobile ? '95%' : 500}
      >
        <Form form={otForm} layout="vertical" initialValues={{ status: '待收款' }}>
          <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="如：企业宣传片拍摄" />
          </Form.Item>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="contactName" label="对接人" rules={[{ required: true, message: '请输入' }]}>
                <Input placeholder="如：王总" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fee" label="费用" rules={[{ required: true, message: '请输入' }]}>
                <InputNumber style={{ width: '100%' }} min={0} placeholder="如：5000" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="paymentDate" label="回款时间">
                <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="收款状态">
                <Select options={[
                  { label: '待收款', value: '待收款' },
                  { label: '已收款', value: '已收款' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="staffIds" label="参与人员" rules={[{ required: true, message: '请选择' }]}>
            <Select
              mode="multiple"
              placeholder="选择参与人员"
              options={activeStaff.map((s) => ({ label: `${s.name} (${s.roles.join('/')})`, value: s.id }))}
            />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="如：首批6条，已完成交付" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
