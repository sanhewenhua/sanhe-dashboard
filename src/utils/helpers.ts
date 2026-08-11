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
  // 已收按应收全额算，部分收按实收算，未收按 0 算（与 Dashboard 的 paidByStatus 保持一致）
  const monthPaidAmount = payableRecords.reduce((sum, r) => {
    if (r.paymentStatus === '已收') return sum + r.paymentAmount
    if (r.paymentStatus === '部分收') return sum + r.paidAmount
    return sum
  }, 0)
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

      // 计算该项目本月已完成条数（所有账号合计，暂停项目也计入工作量）
      const activeAccountIds = safeAccounts
        .filter((a) => a && a.projectId === p.id)
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

      // 计算该项目本月完成数据（暂停项目也计入人效）
      const activeAccountIds = safeAccounts
        .filter((a) => a && a.projectId === p.id)
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

// ===== 项目质量评分系统 =====
// 基于上月数据，从5个维度综合评估项目质量：收入力、执行力、回报力、回款力、稳定力

export interface ProjectQualityScore {
  projectId: string
  projectName: string
  groupName: string
  groupId: string
  status: string
  contactName: string
  monthlyFee: number | string
  // 上月核心指标
  lastMonth: string
  lastMonthPlanned: number
  lastMonthCompleted: number
  completionRate: number        // 0-1
  lastMonthReceivable: number
  lastMonthReceived: number
  paymentRate: number           // 0-1
  staffCount: number            // 非组长参与人数
  consecutiveMonths: number     // 连续合作月数
  // 各维度得分
  revenueScore: number          // 收入力 0-20
  executionScore: number        // 执行力 0-20
  roiScore: number              // 回报力 0-20
  paymentScore: number          // 回款力 0-15
  cooperationScore: number      // 合作力 0-25（按合作时长分级：首次/磨合/成长/稳定/深度）
  totalScore: number            // 0-100
  tier: '优质' | '良好' | '一般' | '劣质'
  tierOrder: number             // 用于排序：3=优质 2=良好 1=一般 0=劣质
  // 备注
  warnings: string[]
}

/** 计算项目连续合作月数 */
function calcConsecutiveMonths(
  projectId: string,
  records: MonthlyRecord[],
  referenceMonth: string,
): number {
  const projectMonths = new Set(
    records
      .filter((r) => r.projectId === projectId)
      .map((r) => r.yearMonth)
  )
  if (projectMonths.size === 0) return 0

  // 从参考月份往前数连续的月份
  let count = 0
  const [y, m] = referenceMonth.split('-').map(Number)
  for (let i = 0; i < 24; i++) {
    const d = new Date(y, m - 1 - i, 1)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (projectMonths.has(month)) {
      count++
    } else {
      break // 不连续就停止
    }
  }
  return count
}

/**
 * 计算项目质量排名评分
 * @param projects 所有项目（不限状态）
 * @param accounts 所有账号
 * @param records 所有月度记录
 * @param issues 所有问题
 * @param staff 所有员工
 * @param groups 所有组
 * @param targetMonth 评估月（默认上月）
 */
export function calcProjectQualityRanking(
  projects: Project[],
  accounts: Account[],
  records: MonthlyRecord[],
  issues: Issue[],
  staff: Staff[],
  groups: { id: string; name: string }[],
  targetMonth?: string,
): ProjectQualityScore[] {
  const safeProjects = Array.isArray(projects) ? projects : []
  const safeRecords = Array.isArray(records) ? records : []
  const safeIssues = Array.isArray(issues) ? issues : []
  const safeStaff = Array.isArray(staff) ? staff : []
  const safeGroups = Array.isArray(groups) ? groups : []

  // 默认评估月 = 上月
  const evalMonth = targetMonth || (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()

  // 先收集所有项目的原始指标
  const rawData = safeProjects
    .filter((p) => p) // 过滤空值
    .map((p) => {
      const groupName = safeGroups.find((g) => g.id === p.groupId)?.name || p.groupId || '未分组'

      // 上月数据
      const pRecords = safeRecords.filter(
        (r) => r.projectId === p.id && r.yearMonth === evalMonth
      )
      const payableRecords = pRecords.filter((r) => r.paymentStatus !== '不付')
      const lastMonthPlanned = pRecords.reduce((s, r) => s + (r.plannedCount || 0), 0)
      const lastMonthCompleted = pRecords.reduce((s, r) => s + (r.completedCount || 0), 0)
      const completionRate = lastMonthPlanned > 0 ? lastMonthCompleted / lastMonthPlanned : 0
      const lastMonthReceivable = payableRecords.reduce((s, r) => s + (r.paymentAmount || 0), 0)
      const lastMonthReceived = payableRecords.reduce((s, r) => {
        if (r.paymentStatus === '已收') return s + (r.paymentAmount || 0)
        if (r.paymentStatus === '部分收') return s + (r.paidAmount || 0)
        return s
      }, 0)
      const paymentRate = lastMonthReceivable > 0 ? lastMonthReceived / lastMonthReceivable : 0

      // 参与人数（非组长）- 所有岗位去重
      const roleIds = new Set<string>()
      const leaderIds = Array.isArray(p.leaderIds) ? p.leaderIds : []
      const directorIds = Array.isArray(p.directorIds) ? p.directorIds : []
      const copywriterIds = Array.isArray(p.copywriterIds) ? p.copywriterIds : []
      const videographerIds = Array.isArray(p.videographerIds) ? p.videographerIds : []
      const editorIds = Array.isArray(p.editorIds) ? p.editorIds : []
      directorIds.forEach((id) => roleIds.add(id))
      copywriterIds.forEach((id) => roleIds.add(id))
      videographerIds.forEach((id) => roleIds.add(id))
      editorIds.forEach((id) => roleIds.add(id))
      const staffCount = roleIds.size

      // 连续合作月数
      const consecutiveMonths = calcConsecutiveMonths(p.id, safeRecords, evalMonth)

      // 未解决问题
      const unresolvedIssues = safeIssues.filter(
        (i) => i.projectId === p.id && i.status !== '已解决'
      )
      const hasIssue = unresolvedIssues.length > 0

      // 月费（数值化）
      const feeNum = Number(p.monthlyFee) || 0

      return {
        projectId: p.id,
        projectName: p.name,
        groupName,
        groupId: p.groupId,
        status: p.status,
        contactName: p.contactName || '',
        monthlyFee: p.monthlyFee,
        feeNum,
        lastMonth: evalMonth,
        lastMonthPlanned,
        lastMonthCompleted,
        completionRate,
        lastMonthReceivable,
        lastMonthReceived,
        paymentRate,
        staffCount,
        consecutiveMonths,
        hasIssue,
        isPaused: p.status === '暂停',
        isTerminated: p.status === '已终止',
      }
    })

  // 全局基准值（用于回报力标准化）
  const totalReceived = rawData.reduce((s, d) => s + d.lastMonthReceived, 0)
  const totalStaff = rawData.reduce((s, d) => s + Math.max(d.staffCount, 1), 0)
  const avgPerStaffRevenue = totalStaff > 0 ? totalReceived / totalStaff : 0

  // 全局最大月费（用于收入力标准化）
  const maxFee = Math.max(...rawData.map((d) => d.feeNum), 1)

  // 计算评分
  const warnings: string[] = []

  return rawData
    .map((d) => {
      const w: string[] = []

      // 已终止项目：总分直接归零（不参与排名）
      if (d.isTerminated) {
        return {
          ...d,
          revenueScore: 0,
          executionScore: 0,
          roiScore: 0,
          paymentScore: 0,
          cooperationScore: 0,
          totalScore: 0,
          tier: '劣质' as const,
          tierOrder: 0,
          warnings: ['项目已终止'],
        }
      }

      // === 1. 收入力 (20分) ===
      // 月费与全局最高月费的比值 × 20
      let revenueScore = maxFee > 0 ? (d.feeNum / maxFee) * 20 : 0
      if (d.feeNum === 0 && typeof d.monthlyFee === 'string') {
        revenueScore = 6 // 提成制/无固定费用给基础分
        w.push('无固定月费（提成制）')
      }
      if (d.feeNum === 0 && typeof d.monthlyFee === 'number') {
        revenueScore = 4
        w.push('月费为0')
      }
      revenueScore = Math.round(revenueScore * 10) / 10

      // === 2. 执行力 (20分) ===
      // 上月完成率 × 20。无计划数据按50%算
      let effectiveRate = d.completionRate
      if (d.lastMonthPlanned === 0) {
        effectiveRate = d.lastMonthCompleted > 0 ? 1 : 0.5
        if (d.lastMonthCompleted === 0) w.push('上月无计划数据')
      }
      const executionScore = Math.round(Math.min(effectiveRate * 20, 20) * 10) / 10

      // === 3. 回报力 (20分) ===
      // 人均产值 = 上月已收 / 参与人数，与全局人均产值对比
      const perStaff = d.staffCount > 0 ? d.lastMonthReceived / d.staffCount : d.lastMonthReceived
      let roiScore = avgPerStaffRevenue > 0
        ? Math.min((perStaff / avgPerStaffRevenue) * 12, 20) // 达到均值12分，1.67倍人均满分
        : 10
      if (d.staffCount === 0) {
        roiScore = Math.min(roiScore, 8) // 无人分配，最多8分
        w.push('未分配运营人员')
      }
      if (d.lastMonthReceived === 0 && d.lastMonthReceivable > 0) {
        roiScore = Math.min(roiScore, 4) // 有应收但没收到钱
        w.push('上月款项未收回')
      }
      roiScore = Math.round(roiScore * 10) / 10

      // === 4. 回款力 (15分) ===
      let paymentScore: number
      if (d.lastMonthReceivable === 0) {
        paymentScore = 10 // 无应收，默认中等
        w.push('上月无应收款')
      } else {
        paymentScore = d.paymentRate * 15
      }
      paymentScore = Math.round(paymentScore * 10) / 10

      // === 5. 合作力 (25分) ===
      // 按连续合作月数分级打分，长期合作价值更高
      const months = d.consecutiveMonths
      let cooperationScore: number
      let coopLabel: string
      if (months <= 1) {
        cooperationScore = 5
        coopLabel = '首次合作'
      } else if (months <= 3) {
        cooperationScore = 12
        coopLabel = '磨合期'
      } else if (months <= 6) {
        cooperationScore = 18
        coopLabel = '成长期'
      } else if (months <= 11) {
        cooperationScore = 22
        coopLabel = '稳定期'
      } else {
        cooperationScore = 25
        coopLabel = '深度合作'
      }
      if (d.isPaused) {
        cooperationScore = Math.max(cooperationScore - 3, 0)
        w.push('项目暂停中')
      }
      if (d.hasIssue) {
        cooperationScore = Math.max(cooperationScore - 2, 0)
        w.push('存在未解决问题')
      }
      cooperationScore = Math.round(cooperationScore * 10) / 10

      // === 总分 ===
      const totalScore = Math.round(
        (revenueScore + executionScore + roiScore + paymentScore + cooperationScore) * 10
      ) / 10

      // === 分档 ===
      let tier: ProjectQualityScore['tier']
      let tierOrder: number
      if (totalScore >= 75) { tier = '优质'; tierOrder = 3 }
      else if (totalScore >= 60) { tier = '良好'; tierOrder = 2 }
      else if (totalScore >= 40) { tier = '一般'; tierOrder = 1 }
      else { tier = '劣质'; tierOrder = 0 }

      return {
        projectId: d.projectId,
        projectName: d.projectName,
        groupName: d.groupName,
        groupId: d.groupId,
        status: d.status,
        contactName: d.contactName,
        monthlyFee: d.monthlyFee,
        lastMonth: d.lastMonth,
        lastMonthPlanned: d.lastMonthPlanned,
        lastMonthCompleted: d.lastMonthCompleted,
        completionRate: d.completionRate,
        lastMonthReceivable: d.lastMonthReceivable,
        lastMonthReceived: d.lastMonthReceived,
        paymentRate: d.paymentRate,
        staffCount: d.staffCount,
        consecutiveMonths: d.consecutiveMonths,
        revenueScore,
        executionScore,
        roiScore,
        paymentScore,
        cooperationScore,
        totalScore,
        tier,
        tierOrder,
        warnings: w,
      }
    })
    .sort((a, b) => b.totalScore - a.totalScore)
}
