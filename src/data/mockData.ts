import type { Staff, Group, Project, Account, MonthlyRecord, Issue, Lead, MonthPaymentSnapshot } from '../types'

const now = new Date().toISOString()
const currentMonth = new Date().toISOString().slice(0, 7) // '2026-08'
const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7)

// ===== 10名员工 =====
export const initialStaff: Staff[] = [
  { id: 's1', name: '程杰', roles: ['组长', '编导'], groupId: 'A', status: '在职' },
  { id: 's2', name: '王鸿玉', roles: ['剪辑'], groupId: 'A', status: '在职' },
  { id: 's3', name: '吴美玲', roles: ['文案'], groupId: 'A', status: '在职' },
  { id: 's4', name: '周云飞', roles: ['组长', '摄影师'], groupId: 'B', status: '在职' },
  { id: 's5', name: '张誉馨', roles: ['剪辑'], groupId: 'B', status: '在职' },
  { id: 's6', name: '刘晓芳', roles: ['文案'], groupId: 'B', status: '在职' },
  { id: 's7', name: '张洋', roles: ['组长', '摄影师'], groupId: 'C', status: '在职' },
  { id: 's8', name: '张若琪', roles: ['剪辑'], groupId: 'C', status: '在职' },
  { id: 's9', name: '李云佳', roles: ['文案'], groupId: 'C', status: '在职' },
  { id: 's10', name: '刘润琴', roles: ['剪辑学徒'], groupId: 'none', status: '在职' },
]

// ===== 三个组 =====
export const initialGroups: Group[] = [
  { id: 'A', name: 'A组', leaderId: 's1' },
  { id: 'B', name: 'B组', leaderId: 's4' },
  { id: 'C', name: 'C组', leaderId: 's7' },
]

// ===== 项目列表 =====
export const initialProjects: Project[] = [
  {
    id: 'p1', groupId: 'A', name: 'AGA官号', contactName: '胡总',
    status: '进行中', cooperationPeriod: '月付后付·官号1000',
    paymentType: '月付后付', paymentDate: '每月5日', monthlyFee: 1000, startDate: '2026-08-01',
    leaderIds: ['s1'], directorIds: [], copywriterIds: ['s3'], videographerIds: ['s3'], editorIds: ['s2', 's10'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p1b', groupId: 'A', name: 'AGA胡总号', contactName: '胡总',
    status: '进行中', cooperationPeriod: '月付后付·胡总号5000',
    paymentType: '月付后付', paymentDate: '每月5日', monthlyFee: 5000, startDate: '2026-07-01',
    leaderIds: ['s1'], directorIds: [], copywriterIds: ['s1'], videographerIds: ['s1'], editorIds: ['s1', 's2'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p3', groupId: 'C', name: '拾景园官号', contactName: '袁姐',
    status: '进行中', cooperationPeriod: '月付后付·官号2400',
    paymentType: '月付后付', paymentDate: '每月20日', monthlyFee: 2400, startDate: '2026-08-01',
    leaderIds: ['s7'], directorIds: [], copywriterIds: ['s3'], videographerIds: ['s3', 's7'], editorIds: ['s2', 's10'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p3b', groupId: 'C', name: '拾景园人设号', contactName: '袁姐',
    status: '进行中', cooperationPeriod: '月付后付·人设号1600',
    paymentType: '月付后付', paymentDate: '每月20日', monthlyFee: 1600, startDate: '2026-08-01',
    leaderIds: ['s7'], directorIds: [], copywriterIds: ['s3'], videographerIds: ['s7'], editorIds: ['s2'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p4', groupId: 'A', name: '领禹一人多角', contactName: '朱总',
    status: '进行中', cooperationPeriod: '月付后付',
    paymentType: '月付后付', paymentDate: '每月12日', monthlyFee: 1500, startDate: '2026-07-01',
    leaderIds: ['s1'], directorIds: [], copywriterIds: ['s3'], videographerIds: ['s7'], editorIds: ['s2'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p5', groupId: 'A', name: '程杰IP账号', contactName: '程杰',
    status: '进行中', cooperationPeriod: '自有账号',
    paymentType: '月付后付', paymentDate: '不付（自有账号）', monthlyFee: 0, startDate: '2026-08-01',
    leaderIds: ['s1'], directorIds: [], copywriterIds: ['s1'], videographerIds: ['s4', 's7'], editorIds: ['s2'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p6', groupId: 'A', name: '叁和公司营销视频', contactName: '周云飞',
    status: '进行中', cooperationPeriod: '自有账号',
    paymentType: '月付后付', paymentDate: '不付（自有账号）', monthlyFee: 0, startDate: '2026-07-01',
    leaderIds: ['s1'], directorIds: [], copywriterIds: ['s3'], videographerIds: ['s3'], editorIds: ['s2', 's10'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p7', groupId: 'A', name: '成都米线', contactName: '鹏哥',
    status: '进行中', cooperationPeriod: '首批次6条·先付已付',
    paymentType: '一次性', paymentDate: '根据情况而定', monthlyFee: 3600, startDate: '2026-08-01',
    leaderIds: ['s1'], directorIds: [], copywriterIds: ['s1'], videographerIds: ['s1', 's4'], editorIds: ['s1', 's2', 's8'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p8', groupId: 'B', name: '鑫盛租车', contactName: '琳琳',
    status: '进行中', cooperationPeriod: '月付后付·租车4000',
    paymentType: '月付后付', paymentDate: '根据情况而定', monthlyFee: 4000, startDate: '2026-05-01',
    leaderIds: ['s4'], directorIds: [], copywriterIds: ['s6'], videographerIds: ['s4'], editorIds: ['s5'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p8b', groupId: 'B', name: '鑫盛贴膜汽修', contactName: '琳琳',
    status: '暂停', cooperationPeriod: '暂停·无费用',
    paymentType: '月付后付', paymentDate: '根据情况而定', monthlyFee: 0, startDate: '2026-07-01',
    leaderIds: ['s4'], directorIds: [], copywriterIds: ['s6'], videographerIds: ['s4'], editorIds: ['s5'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p9', groupId: 'B', name: '华筑自建房', contactName: '杨总',
    status: '进行中', cooperationPeriod: '月付预付·已付+提成2%',
    paymentType: '月付预付', paymentDate: '根据情况而定', monthlyFee: 6000, startDate: '2026-08-01',
    leaderIds: ['s4'], directorIds: [], copywriterIds: ['s6'], videographerIds: ['s4'], editorIds: ['s5'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p10', groupId: 'B', name: '桥通五洲', contactName: '黄思怡',
    status: '进行中', cooperationPeriod: '月付后付',
    paymentType: '月付后付', paymentDate: '根据情况而定', monthlyFee: 5000, startDate: '2026-07-01',
    leaderIds: ['s4'], directorIds: [], copywriterIds: ['s6'], videographerIds: ['s4', 's5'], editorIds: ['s5'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p11', groupId: 'B', name: '炒甘花露', contactName: '何姐',
    status: '进行中', cooperationPeriod: '月付后付',
    paymentType: '月付后付', paymentDate: '根据情况而定', monthlyFee: 3500, startDate: '2026-07-01',
    leaderIds: ['s4'], directorIds: [], copywriterIds: ['s6'], videographerIds: ['s4', 's5'], editorIds: ['s5'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p12', groupId: 'B', name: '喜灶食品厂', contactName: '滕总',
    status: '进行中', cooperationPeriod: '首批12条·先付50%后付50%',
    paymentType: '一次性', paymentDate: '首次拍摄收50%，预计8月16日', monthlyFee: 6000, startDate: '2026-08-01',
    leaderIds: ['s4'], directorIds: [], copywriterIds: ['s1', 's6'], videographerIds: ['s4'], editorIds: ['s5'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p14', groupId: 'C', name: '五通桥中医院', contactName: '许科长',
    status: '进行中', cooperationPeriod: '月付后付',
    paymentType: '月付后付', paymentDate: '根据情况而定', monthlyFee: 2000, startDate: '2026-06-01',
    leaderIds: ['s7'], directorIds: [], copywriterIds: ['s9'], videographerIds: ['s7'], editorIds: ['s8'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p15', groupId: 'C', name: '太菲教育', contactName: '小武老师',
    status: '进行中', cooperationPeriod: '月付预付·已付',
    paymentType: '月付预付', paymentDate: '根据情况而定', monthlyFee: 3000, startDate: '2026-07-01',
    leaderIds: ['s7'], directorIds: [], copywriterIds: ['s9'], videographerIds: ['s7'], editorIds: ['s8'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p16', groupId: 'C', name: '莳一面馆', contactName: '莳一',
    status: '进行中', cooperationPeriod: '月付预付·已付',
    paymentType: '月付预付', paymentDate: '根据情况而定', monthlyFee: 4500, startDate: '2026-07-01',
    leaderIds: ['s7'], directorIds: [], copywriterIds: ['s9'], videographerIds: ['s7'], editorIds: ['s8'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p17', groupId: 'C', name: '酒小二', contactName: '张梦',
    status: '进行中', cooperationPeriod: '月付预付·等脚本定稿',
    paymentType: '月付预付', paymentDate: '根据情况而定', monthlyFee: 5000, startDate: '2026-08-01',
    leaderIds: ['s7'], directorIds: [], copywriterIds: ['s9'], videographerIds: ['s7'], editorIds: ['s8'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p18', groupId: 'C', name: '四喜棋牌室', contactName: '杨总',
    status: '进行中', cooperationPeriod: '首批20条·先付等脚本定稿',
    paymentType: '一次性', paymentDate: '根据情况而定', monthlyFee: 8000, startDate: '2026-08-01',
    leaderIds: ['s7'], directorIds: [], copywriterIds: ['s9'], videographerIds: ['s7'], editorIds: ['s8'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p19', groupId: 'C', name: '强哥热卤', contactName: '杨总',
    status: '进行中', cooperationPeriod: '首批10条·先付等脚本定稿',
    paymentType: '一次性', paymentDate: '根据情况而定', monthlyFee: 4000, startDate: '2026-08-01',
    leaderIds: ['s7'], directorIds: [], copywriterIds: ['s9'], videographerIds: ['s7'], editorIds: ['s8'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p20', groupId: 'C', name: '艾美花园饭店', contactName: '余总',
    status: '进行中', cooperationPeriod: '月付后付',
    paymentType: '月付后付', paymentDate: '根据情况而定', monthlyFee: 4000, startDate: '2026-06-01',
    leaderIds: ['s7'], directorIds: [], copywriterIds: ['s9'], videographerIds: ['s7'], editorIds: ['s8'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p_1786360301291_9o8gg', groupId: 'C', name: '瀚林抵押', contactName: '瀚林哥',
    status: '进行中', cooperationPeriod: '尝试一个月',
    paymentType: '月付后付', paymentDate: '0', monthlyFee: 50, startDate: '2026-08-01',
    leaderIds: ['s7'], directorIds: [], copywriterIds: ['s9'], videographerIds: ['s7'], editorIds: ['s8'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },]

// ===== 账号列表 =====
export const initialAccounts: Account[] = [
  { id: 'a1', projectId: 'p1', name: 'AGA官号', monthlyQuota: 10, status: '正常' },
  { id: 'a2', projectId: 'p1b', name: 'AGA胡总号', monthlyQuota: 25, status: '正常' },
  { id: 'a3', projectId: 'p3', name: '拾景园官号', monthlyQuota: 15, status: '正常' },
  { id: 'a4', projectId: 'p3b', name: '拾景园人设号', monthlyQuota: 10, status: '正常' },
  { id: 'a5', projectId: 'p4', name: '领禹一人多角', monthlyQuota: 15, status: '正常' },
  { id: 'a6', projectId: 'p5', name: '程杰IP', monthlyQuota: 8, status: '正常' },
  { id: 'a7', projectId: 'p6', name: '叁和营销号', monthlyQuota: 4, status: '正常' },
  { id: 'a8', projectId: 'p7', name: '成都米线号', monthlyQuota: 6, status: '正常' },
  { id: 'a9', projectId: 'p8', name: '鑫盛租车', monthlyQuota: 15, status: '正常' },
  { id: 'a10', projectId: 'p8b', name: '鑫盛贴膜汽修', monthlyQuota: 60, status: '暂停' },
  { id: 'a11', projectId: 'p9', name: '华筑自建房', monthlyQuota: 12, status: '正常' },
  { id: 'a12', projectId: 'p10', name: '桥通五洲', monthlyQuota: 8, status: '正常' },
  { id: 'a13', projectId: 'p11', name: '炒甘花露', monthlyQuota: 10, status: '正常' },
  { id: 'a14', projectId: 'p12', name: '喜灶食品厂', monthlyQuota: 12, status: '正常' },
  { id: 'a16', projectId: 'p14', name: '五通桥中医院', monthlyQuota: 4, status: '正常' },
  { id: 'a17', projectId: 'p15', name: '太菲教育', monthlyQuota: 10, status: '正常' },
  { id: 'a18', projectId: 'p16', name: '莳一面馆', monthlyQuota: 15, status: '正常' },
  { id: 'a19', projectId: 'p17', name: '酒小二', monthlyQuota: 10, status: '正常' },
  { id: 'a20', projectId: 'p18', name: '四喜棋牌室', monthlyQuota: 20, status: '正常' },
  { id: 'a21', projectId: 'p19', name: '强哥热卤', monthlyQuota: 10, status: '正常' },
  { id: 'a22', projectId: 'p20', name: '艾美花园饭店', monthlyQuota: 14, status: '正常' },
  { id: 'a_1786360319425_13gyr', projectId: 'p_1786360301291_9o8gg', name: '瀚林哥', monthlyQuota: 10, status: '正常' },]

// ===== 本月月度记录 =====
function genRecord(
  accountId: string, projectId: string, planned: number, completed: number,
  fee: number, paymentStatus: '未收' | '已收' | '部分收' | '不付' = '未收', paid = 0
): MonthlyRecord {
  return {
    id: `mr_${accountId}_${currentMonth}`, accountId, projectId, yearMonth: currentMonth,
    plannedCount: planned, completedCount: completed,
    thisWeekPlan: Math.ceil(planned / 4), lastWeekPlan: Math.ceil(planned / 4),
    lastWeekActual: 0,
    paymentAmount: fee, paymentStatus, paidAmount: paid,
  }
}

export const initialMonthlyRecords: MonthlyRecord[] = [
  genRecord('a1', 'p1', 10, 0, 1000, '未收', 0),
  genRecord('a2', 'p1b', 25, 10, 5000, '未收', 0),
  genRecord('a3', 'p3', 15, 10, 2400, '未收', 0),
  genRecord('a4', 'p3b', 10, 4, 3000, '未收', 0),
  genRecord('a5', 'p4', 15, 0, 0, '未收', 0),
  genRecord('a6', 'p5', 8, 0, 0, '不付', 0),
  genRecord('a7', 'p6', 4, 2, 0, '不付', 0),
  genRecord('a8', 'p7', 6, 6, 3600, '已收', 3600),
  genRecord('a9', 'p8', 15, 9, 4000, '未收', 0),
  genRecord('a10', 'p8b', 10, 10, 7000, '未收', 0),
  genRecord('a11', 'p9', 12, 4, 6000, '未收', 0),
  genRecord('a12', 'p10', 8, 4, 5000, '未收', 0),
  genRecord('a13', 'p11', 10, 6, 3500, '未收', 0),
  genRecord('a14', 'p12', 12, 0, 6000, '未收', 0),
  genRecord('a16', 'p14', 0, 0, 0, '未收', 0),
  genRecord('a17', 'p15', 3, 2, 3000, '未收', 0),
  genRecord('a18', 'p16', 9, 6, 4500, '未收', 0),
  genRecord('a19', 'p17', 10, 0, 5000, '未收', 0),
  genRecord('a20', 'p18', 20, 0, 8000, '未收', 0),
  genRecord('a21', 'p19', 10, 0, 4000, '未收', 0),
  genRecord('a22', 'p20', 14, 4, 4000, '未收', 0),
  genRecord('a_1786360319425_13gyr', 'p_1786360301291_9o8gg', 10, 6, 0, '未收', 0),]

// ===== 上月记录（2026-07）===== 
function genLastRecord(
  accountId: string, projectId: string, planned: number, completed: number,
  fee: number, paymentStatus: '未收' | '已收' | '部分收' | '不付' = '未收', paid = 0
): MonthlyRecord {
  return {
    id: `mr_${accountId}_${lastMonth}`, accountId, projectId, yearMonth: lastMonth,
    plannedCount: planned, completedCount: completed,
    thisWeekPlan: 0, lastWeekPlan: 0, lastWeekActual: 0,
    paymentAmount: fee, paymentStatus, paidAmount: paid,
  }
}

export const initialLastMonthRecords: MonthlyRecord[] = [
  genLastRecord('a1', 'p1', 10, 0, 0, '未收', 0),
  genLastRecord('a2', 'p1b', 25, 25, 5000, '未收', 5000),
  genLastRecord('a3', 'p3', 15, 0, 0, '未收', 0),
  genLastRecord('a4', 'p3b', 10, 0, 0, '未收', 0),
  genLastRecord('a5', 'p4', 15, 15, 1500, '未收', 1500),
  genLastRecord('a6', 'p5', 8, 3, 0, '不付', 0),
  genLastRecord('a7', 'p6', 4, 0, 0, '不付', 0),
  genLastRecord('a9', 'p8', 15, 0, 0, '未收', 0),
  genLastRecord('a10', 'p8b', 50, 50, 0, '未收', 0),
  genLastRecord('a11', 'p9', 0, 0, 0, '未收', 0),
  genLastRecord('a12', 'p10', 0, 0, 0, '未收', 0),
  genLastRecord('a13', 'p11', 10, 8, 3500, '已收', 3500),
  genLastRecord('a16', 'p14', 4, 4, 2000, '未收', 2000),
  genLastRecord('a17', 'p15', 7, 7, 3000, '未收', 3000),
  genLastRecord('a18', 'p16', 6, 6, 4500, '已收', 4500),
  genLastRecord('a22', 'p20', 0, 0, 0, '未收', 0),]

// ===== 问题记录（暂无） =====
export const initialIssues: Issue[] = []

// ===== 上月收款快照（已锁定最终版本） =====
export const initialMonthSnapshots: MonthPaymentSnapshot[] = [
  { id: 'ms_1786356509025_1tlmz', yearMonth: '2026-08', projectId: 'p1', projectName: 'AGA官号', groupName: 'A组',
    receivable: 1000, received: 1000, unpaid: 0, paymentDate: '每月5日', finalized: false, notes: '' },
  { id: 'ms_1786356509025_vh1x7', yearMonth: '2026-08', projectId: 'p1b', projectName: 'AGA胡总号', groupName: 'A组',
    receivable: 5000, received: 5000, unpaid: 0, paymentDate: '每月5日', finalized: false, notes: '' },
  { id: 'ms_1786356509025_5mkk9', yearMonth: '2026-08', projectId: 'p3', projectName: '拾景园官号', groupName: 'A组',
    receivable: 2400, received: 2400, unpaid: 0, paymentDate: '每月20日', finalized: false, notes: '' },
  { id: 'ms_1786356509025_996al', yearMonth: '2026-08', projectId: 'p3b', projectName: '拾景园人设号', groupName: 'A组',
    receivable: 1600, received: 0, unpaid: 1600, paymentDate: '每月20日', finalized: false, notes: '人设号未收' },
  { id: 'ms_1786356509025_trbhh', yearMonth: '2026-08', projectId: 'p4', projectName: '领禹一人多角', groupName: 'A组',
    receivable: 1500, received: 1500, unpaid: 0, paymentDate: '每月12日', finalized: false, notes: '' },
  { id: 'ms_1786356509025_i1oy0', yearMonth: '2026-08', projectId: 'p8', projectName: '鑫盛租车', groupName: 'B组',
    receivable: 4000, received: 2000, unpaid: 2000, paymentDate: '根据情况而定', finalized: false, notes: '部分收' },
  { id: 'ms_1786356509025_3e2dk', yearMonth: '2026-08', projectId: 'p8b', projectName: '鑫盛贴膜汽修', groupName: 'B组',
    receivable: 0, received: 0, unpaid: 0, paymentDate: '根据情况而定', finalized: false, notes: '暂停0元' },
  { id: 'ms_1786356509025_r6hz4', yearMonth: '2026-08', projectId: 'p9', projectName: '华筑自建房', groupName: 'B组',
    receivable: 6000, received: 6000, unpaid: 0, paymentDate: '根据情况而定', finalized: false, notes: '' },
  { id: 'ms_1786356509025_hh332', yearMonth: '2026-08', projectId: 'p10', projectName: '桥通五洲', groupName: 'B组',
    receivable: 5000, received: 0, unpaid: 5000, paymentDate: '根据情况而定', finalized: false, notes: '完全未收' },
  { id: 'ms_1786356509025_mjl9j', yearMonth: '2026-08', projectId: 'p11', projectName: '炒甘花露', groupName: 'B组',
    receivable: 3500, received: 3500, unpaid: 0, paymentDate: '根据情况而定', finalized: false, notes: '' },
  { id: 'ms_1786356509025_9nxq3', yearMonth: '2026-08', projectId: 'p13', projectName: '瀚林数码', groupName: 'C组',
    receivable: 0, received: 0, unpaid: 0, paymentDate: '根据情况而定', finalized: false, notes: '暂停0元' },
  { id: 'ms_1786356509025_zzxsh', yearMonth: '2026-08', projectId: 'p14', projectName: '五通桥中医院', groupName: 'C组',
    receivable: 2000, received: 2000, unpaid: 0, paymentDate: '根据情况而定', finalized: false, notes: '' },
  { id: 'ms_1786356509025_7da0z', yearMonth: '2026-08', projectId: 'p15', projectName: '太菲教育', groupName: 'C组',
    receivable: 3000, received: 3000, unpaid: 0, paymentDate: '根据情况而定', finalized: false, notes: '' },
  { id: 'ms_1786356509025_0wduu', yearMonth: '2026-08', projectId: 'p16', projectName: '莳一面馆', groupName: 'C组',
    receivable: 4500, received: 4500, unpaid: 0, paymentDate: '根据情况而定', finalized: false, notes: '' },
  { id: 'ms_1786356509025_tp4bo', yearMonth: '2026-08', projectId: 'p20', projectName: '艾美花园饭店', groupName: 'C组',
    receivable: 4000, received: 2000, unpaid: 2000, paymentDate: '根据情况而定', finalized: false, notes: '部分收' },
  { id: 'ms1', yearMonth: '2026-07', projectId: 'p1', projectName: 'AGA官号', groupName: 'A组',
    receivable: 0, received: 0, unpaid: 0, paymentDate: '每月5日', finalized: true, notes: '' },
  { id: 'ms2', yearMonth: '2026-07', projectId: 'p1b', projectName: 'AGA胡总号', groupName: 'A组',
    receivable: 5000, received: 0, unpaid: 5000, paymentDate: '每月5日', finalized: true, notes: '' },
  { id: 'ms3', yearMonth: '2026-07', projectId: 'p3', projectName: '拾景园官号', groupName: 'C组',
    receivable: 0, received: 0, unpaid: 0, paymentDate: '每月20日', finalized: true, notes: '' },
  { id: 'ms4', yearMonth: '2026-07', projectId: 'p3b', projectName: '拾景园人设号', groupName: 'C组',
    receivable: 0, received: 0, unpaid: 0, paymentDate: '每月20日', finalized: true, notes: '' },
  { id: 'ms5', yearMonth: '2026-07', projectId: 'p4', projectName: '领禹一人多角', groupName: 'A组',
    receivable: 1500, received: 0, unpaid: 1500, paymentDate: '每月12日', finalized: true, notes: '' },
  { id: 'ms6', yearMonth: '2026-07', projectId: 'p8', projectName: '鑫盛租车', groupName: 'B组',
    receivable: 0, received: 0, unpaid: 0, paymentDate: '根据情况而定', finalized: true, notes: '' },
  { id: 'ms7', yearMonth: '2026-07', projectId: 'p8b', projectName: '鑫盛贴膜汽修', groupName: 'B组',
    receivable: 0, received: 0, unpaid: 0, paymentDate: '根据情况而定', finalized: true, notes: '' },
  { id: 'ms8', yearMonth: '2026-07', projectId: 'p9', projectName: '华筑自建房', groupName: 'B组',
    receivable: 0, received: 0, unpaid: 0, paymentDate: '根据情况而定', finalized: true, notes: '' },
  { id: 'ms9', yearMonth: '2026-07', projectId: 'p10', projectName: '桥通五洲', groupName: 'B组',
    receivable: 0, received: 0, unpaid: 0, paymentDate: '根据情况而定', finalized: true, notes: '' },
  { id: 'ms10', yearMonth: '2026-07', projectId: 'p11', projectName: '炒甘花露', groupName: 'B组',
    receivable: 3500, received: 3500, unpaid: 0, paymentDate: '根据情况而定', finalized: true, notes: '' },
  { id: 'ms11', yearMonth: '2026-07', projectId: 'p14', projectName: '五通桥中医院', groupName: 'C组',
    receivable: 2000, received: 0, unpaid: 2000, paymentDate: '根据情况而定', finalized: true, notes: '' },
  { id: 'ms12', yearMonth: '2026-07', projectId: 'p15', projectName: '太菲教育', groupName: 'C组',
    receivable: 3000, received: 0, unpaid: 3000, paymentDate: '根据情况而定', finalized: true, notes: '' },
  { id: 'ms13', yearMonth: '2026-07', projectId: 'p16', projectName: '莳一面馆', groupName: 'C组',
    receivable: 4500, received: 4500, unpaid: 0, paymentDate: '根据情况而定', finalized: true, notes: '' },
  { id: 'ms14', yearMonth: '2026-07', projectId: 'p20', projectName: '艾美花园饭店', groupName: 'C组',
    receivable: 0, received: 0, unpaid: 0, paymentDate: '根据情况而定', finalized: true, notes: '' },]

// ===== 洽谈中项目 =====
export const initialLeads: Lead[] = [
  {
    id: 'l1', name: '西昌加古尔矿泉水', contactName: '宋总', contactInfo: '',
    negotiatorId: 's1', groupId: 'A',
    estimatedMonthlyFee: 10000, estimatedAccounts: '每月10-15条，先付20%完成付80%',
    stage: '需求沟通', stageNote: '每月10-15条，先付20%完成付80%',
    nextFollowUpDate: '', createdAt: '2026-08-01', updatedAt: new Date().toISOString(),
  },
  {
    id: 'l2', name: '重庆新乐园KTV', contactName: '徐总', contactInfo: '',
    negotiatorId: 's1', groupId: '待定',
    estimatedMonthlyFee: undefined, estimatedAccounts: '',
    stage: '初次接触', stageNote: '初次接触，了解需求中',
    nextFollowUpDate: '', createdAt: '2026-08-05', updatedAt: new Date().toISOString(),
  },
  {
    id: 'l3', name: '成都足浴联盟', contactName: '宋总', contactInfo: '',
    negotiatorId: 's1', groupId: '待定',
    estimatedMonthlyFee: undefined, estimatedAccounts: '',
    stage: '初次接触', stageNote: '初次接触，了解需求中',
    nextFollowUpDate: '', createdAt: '2026-08-05', updatedAt: new Date().toISOString(),
  },]
