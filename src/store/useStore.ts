import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Staff, Group, Project, Account, MonthlyRecord, Issue, Lead, MonthPaymentSnapshot, LegacyReceivable } from '../types'
import {
  initialStaff, initialGroups, initialProjects, initialAccounts,
  initialMonthlyRecords, initialLastMonthRecords, initialIssues, initialLeads,
  initialMonthSnapshots, initialLegacyReceivables,
} from '../data/mockData'
import { extractSyncData, pushToServer } from '../utils/syncManager'

// 需要同步的业务数据字段
const SYNC_KEYS = ['staff', 'groups', 'projects', 'accounts', 'monthlyRecords', 'issues', 'leads', 'monthSnapshots', 'staffSalaries', 'legacyReceivables'] as const

/** 规范化数据：确保所有数组字段有效，防止 undefined 导致崩溃 */
function normalizeProjects(projects: unknown): Project[] {
  if (!Array.isArray(projects)) return initialProjects
  return projects.map((p) => ({
    ...p,
    leaderIds: Array.isArray(p.leaderIds) ? p.leaderIds : [],
    directorIds: Array.isArray(p.directorIds) ? p.directorIds : [],
    copywriterIds: Array.isArray(p.copywriterIds) ? p.copywriterIds : [],
    videographerIds: Array.isArray(p.videographerIds) ? p.videographerIds : [],
    editorIds: Array.isArray(p.editorIds) ? p.editorIds : [],
  })) as Project[]
}

function normalizeStaff(staff: unknown): Staff[] {
  if (!Array.isArray(staff)) return initialStaff
  return staff.map((s) => ({
    ...s,
    roles: Array.isArray(s.roles) ? s.roles : [],
  })) as Staff[]
}

/** 根据未解决的"暂停"问题同步项目状态：有则暂停，无则恢复为进行中 */
function syncProjectStatusByIssues(projects: Project[], issues: Issue[]): Project[] {
  const pausedProjectIds = new Set(
    issues.filter((i) => i.type === '暂停' && i.status !== '已解决').map((i) => i.projectId)
  )
  const now = new Date().toISOString()
  return projects.map((p) => {
    const shouldPause = pausedProjectIds.has(p.id)
    if (shouldPause && p.status !== '暂停') {
      return { ...p, status: '暂停', updatedAt: now }
    }
    if (!shouldPause && p.status === '暂停') {
      return { ...p, status: '进行中', updatedAt: now }
    }
    return p
  })
}

/** 重算项目某月所有账号的 paymentAmount（按配额比例分配月费），跳过"不付"记录 */
function recalcPaymentAmounts(
  projectId: string,
  month: string,
  projects: Project[],
  accounts: Account[],
  monthlyRecords: MonthlyRecord[],
): MonthlyRecord[] {
  const project = projects.find((p) => p.id === projectId)
  if (!project) return monthlyRecords

  const projectAccounts = accounts.filter((a) => a.projectId === projectId && a.status !== '暂停')
  const totalQuota = projectAccounts.reduce((sum, a) => sum + a.monthlyQuota, 0)
  if (totalQuota <= 0) return monthlyRecords

  return monthlyRecords.map((r) => {
    if (r.projectId !== projectId || r.yearMonth !== month) return r
    if (r.paymentStatus === '不付') return r
    const acc = projectAccounts.find((a) => a.id === r.accountId)
    if (!acc) return r
    const feeNum = Number(project.monthlyFee) || 0
    const newPayment = Math.round(feeNum * acc.monthlyQuota / totalQuota)
    return { ...r, paymentAmount: newPayment }
  })
}

const currentMonth = new Date().toISOString().slice(0, 7)

// 账号密码配置
const ACCOUNTS: Record<string, { password: string; name: string; group: string }> = {
  CJ: { password: '12345', name: '程杰', group: 'A' },
  ZYF: { password: '12345', name: '周云飞', group: 'B' },
  ZY: { password: '12345', name: '张洋', group: 'C' },
  ZYX: { password: '12345', name: '张誉馨', group: 'B' },
}

interface AppState {
  // 登录状态
  isLoggedIn: boolean
  currentUser: string
  displayName: string
  currentGroup: string
  login: (username: string, password: string) => boolean
  logout: () => void

  // 数据
  staff: Staff[]
  groups: Group[]
  projects: Project[]
  accounts: Account[]
  monthlyRecords: MonthlyRecord[]
  issues: Issue[]
  leads: Lead[]
  monthSnapshots: MonthPaymentSnapshot[]
  staffSalaries: Record<string, number> // 员工上月工资 { staffId: salary }
  legacyReceivables: LegacyReceivable[]

  // 选中状态
  selectedMonth: string
  setSelectedMonth: (month: string) => void

  // 快照操作
  updateMonthSnapshot: (id: string, updates: Partial<MonthPaymentSnapshot>) => void
  addMonthSnapshot: (snapshot: Omit<MonthPaymentSnapshot, 'id'>) => void
  deleteMonthSnapshot: (id: string) => void
  finalizeMonth: (yearMonth: string) => void
  unfinalizeMonth: (yearMonth: string) => void
  carryOverMonth: (fromMonth: string, toMonth: string) => void
  ensureCarryOver: () => void

  // 员工操作
  addStaff: (staff: Omit<Staff, 'id'>) => void
  updateStaff: (id: string, updates: Partial<Staff>) => void
  deleteStaff: (id: string) => void
  updateStaffSalary: (staffId: string, salary: number) => void

  // 历史未收款操作
  addLegacyReceivable: (item: Omit<LegacyReceivable, 'id'>) => void
  updateLegacyReceivable: (id: string, updates: Partial<LegacyReceivable>) => void
  deleteLegacyReceivable: (id: string) => void

  // 项目操作
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void

  // 账号操作
  addAccount: (account: Omit<Account, 'id'>) => void
  updateAccount: (id: string, updates: Partial<Account>) => void
  deleteAccount: (id: string) => void

  // 月度记录操作
  addMonthlyRecord: (record: Omit<MonthlyRecord, 'id'>) => void
  updateMonthlyRecord: (id: string, updates: Partial<MonthlyRecord>) => void
  incrementCompleted: (recordId: string) => void

  // 问题操作
  addIssue: (issue: Omit<Issue, 'id'>) => void
  updateIssue: (id: string, updates: Partial<Issue>) => void
  deleteIssue: (id: string) => void

  // 洽谈项目操作
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateLead: (id: string, updates: Partial<Lead>) => void
  deleteLead: (id: string) => void
  convertLeadToProject: (leadId: string) => string | undefined

  // 组操作
  addGroup: (name: string, leaderId?: string) => string
  updateGroup: (id: string, updates: Partial<Group>) => void

  // 重置数据
  resetData: () => void

  // 实时同步
  syncConnected: boolean
  loadFromServer: (data: Record<string, unknown>) => void
  setSyncConnected: (connected: boolean) => void
}

const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      currentUser: '',
      displayName: '',
      currentGroup: '',
      login: (username: string, password: string) => {
        const account = ACCOUNTS[username.toUpperCase()]
        if (account && account.password === password) {
          set({ isLoggedIn: true, currentUser: username.toUpperCase(), displayName: account.name, currentGroup: account.group })
          return true
        }
        return false
      },
      logout: () => set({ isLoggedIn: false, currentUser: '', displayName: '', currentGroup: '' }),

      staff: initialStaff,
      groups: initialGroups,
      projects: initialProjects,
      accounts: initialAccounts,
      monthlyRecords: [...initialMonthlyRecords, ...initialLastMonthRecords],
      issues: initialIssues,
      leads: initialLeads,
      monthSnapshots: initialMonthSnapshots,
      staffSalaries: {},
      legacyReceivables: initialLegacyReceivables,

      selectedMonth: currentMonth,
      setSelectedMonth: (month: string) => set({ selectedMonth: month }),

      addStaff: (staff) =>
        set((s) => ({ staff: [...s.staff, { ...staff, id: genId('s') }] })),
      updateStaff: (id, updates) =>
        set((s) => ({ staff: s.staff.map((x) => (x.id === id ? { ...x, ...updates } : x)) })),
      deleteStaff: (id) =>
        set((s) => ({
          staff: s.staff.filter((x) => x.id !== id),
          staffSalaries: Object.fromEntries(Object.entries(s.staffSalaries).filter(([k]) => k !== id)),
        })),
      updateStaffSalary: (staffId, salary) =>
        set((s) => ({
          staffSalaries: { ...s.staffSalaries, [staffId]: salary },
        })),

      addLegacyReceivable: (item) =>
        set((s) => ({ legacyReceivables: [...s.legacyReceivables, { ...item, id: genId('lr') }] })),
      updateLegacyReceivable: (id, updates) =>
        set((s) => ({ legacyReceivables: s.legacyReceivables.map((x) => (x.id === id ? { ...x, ...updates } : x)) })),
      deleteLegacyReceivable: (id) =>
        set((s) => ({ legacyReceivables: s.legacyReceivables.filter((x) => x.id !== id) })),

      addProject: (project) => {
        const id = genId('p')
        const now = new Date().toISOString()
        const newProject: Project = { ...project, id, createdAt: now, updatedAt: now }
        set((s) => ({ projects: [...s.projects, newProject] }))

        // 自动为项目创建本月月度记录（如果选了月费和账号，会在添加账号时创建）
        return id
      },
      updateProject: (id, updates) =>
        set((s) => {
          const projects = s.projects.map((x) =>
            x.id === id ? { ...x, ...updates, updatedAt: new Date().toISOString() } : x
          )
          // 月费变化时重算当月所有账号的 paymentAmount
          if (updates.monthlyFee !== undefined) {
            const month = s.selectedMonth
            const monthlyRecords = recalcPaymentAmounts(id, month, projects, s.accounts, s.monthlyRecords)
            return { projects, monthlyRecords }
          }
          return { projects }
        }),
      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((x) => x.id !== id),
          accounts: s.accounts.filter((a) => a.projectId !== id),
          monthlyRecords: s.monthlyRecords.filter((r) => r.projectId !== id),
          issues: s.issues.filter((i) => i.projectId !== id),
        })),

      addAccount: (account) => {
        const id = genId('a')
        const newAccount: Account = { ...account, id }
        set((s) => {
          const accounts = [...s.accounts, newAccount]
          const month = s.selectedMonth
          const project = s.projects.find((p) => p.id === account.projectId)
          const accountsOfProject = accounts.filter((a) => a.projectId === account.projectId)
          const totalQuota = accountsOfProject.reduce((sum, a) => sum + a.monthlyQuota, 0)
          const fee = project && totalQuota > 0
            ? Math.round((Number(project.monthlyFee) || 0) * account.monthlyQuota / totalQuota)
            : 0

          const newRecord: MonthlyRecord = {
            id: genId('mr'),
            accountId: id,
            projectId: account.projectId,
            yearMonth: month,
            plannedCount: account.monthlyQuota,
            completedCount: 0,
            thisWeekPlan: Math.ceil(account.monthlyQuota / 4),
            lastWeekPlan: 0,
            lastWeekActual: 0,
            paymentAmount: fee,
            paymentStatus: '未收',
            paidAmount: 0,
          }

          // 重算同项目已有账号的 paymentAmount（totalQuota 变了）
          let monthlyRecords = [...s.monthlyRecords, newRecord]
          monthlyRecords = recalcPaymentAmounts(account.projectId, month, s.projects, accounts, monthlyRecords)

          return { accounts, monthlyRecords }
        })
      },
      updateAccount: (id, updates) =>
        set((s) => {
          const accounts = s.accounts.map((x) => (x.id === id ? { ...x, ...updates } : x))

          // 配额变化时：同步当月 plannedCount + 重算同项目所有账号的 paymentAmount
          if (updates.monthlyQuota !== undefined) {
            const account = accounts.find((a) => a.id === id)
            if (account) {
              const month = s.selectedMonth
              // 1. 同步当月 plannedCount
              let monthlyRecords = s.monthlyRecords.map((r) =>
                r.accountId === id && r.yearMonth === month
                  ? { ...r, plannedCount: updates.monthlyQuota! }
                  : r
              )
              // 2. 重算同项目所有账号的 paymentAmount（totalQuota 变了）
              monthlyRecords = recalcPaymentAmounts(account.projectId, month, s.projects, accounts, monthlyRecords)
              return { accounts, monthlyRecords }
            }
          }

          // 账号状态变化时（暂停/恢复），重算同项目 paymentAmount
          if (updates.status !== undefined) {
            const account = accounts.find((a) => a.id === id)
            if (account) {
              const month = s.selectedMonth
              const monthlyRecords = recalcPaymentAmounts(account.projectId, month, s.projects, accounts, s.monthlyRecords)
              return { accounts, monthlyRecords }
            }
          }

          return { accounts }
        }),
      deleteAccount: (id) =>
        set((s) => {
          const account = s.accounts.find((a) => a.id === id)
          const accounts = s.accounts.filter((x) => x.id !== id)
          const monthlyRecords = s.monthlyRecords.filter((r) => r.accountId !== id)
          // 删除账号后重算同项目 paymentAmount（totalQuota 变了）
          if (account) {
            const finalRecords = recalcPaymentAmounts(account.projectId, s.selectedMonth, s.projects, accounts, monthlyRecords)
            return { accounts, monthlyRecords: finalRecords }
          }
          return { accounts, monthlyRecords }
        }),

      addMonthlyRecord: (record) =>
        set((s) => ({
          monthlyRecords: [...s.monthlyRecords, { ...record, id: genId('mr') }],
        })),
      updateMonthlyRecord: (id, updates) =>
        set((s) => ({
          monthlyRecords: s.monthlyRecords.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),
      incrementCompleted: (recordId) =>
        set((s) => ({
          monthlyRecords: s.monthlyRecords.map((r) =>
            r.id === recordId ? { ...r, completedCount: r.completedCount + 1 } : r
          ),
        })),

      addIssue: (issue) =>
        set((s) => {
          const newIssue = { ...issue, id: genId('i') }
          const nextIssues = [newIssue, ...s.issues]
          return {
            issues: nextIssues,
            projects: syncProjectStatusByIssues(s.projects, nextIssues),
          }
        }),
      updateIssue: (id, updates) =>
        set((s) => {
          const nextIssues = s.issues.map((x) => (x.id === id ? { ...x, ...updates } : x))
          return {
            issues: nextIssues,
            projects: syncProjectStatusByIssues(s.projects, nextIssues),
          }
        }),
      deleteIssue: (id) =>
        set((s) => {
          const nextIssues = s.issues.filter((x) => x.id !== id)
          return {
            issues: nextIssues,
            projects: syncProjectStatusByIssues(s.projects, nextIssues),
          }
        }),

      addLead: (lead) => {
        const now = new Date().toISOString()
        set((s) => ({ leads: [{ ...lead, id: genId('l'), createdAt: now, updatedAt: now }, ...s.leads] }))
      },
      updateLead: (id, updates) =>
        set((s) => ({
          leads: s.leads.map((x) =>
            x.id === id ? { ...x, ...updates, updatedAt: new Date().toISOString() } : x
          ),
        })),
      deleteLead: (id) =>
        set((s) => ({ leads: s.leads.filter((x) => x.id !== id) })),

      convertLeadToProject: (leadId) => {
        const lead = get().leads.find((l) => l.id === leadId)
        if (!lead) return
        const groupId = lead.groupId === '待定' ? 'A' : lead.groupId
        const group = get().groups.find((g) => g.id === groupId)
        const projectId = get().addProject({
          groupId,
          name: lead.name,
          contactName: lead.contactName,
          status: '进行中',
          cooperationPeriod: '尝试一个月',
          paymentType: '月付后付',
          paymentDate: '根据情况而定',
          monthlyFee: lead.estimatedMonthlyFee || 0,
          startDate: new Date().toISOString().slice(0, 10),
          leaderIds: group ? [group.leaderId] : [],
          directorIds: [],
          copywriterIds: [],
          videographerIds: [],
          editorIds: [],
        })
        // 更新lead状态
        get().updateLead(leadId, { stage: '已签约转正式' })
        // 返回projectId供前端跳转
        return projectId
      },

      addGroup: (name, leaderId) => {
        // 生成组ID：用字母 D, E, F... 如果用完了就用 g+timestamp
        const existingLetters = get().groups.map((g) => g.id)
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        let newId = ''
        for (const ch of letters) {
          if (!existingLetters.includes(ch)) { newId = ch; break }
        }
        if (!newId) newId = `g_${Date.now()}`
        const newGroup: Group = { id: newId, name, leaderId: leaderId || '' }
        set((s) => ({ groups: [...s.groups, newGroup] }))
        return newId
      },

      updateGroup: (id, updates) =>
        set((s) => ({
          groups: s.groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        })),

      // ===== 月度收款快照操作 =====
      updateMonthSnapshot: (id, updates) =>
        set((s) => ({
          monthSnapshots: s.monthSnapshots.map((sn) => (sn.id === id ? { ...sn, ...updates } : sn)),
        })),

      addMonthSnapshot: (snapshot) =>
        set((s) => ({ monthSnapshots: [...s.monthSnapshots, { ...snapshot, id: genId('ms') }] })),

      deleteMonthSnapshot: (id) =>
        set((s) => ({ monthSnapshots: s.monthSnapshots.filter((sn) => sn.id !== id) })),

      finalizeMonth: (yearMonth) =>
        set((s) => ({
          monthSnapshots: s.monthSnapshots.map((sn) =>
            sn.yearMonth === yearMonth ? { ...sn, finalized: true } : sn
          ),
        })),

      unfinalizeMonth: (yearMonth) =>
        set((s) => ({
          monthSnapshots: s.monthSnapshots.map((sn) =>
            sn.yearMonth === yearMonth ? { ...sn, finalized: false } : sn
          ),
        })),

      carryOverMonth: (fromMonth, toMonth) => {
        const state = get()
        // 只结转已锁定的快照
        const fromSnapshots = state.monthSnapshots.filter(
          (sn) => sn.yearMonth === fromMonth && sn.finalized
        )
        if (fromSnapshots.length === 0) return
        // 检查目标月是否已有快照
        const existing = state.monthSnapshots.filter((sn) => sn.yearMonth === toMonth)
        if (existing.length > 0) return // 已有数据不覆盖
        // 复制上月数据作为新月的起点
        const newSnapshots: MonthPaymentSnapshot[] = fromSnapshots.map((sn) => ({
          ...sn,
          id: genId('ms'),
          yearMonth: toMonth,
          finalized: false, // 新月未锁定
        }))
        set((s) => ({ monthSnapshots: [...s.monthSnapshots, ...newSnapshots] }))
      },

      ensureCarryOver: () => {
        const state = get()
        const thisMonth = new Date().toISOString().slice(0, 7)
        const d = new Date()
        d.setMonth(d.getMonth() - 1)
        const prevMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        // 如果上月有已锁定的快照，且本月没有快照，自动结转
        const hasPrev = state.monthSnapshots.some((sn) => sn.yearMonth === prevMonth && sn.finalized)
        const hasCurrent = state.monthSnapshots.some((sn) => sn.yearMonth === thisMonth)
        if (hasPrev && !hasCurrent) {
          get().carryOverMonth(prevMonth, thisMonth)
        }
      },

      resetData: () =>
        set({
          staff: initialStaff,
          groups: initialGroups,
          projects: initialProjects,
          accounts: initialAccounts,
          monthlyRecords: [...initialMonthlyRecords, ...initialLastMonthRecords],
          issues: initialIssues,
          leads: initialLeads,
          monthSnapshots: initialMonthSnapshots,
          staffSalaries: {},
          legacyReceivables: initialLegacyReceivables,
        }),

      // ===== 实时同步 =====
      syncConnected: false,
      setSyncConnected: (connected) => set({ syncConnected: connected }),
      loadFromServer: (data) => {
        const normalizedProjects = normalizeProjects(data.projects)
        const issues = Array.isArray(data.issues) ? data.issues as Issue[] : initialIssues
        set({
          staff: normalizeStaff(data.staff),
          groups: Array.isArray(data.groups) ? data.groups as Group[] : initialGroups,
          projects: syncProjectStatusByIssues(normalizedProjects, issues),
          accounts: Array.isArray(data.accounts) ? data.accounts as Account[] : initialAccounts,
          monthlyRecords: Array.isArray(data.monthlyRecords)
            ? data.monthlyRecords as MonthlyRecord[]
            : [...initialMonthlyRecords, ...initialLastMonthRecords],
          issues,
          leads: Array.isArray(data.leads) ? data.leads as Lead[] : initialLeads,
          monthSnapshots: Array.isArray(data.monthSnapshots)
            ? data.monthSnapshots as MonthPaymentSnapshot[]
            : initialMonthSnapshots,
          staffSalaries: (data.staffSalaries && typeof data.staffSalaries === 'object' && !Array.isArray(data.staffSalaries))
            ? data.staffSalaries as Record<string, number>
            : {},
          legacyReceivables: Array.isArray(data.legacyReceivables)
            ? data.legacyReceivables as LegacyReceivable[]
            : initialLegacyReceivables,
        })
      },
    }),
    { name: 'sanhe-dashboard-data-v10', version: 10,
      // 数据恢复时的规范化处理：确保所有数组字段有效，防止 undefined 导致崩溃
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // 规范化 projects：确保所有角色数组都是有效数组
        if (Array.isArray(state.projects)) {
          state.projects = state.projects.map((p) => ({
            ...p,
            leaderIds: Array.isArray(p.leaderIds) ? p.leaderIds : [],
            directorIds: Array.isArray(p.directorIds) ? p.directorIds : [],
            copywriterIds: Array.isArray(p.copywriterIds) ? p.copywriterIds : [],
            videographerIds: Array.isArray(p.videographerIds) ? p.videographerIds : [],
            editorIds: Array.isArray(p.editorIds) ? p.editorIds : [],
          }))
        }
        // 规范化其他数组
        if (!Array.isArray(state.staff)) state.staff = initialStaff
        if (!Array.isArray(state.groups)) state.groups = initialGroups
        if (!Array.isArray(state.projects)) state.projects = initialProjects
        if (!Array.isArray(state.accounts)) state.accounts = initialAccounts
        if (!Array.isArray(state.monthlyRecords)) state.monthlyRecords = [...initialMonthlyRecords, ...initialLastMonthRecords]
        if (!Array.isArray(state.issues)) state.issues = initialIssues
        if (!Array.isArray(state.leads)) state.leads = initialLeads
        if (!Array.isArray(state.monthSnapshots)) state.monthSnapshots = initialMonthSnapshots
        if (!state.staffSalaries || typeof state.staffSalaries !== 'object') state.staffSalaries = {}
        if (!Array.isArray(state.legacyReceivables)) state.legacyReceivables = initialLegacyReceivables
        // 规范化 staff：确保 roles 是数组
        if (Array.isArray(state.staff)) {
          state.staff = state.staff.map((s) => ({
            ...s,
            roles: Array.isArray(s.roles) ? s.roles : [],
          }))
        }
        // 修复：根据未解决的"暂停"问题同步项目状态（新增/编辑/删除问题时也会触发）
        if (Array.isArray(state.issues) && Array.isArray(state.projects)) {
          state.projects = syncProjectStatusByIssues(state.projects, state.issues)
        }
      },
    }
  )
)

// ===== 订阅状态变化，自动推送同步到服务器 =====
useStore.subscribe((state, prevState) => {
  // 只在业务数据字段变化时同步
  const changed = SYNC_KEYS.some((key) => state[key] !== prevState[key])
  if (!changed) return
  pushToServer(extractSyncData(state as unknown as Record<string, unknown>))
})
