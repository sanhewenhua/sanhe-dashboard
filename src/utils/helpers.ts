import type { Project, Account, MonthlyRecord, Issue, Staff } from '../types'

export const issueTypeColors: Record<string, string> = {
  '限流': '#fa8c16',
  '暂停': '#faad14',
  '违规': '#f5222d',
  '其他': '#8c8c8c',
}

export function getStaffNames(staff: Staff[], ids: string[]): string[] {
  if (!Array.isArray(ids) || !Array.isArray(staff)) return []
  return ids.map((id) => staff.find((s) => s.id === id)?.name || '').filter(Boolean)
}

export function getCurrentMonthRecords(records: MonthlyRecord[], month: string): MonthlyRecord[] {
  return records.filter((r) => r.yearMonth === month)
}

export function getProjectAccounts(accounts: Account[], projectId: string): Account[] {
  return accounts.filter((a) => a.projectId === projectId)
}

export function getProjectIssues(issues: Issue[], projectId: string): Issue[] {
  return issues.filter((i) => i.projectId === projectId)
}

export function calcProjectMonthData(
  project: Project,
  accounts: Account[],
  records: MonthlyRecord[],
  issues: Issue[],
  month: string
) {
  const safeAccounts = Array.isArray(accounts) ? accounts : []
  const safeRecords = Array.isArray(records) ? records : []
  const safeIssues = Array.isArray(issues) ? issues : []

  const projectAccounts = safeAccounts.filter((a) => a && a.projectId === project.id && a.status !== '暂停')
  const monthRecords = safeRecords.filter(
    (r) => r && r.projectId === project.id && r.yearMonth === month
  )

  const monthPlanned = monthRecords.reduce((sum, r) => sum + r.plannedCount, 0)
  const monthCompleted = monthRecords.reduce((sum, r) => sum + r.completedCount, 0)
  const monthRemaining = monthPlanned - monthCompleted
  const completionRate = monthPlanned > 0 ? (monthCompleted / monthPlanned) * 100 : 0
  // 不付的记录不计入应收/已收/未收
  const payableRecords = monthRecords.filter((r) => r.paymentStatus !== '不付')
  const monthPaymentAmount = payableRecords.reduce((sum, r) => sum + r.paymentAmount, 0)
  const monthPaidAmount = payableRecords.reduce((sum, r) => sum + r.paidAmount, 0)
  const monthUnpaid = monthPaymentAmount - monthPaidAmount
  const projectIssues = safeIssues.filter((i) => i && i.projectId === project.id && i.status !== '已解决')

  return {
    accounts: projectAccounts,
    currentMonthRecords: monthRecords,
    monthPlanned,
    monthCompleted,
    monthRemaining,
    completionRate,
    monthPaymentAmount,
    monthPaidAmount,
    monthUnpaid,
    hasIssues: projectIssues.length > 0,
    unresolvedIssues: projectIssues,
  }
}

export function formatMoney(amount: number | string): string {
  const num = Number(amount)
  if (Number.isNaN(num)) return String(amount)
  return `¥${num.toLocaleString()}`
}

export function formatPercent(rate: number): string {
  return `${rate.toFixed(1)}%`
}

export function getProgressColor(rate: number): string {
  if (rate >= 80) return '#52c41a'
  if (rate >= 50) return '#1677ff'
  return '#fa8c16'
}

// ===== 员工工作量计算 =====
// 工作量 = 各角色平摊贡献之和。每个岗位贡献 = 该项目本月已完成条数 ÷ 该岗位人数
// 例如：程杰在AGA项目中担任剪辑+文案(2个角色)，AGA本月已完成6条，剪辑2人、文案1人
//   → 剪辑贡献 = 6÷2 = 3，文案贡献 = 6÷1 = 6，工作量 = 3+6 = 9
// 注意：只统计本月「已完成」条数，不统计计划/配额总量。组长角色不计入。

export interface StaffWorkloadProject {
  projectId: string
  projectName: string
  groupName: string
  roles: string[]        // 该员工在此项目中担任的角色
  roleCount: number      // 角色数
  monthPlanned: number  // 该项目本月计划总量
  monthCompleted: number // 该项目本月「已完成」条数（非计划/配额）
  workload: number       // 工作量 = 各角色平摊贡献之和
}

export interface StaffWorkloadResult {
  staffId: string
  staffName: string
  groupName: string
  projectCount: number       // 参与的项目数
  totalRoleCount: number     // 总角色数（跨项目）
  totalWorkload: number      // 总工作量
  projectDetails: StaffWorkloadProject[]
}

export function calcStaffWorkload(
  staff: Staff[],
  projects: Project[],
  accounts: Account[],
  records: MonthlyRecord[],
  groups: { id: string; name: string }[],
  month: string,
): StaffWorkloadResult[] {
  // 防御性处理：确保数组有效
  const safeStaff = Array.isArray(staff) ? staff : []
  const safeProjects = Array.isArray(projects) ? projects : []
  const safeAccounts = Array.isArray(accounts) ? accounts : []
  const safeRecords = Array.isArray(records) ? records : []
  const safeGroups = Array.isArray(groups) ? groups : []

  return safeStaff.map((s) => {
    const projectDetails: StaffWorkloadProject[] = []
    const groupName = safeGroups.find((g) => g.id === s.groupId)?.name || '未分组'

    for (const p of safeProjects) {
      if (!p) continue
      if (p.status === '已终止' || p.status === '已完成') continue

      // 防御性：角色数组可能为 undefined/null（编辑后数据丢失）
      const leaderIds = Array.isArray(p.leaderIds) ? p.leaderIds : []
      const directorIds = Array.isArray(p.directorIds) ? p.directorIds : []
      const copywriterIds = Array.isArray(p.copywriterIds) ? p.copywriterIds : []
      const videographerIds = Array.isArray(p.videographerIds) ? p.videographerIds : []
      const editorIds = Array.isArray(p.editorIds) ? p.editorIds : []

      const roles: string[] = []
      const isLeader = leaderIds.includes(s.id)
      if (isLeader) roles.push('组长')
      if (directorIds.includes(s.id)) roles.push('编导')
      if (copywriterIds.includes(s.id)) roles.push('文案')
      if (videographerIds.includes(s.id)) roles.push('拍摄')
      if (editorIds.includes(s.id)) roles.push('剪辑')

      // 组长不计入工作量，其他角色才计入
      const workloadRoles = roles.filter((r) => r !== '组长')
      if (workloadRoles.length === 0) continue

      // 计算该项目本月已完成条数（所有账号合计，排除暂停账号）
      const activeAccountIds = safeAccounts
        .filter((a) => a && a.projectId === p.id && a.status !== '暂停')
        .map((a) => a.id)
      const projectMonthRecords = safeRecords
        .filter((r) => r && r.projectId === p.id && r.yearMonth === month && activeAccountIds.includes(r.accountId))
      const monthCompleted = projectMonthRecords.reduce((sum, r) => sum + (r.completedCount || 0), 0)
      const monthPlanned = projectMonthRecords.reduce((sum, r) => sum + (r.plannedCount || 0), 0)

      // 同岗位多人时按人数平摊：每人贡献 = 月完成条数 / 该岗位人数
      const perRoleWorkload: Record<string, number> = {
        '编导': monthCompleted / Math.max(directorIds.length, 1),
        '文案': monthCompleted / Math.max(copywriterIds.length, 1),
        '拍摄': monthCompleted / Math.max(videographerIds.length, 1),
        '剪辑': monthCompleted / Math.max(editorIds.length, 1),
      }
      const workload = workloadRoles.reduce((sum, r) => sum + perRoleWorkload[r], 0)

      const pGroupName = safeGroups.find((g) => g.id === p.groupId)?.name || p.groupId

      projectDetails.push({
        projectId: p.id,
        projectName: p.name,
        groupName: pGroupName,
        roles,
        roleCount: workloadRoles.length,
        monthPlanned,
        monthCompleted,
        workload: Math.round(workload * 10) / 10,
      })
    }

    const totalRoleCount = projectDetails.reduce((sum, d) => sum + d.roleCount, 0)
    const totalWorkload = projectDetails.reduce((sum, d) => sum + d.workload, 0)

    return {
      staffId: s.id,
      staffName: s.name,
      groupName,
      projectCount: projectDetails.length,
      totalRoleCount,
      totalWorkload,
      projectDetails,
    }
  })
}

// ===== 员工人效计算 =====
// 公式：
//   项目产值 = 月费 × 完成率（已完成/计划，上限100%）
//   岗位产值 = 项目产值 / 岗位数（排除组长）
//   某人该项目人效 = Σ(该员工各岗位产值 / 该岗位人数)
//   某人月度总人效 = Σ(各项目人效)
//
// 例如：项目月费6000，岗位3个（文案/拍摄/剪辑），计划10条已完成6条
//   完成率=60%，项目产值=3600
//   岗位产值=3600/3=1200
//   剪辑2人 → 每人剪辑人效=1200/2=600
//   如果该人同时是文案(1人) → 人效=1200+600=1800

export interface EfficiencyProjectDetail {
  projectId: string
  projectName: string
  groupName: string
  monthlyFee: number | string  // 项目月费
  monthPlanned: number         // 计划总条数
  monthCompleted: number       // 已完成总条数
  completionRate: number       // 完成率（0-1，上限1）
  projectValue: number         // 项目产值 = 月费 × 完成率
  numRoles: number             // 岗位数（排除组长）
  roles: string[]              // 该员工在此项目的角色（排除组长）
  efficiency: number           // 该员工在此项目的人效
  roleBreakdown: {             // 各角色明细
    role: string
    roleValue: number          // 岗位产值
    peopleInRole: number       // 该岗位人数
    perPerson: number          // 每人产值
  }[]
}

export interface StaffEfficiencyResult {
  staffId: string
  staffName: string
  groupName: string
  projectCount: number
  totalEfficiency: number      // 月度总人效
  projectDetails: EfficiencyProjectDetail[]
}

export function calcStaffEfficiency(
  staff: Staff[],
  projects: Project[],
  accounts: Account[],
  records: MonthlyRecord[],
  groups: { id: string; name: string }[],
  month: string,
): StaffEfficiencyResult[] {
  const safeStaff = Array.isArray(staff) ? staff : []
  const safeProjects = Array.isArray(projects) ? projects : []
  const safeAccounts = Array.isArray(accounts) ? accounts : []
  const safeRecords = Array.isArray(records) ? records : []
  const safeGroups = Array.isArray(groups) ? groups : []

  return safeStaff.map((s) => {
    const projectDetails: EfficiencyProjectDetail[] = []
    const groupName = safeGroups.find((g) => g.id === s.groupId)?.name || '未分组'

    for (const p of safeProjects) {
      if (!p) continue
      if (p.status === '已终止' || p.status === '已完成') continue

      const leaderIds = Array.isArray(p.leaderIds) ? p.leaderIds : []
      const directorIds = Array.isArray(p.directorIds) ? p.directorIds : []
      const copywriterIds = Array.isArray(p.copywriterIds) ? p.copywriterIds : []
      const videographerIds = Array.isArray(p.videographerIds) ? p.videographerIds : []
      const editorIds = Array.isArray(p.editorIds) ? p.editorIds : []

      // 该员工在此项目的角色（排除组长）
      const roles: string[] = []
      if (directorIds.includes(s.id)) roles.push('编导')
      if (copywriterIds.includes(s.id)) roles.push('文案')
      if (videographerIds.includes(s.id)) roles.push('拍摄')
      if (editorIds.includes(s.id)) roles.push('剪辑')
      if (roles.length === 0) continue

      // 统计该项目有多少个岗位（排除组长，至少1人的岗位才算）
      const roleCountMap: Record<string, number> = {
        '编导': directorIds.length,
        '文案': copywriterIds.length,
        '拍摄': videographerIds.length,
        '剪辑': editorIds.length,
      }
      const numRoles = Object.entries(roleCountMap).filter(([, count]) => count > 0).length
      if (numRoles === 0) continue

      // 计算该项目本月完成数据
      const activeAccountIds = safeAccounts
        .filter((a) => a && a.projectId === p.id && a.status !== '暂停')
        .map((a) => a.id)
      const projectMonthRecords = safeRecords
        .filter((r) => r && r.projectId === p.id && r.yearMonth === month && activeAccountIds.includes(r.accountId))
      const monthCompleted = projectMonthRecords.reduce((sum, r) => sum + (r.completedCount || 0), 0)
      const monthPlanned = projectMonthRecords.reduce((sum, r) => sum + (r.plannedCount || 0), 0)

      // 完成率（上限100%）
      const completionRate = monthPlanned > 0 ? Math.min(monthCompleted / monthPlanned, 1) : 0
      // 项目产值
      const projectValue = Math.round((Number(p.monthlyFee) || 0) * completionRate)
      // 岗位产值
      const roleValue = Math.round(projectValue / numRoles)

      // 各角色明细
      const roleBreakdown = roles.map((r) => {
        const peopleInRole = roleCountMap[r]
        const perPerson = peopleInRole > 0 ? Math.round(roleValue / peopleInRole) : 0
        return { role: r, roleValue, peopleInRole, perPerson }
      })

      // 该员工在此项目的人效 = 各角色每人产值之和
      const efficiency = roleBreakdown.reduce((sum, rb) => sum + rb.perPerson, 0)

      const pGroupName = safeGroups.find((g) => g.id === p.groupId)?.name || p.groupId

      projectDetails.push({
        projectId: p.id,
        projectName: p.name,
        groupName: pGroupName,
        monthlyFee: p.monthlyFee || 0,
        monthPlanned,
        monthCompleted,
        completionRate,
        projectValue,
        numRoles,
        roles,
        efficiency,
        roleBreakdown,
      })
    }

    const totalEfficiency = projectDetails.reduce((sum, d) => sum + d.efficiency, 0)

    return {
      staffId: s.id,
      staffName: s.name,
      groupName,
      projectCount: projectDetails.length,
      totalEfficiency,
      projectDetails,
    }
  })
}

// 获取近N个月的月份列表
export function getRecentMonths(count: number): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}
