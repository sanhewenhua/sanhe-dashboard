// ===== 员工角色 =====
export type StaffRole = '组长' | '编导' | '文案' | '摄影师' | '剪辑' | '剪辑学徒'

// ===== 员工 =====
export interface Staff {
  id: string
  name: string
  roles: StaffRole[]
  groupId: string // A/B/C/none
  status: '在职' | '待转正' | '学徒' | '离职'
}

// ===== 组 =====
export interface Group {
  id: string // 'A' | 'B' | 'C'
  name: string // 'A组' | 'B组' | 'C组'
  leaderId: string
}

// ===== 项目状态 =====
export type ProjectStatus = '进行中' | '暂停' | '已完成' | '已终止'

// ===== 付款方式 =====
export type PaymentType = '月付后付' | '月付预付' | '一次性' | '季度付'

// ===== 项目 =====
export interface Project {
  id: string
  groupId: string
  name: string
  contactName: string // 对接人称呼
  status: ProjectStatus
  cooperationPeriod: string // 如"尝试两个月"
  paymentType: PaymentType
  paymentDate: string // 收款时间说明，如"每月5日"、"首次拍摄收50%，预计8月16日"
  monthlyFee: number | string // 支持纯数字月费或文字说明（如"无基础费用，提成50%"）
  startDate: string
  expectedEndDate?: string
  // 人员（每个岗位可多选，可跨组）
  leaderIds: string[]
  directorIds: string[]
  copywriterIds: string[]
  videographerIds: string[]
  editorIds: string[]
  createdAt: string
  updatedAt: string
}

// ===== 账号 =====
export interface Account {
  id: string
  projectId: string
  name: string
  monthlyQuota: number
  accountUrl?: string
  status: '正常' | '暂停' | '异常'
  abnormalNote?: string // 异常说明（status为异常时手动填写）
}

// ===== 付款状态 =====
export type PaymentStatus = '未收' | '已收' | '部分收' | '不付'

// ===== 月度记录 =====
export interface MonthlyRecord {
  id: string
  accountId: string
  projectId: string
  yearMonth: string // '2026-08'
  plannedCount: number
  completedCount: number
  thisWeekPlan: number
  lastWeekPlan: number
  lastWeekActual: number
  paymentAmount: number
  paymentStatus: PaymentStatus
  paidAmount: number
  paidDate?: string
  paymentNotes?: string
  notes?: string
}

// ===== 问题记录 =====
export type IssueType = '限流' | '暂停' | '违规' | '其他'
export type IssueStatus = '未处理' | '处理中' | '已解决'

export interface Issue {
  id: string
  projectId: string
  accountId?: string
  type: IssueType
  description: string
  status: IssueStatus
  occurredDate: string
  resolvedDate?: string
}

// ===== 洽谈阶段 =====
export type LeadStage = '初次接触' | '需求沟通' | '方案报价' | '待签约' | '已签约转正式' | '已流失'

// ===== 洽谈中项目 =====
export interface Lead {
  id: string
  name: string
  contactName: string
  contactInfo?: string
  negotiatorId: string
  groupId: string // 'A' | 'B' | 'C' | '待定'
  estimatedMonthlyFee?: number
  estimatedAccounts?: string
  stage: LeadStage
  stageNote: string
  nextFollowUpDate?: string
  createdAt: string
  updatedAt: string
}

// ===== 月度收款快照（手动填写，月末锁定） =====
export interface MonthPaymentSnapshot {
  id: string
  yearMonth: string          // '2026-07'
  projectId: string
  projectName: string
  groupName: string
  receivable: number         // 应收金额（手动填写）
  received: number           // 已收金额（手动填写）
  unpaid: number             // 未收金额（手动填写，不自动计算）
  paymentDate: string        // 收款时间
  finalized: boolean         // 是否已锁定为最终版本
  notes?: string             // 备注
}

// ===== 计算辅助类型 =====
export interface ProjectWithDetails extends Project {
  accounts: Account[]
  currentMonthRecords: MonthlyRecord[]
  issues: Issue[]
  // 计算字段
  monthPlanned: number
  monthCompleted: number
  monthRemaining: number
  completionRate: number
  monthPaymentAmount: number
  monthPaidAmount: number
  monthUnpaid: number
  hasIssues: boolean
  staffNames: {
    leaders: string[]
    directors: string[]
    copywriters: string[]
    videographers: string[]
    editors: string[]
  }
}
