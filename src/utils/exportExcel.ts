import ExcelJS from 'exceljs'
import type { StaffWorkloadResult, StaffEfficiencyResult } from './helpers'
import type { Staff, Group } from '../types'

// ===== 通用样式常量 =====
const BRAND_BLUE = '1677ff'
const BRAND_GREEN = '52c41a'
const DARK_TEXT = '262626'
const GRAY_TEXT = '8c8c8c'
const WHITE = 'FFFFFF'
const BORDER_COLOR = 'E0E6ED'

const thinBorder = { style: 'thin' as const, color: { argb: BORDER_COLOR } }
const allBorders = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder }

function applyTitleRow(ws: ExcelJS.Worksheet, row: number, cols: number, text: string) {
  ws.mergeCells(row, 1, row, cols)
  const cell = ws.getCell(row, 1)
  cell.value = text
  cell.font = { bold: true, size: 16, color: { argb: DARK_TEXT } }
  cell.alignment = { horizontal: 'left', vertical: 'middle' }
  ws.getRow(row).height = 36
}

function applyHeaderRow(ws: ExcelJS.Worksheet, row: number, headers: string[], color = BRAND_BLUE) {
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1)
    cell.value = h
    cell.font = { bold: true, size: 11, color: { argb: WHITE } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = allBorders
  })
  ws.getRow(row).height = 30
}

function applyDataRow(ws: ExcelJS.Worksheet, row: number, values: (string | number)[], isAlt: boolean) {
  const bg = isAlt ? 'F7FAFF' : WHITE
  values.forEach((v, i) => {
    const cell = ws.getCell(row, i + 1)
    cell.value = v ?? ''
    cell.font = { size: 11, color: { argb: DARK_TEXT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
    cell.border = allBorders
    cell.alignment = {
      horizontal: typeof v === 'number' ? 'right' : 'left',
      vertical: 'middle',
    }
  })
  ws.getRow(row).height = 24
}

function applySummaryRow(ws: ExcelJS.Worksheet, row: number, values: (string | number)[], cols: number) {
  for (let i = 0; i < cols; i++) {
    const cell = ws.getCell(row, i + 1)
    cell.value = values[i] ?? ''
    cell.font = { bold: true, size: 11, color: { argb: DARK_TEXT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F5FF' } }
    cell.border = allBorders
    cell.alignment = { horizontal: typeof values[i] === 'number' ? 'right' : 'center', vertical: 'middle' }
  }
  ws.getRow(row).height = 26
}

function applySectionTitle(ws: ExcelJS.Worksheet, row: number, cols: number, text: string) {
  ws.mergeCells(row, 1, row, cols)
  for (let c = 1; c <= cols; c++) {
    const cell = ws.getCell(row, c)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EBF3FF' } }
    cell.border = allBorders
  }
  const cell = ws.getCell(row, 1)
  cell.value = text
  cell.font = { bold: true, size: 12, color: { argb: BRAND_BLUE } }
  cell.alignment = { horizontal: 'left', vertical: 'middle' }
  ws.getRow(row).height = 26
}

function applyFooter(ws: ExcelJS.Worksheet, row: number, cols: number) {
  ws.getCell(row, 1).value = `导出时间: ${new Date().toLocaleString('zh-CN')} | 叁和文化 · 抖赢运营工作台`
  ws.getCell(row, 1).font = { size: 10, color: { argb: GRAY_TEXT }, italic: true }
  ws.mergeCells(row, 1, row, cols)
}

// ===== 导出入口 =====
export function exportStaffExcel(
  workloadData: StaffWorkloadResult[],
  efficiencyData: StaffEfficiencyResult[],
  staffData: Staff[],
  staffSalaries: Record<string, number>,
  groups: Group[],
  workloadMonth: string,
  effMonth: string,
  sheetName?: string,
) {
  const wb = new ExcelJS.Workbook()
  wb.creator = '叁和文化 · 抖赢运营工作台'

  if (!sheetName || sheetName === '工作量统计') {
    buildWorkloadSheet(wb, workloadData, groups, workloadMonth)
  }
  if (!sheetName || sheetName === '人效计算') {
    buildEfficiencySheet(wb, efficiencyData, staffSalaries, groups, effMonth)
  }
  if (!sheetName || sheetName === '员工信息') {
    buildStaffSheet(wb, staffData, groups)
  }

  const label = sheetName || '全部'
  const filename = `员工管理_${label}_${workloadMonth}.xlsx`

  wb.xlsx.writeBuffer().then((buffer) => {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  })
}

// ========== Sheet 1: 工作量统计 ==========
function buildWorkloadSheet(
  wb: ExcelJS.Workbook,
  data: StaffWorkloadResult[],
  groups: Group[],
  month: string,
) {
  const ws = wb.addWorksheet('工作量统计')
  const cols = 6

  ws.columns = [
    { width: 10 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
    { width: 16 },
    { width: 44 },
  ]

  // 标题
  applyTitleRow(ws, 1, cols, `员工工作量统计 — ${month}`)
  ws.addRow([])

  // 汇总
  const totalWorkload = data.reduce((s, d) => s + d.totalWorkload, 0)
  const avgWorkload = data.length > 0 ? Math.round(totalWorkload / data.length) : 0
  const r2 = ws.addRow([`${month} 共 ${data.length} 人参与 | 总工作量: ${totalWorkload} | 人均: ${avgWorkload}`])
  ws.mergeCells(3, 1, 3, cols)
  r2.getCell(1).font = { bold: true, size: 11, color: { argb: GRAY_TEXT } }
  r2.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }
  r2.height = 28

  ws.addRow([])

  // 表头
  const headerRow = 5
  applyHeaderRow(ws, headerRow, ['姓名', '组', '参与项目(个)', '总角色数', '本月工作量', '参与项目详情'])

  let row = headerRow + 1
  data.forEach((d, idx) => {
    applyDataRow(ws, row, [
      d.staffName,
      d.groupName || '未分组',
      d.projectCount,
      d.totalRoleCount,
      d.totalWorkload,
      d.projectDetails.map((p) => p.projectName).join('、'),
    ], idx % 2 === 1)
    row++
  })

  // 合计行
  applySummaryRow(ws, row, [
    '合计',
    '',
    data.reduce((s, d) => s + d.projectCount, 0),
    data.reduce((s, d) => s + d.totalRoleCount, 0),
    totalWorkload,
    '',
  ], cols)
  row += 2

  // ===== 详细分工明细 =====
  const detailCols = 7
  applySectionTitle(ws, row, detailCols, '详细分工明细')
  row++
  applyHeaderRow(ws, row, ['姓名', '组', '项目名称', '担任角色', '角色数', '已完成(条)', '工作量'], BRAND_GREEN)
  row++

  let detailIdx = 0
  data.forEach((d) => {
    d.projectDetails.forEach((det, i) => {
      applyDataRow(ws, row, [
        i === 0 ? d.staffName : '',
        i === 0 ? (d.groupName || '') : '',
        det.projectName,
        det.roles.join('、'),
        det.roleCount,
        det.monthCompleted,
        det.workload,
      ], detailIdx % 2 === 1)
      detailIdx++
      row++
    })
  })

  // 汇总
  applySummaryRow(ws, row, [
    '全部合计', '', '',
    data.reduce((s, d) => s + d.totalRoleCount, 0),
    data.reduce((s, d) => s + d.projectDetails.reduce((a, p) => a + p.monthCompleted, 0), 0),
    totalWorkload,
  ], detailCols)
  row += 2

  applyFooter(ws, row, cols)
}

// ========== Sheet 2: 人效计算 ==========
function buildEfficiencySheet(
  wb: ExcelJS.Workbook,
  data: StaffEfficiencyResult[],
  staffSalaries: Record<string, number>,
  groups: Group[],
  month: string,
) {
  const ws = wb.addWorksheet('人效计算')
  const cols = 7

  ws.columns = [
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
  ]

  applyTitleRow(ws, 1, cols, `人效计算 — ${month}`)
  ws.addRow([])

  // 汇总
  const totalEff = data.reduce((s, d) => s + d.totalEfficiency, 0)
  const totalSalary = data.reduce((s, d) => s + (staffSalaries[d.staffId] || 0), 0)
  const diff = totalEff - totalSalary
  const avgEff = data.length > 0 ? Math.round(totalEff / data.length) : 0
  const avgSalary = data.length > 0 ? Math.round(totalSalary / data.length) : 0
  const r2 = ws.addRow([
    `总人效: ¥${totalEff.toLocaleString()} | 人均: ¥${avgEff.toLocaleString()} | 总工资: ¥${totalSalary.toLocaleString()} | 人均工资: ¥${avgSalary.toLocaleString()} | 差额: ¥${diff.toLocaleString()}`,
  ])
  ws.mergeCells(3, 1, 3, cols)
  r2.getCell(1).font = { bold: true, size: 11, color: { argb: GRAY_TEXT } }
  r2.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }
  r2.height = 28

  ws.addRow([])

  // 表头
  const headerRow = 5
  applyHeaderRow(ws, headerRow, ['姓名', '组', '项目数', '月度人效(¥)', '上月工资(¥)', '差额(¥)', '人效/工资'], BRAND_GREEN)

  let row = headerRow + 1
  data.forEach((d, idx) => {
    const salary = staffSalaries[d.staffId] || 0
    const ddiff = d.totalEfficiency - salary
    const ratio = salary > 0 ? Math.round((d.totalEfficiency / salary) * 100) + '%' : '未填工资'
    applyDataRow(ws, row, [
      d.staffName,
      d.groupName || '未分组',
      d.projectCount,
      d.totalEfficiency,
      salary > 0 ? salary : '',
      ddiff,
      ratio,
    ], idx % 2 === 1)
    row++
  })

  // 合计行
  applySummaryRow(ws, row, [
    '合计',
    '',
    data.reduce((s, d) => s + d.projectCount, 0),
    totalEff,
    totalSalary,
    diff,
    '',
  ], cols)
  row += 2

  // ===== 人效明细 =====
  const detailCols = 9
  applySectionTitle(ws, row, detailCols, '人效明细')
  row++
  applyHeaderRow(ws, row, [
    '姓名', '组', '项目名称', '月费(¥)', '计划/完成', '完成率', '项目产值(¥)', '担任角色', '该项目人效(¥)',
  ], BRAND_GREEN)
  row++

  let detailIdx = 0
  data.forEach((d) => {
    d.projectDetails.forEach((det, i) => {
      const completionPct = Math.round(det.completionRate * 100) + '%'
      applyDataRow(ws, row, [
        i === 0 ? d.staffName : '',
        i === 0 ? (d.groupName || '') : '',
        det.projectName,
        det.monthlyFee,
        `${det.monthCompleted}/${det.monthPlanned}`,
        completionPct,
        det.projectValue,
        det.roles.join('、'),
        det.efficiency,
      ], detailIdx % 2 === 1)
      detailIdx++
      row++
    })
  })

  // 明细合计
  applySummaryRow(ws, row, [
    '全部合计', '', '',
    data.reduce((s, d) => s + d.projectDetails.reduce((a, p) => a + Number(p.monthlyFee || 0), 0), 0),
    '',
    '',
    data.reduce((s, d) => s + d.projectDetails.reduce((a, p) => a + Number(p.projectValue || 0), 0), 0),
    '',
    totalEff,
  ], detailCols)
  row += 2

  applyFooter(ws, row, cols)
}

// ========== Sheet 3: 员工信息 ==========
function buildStaffSheet(
  wb: ExcelJS.Workbook,
  staffData: Staff[],
  groups: Group[],
) {
  const ws = wb.addWorksheet('员工信息')
  const cols = 5

  ws.columns = [
    { width: 10 },
    { width: 14 },
    { width: 20 },
    { width: 14 },
    { width: 10 },
  ]

  applyTitleRow(ws, 1, cols, '员工信息总览')
  ws.addRow([])

  // 分组统计
  const byGroup = groups.map((g) => ({ name: g.name, count: staffData.filter((s) => s.groupId === g.id).length }))
  const noGroup = staffData.filter((s) => !s.groupId || s.groupId === 'none').length
  const stats = [
    ...byGroup.map((g) => `${g.name}: ${g.count}人`),
    `未分组: ${noGroup}人`,
    `总计: ${staffData.length}人`,
  ].join('  |  ')
  const r2 = ws.addRow([stats])
  ws.mergeCells(3, 1, 3, cols)
  r2.getCell(1).font = { bold: true, size: 11, color: { argb: GRAY_TEXT } }
  r2.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }
  r2.height = 28

  ws.addRow([])

  // 表头
  const headerRow = 5
  applyHeaderRow(ws, headerRow, ['姓名', '角色', '所属组', '状态', '角色数量'], BRAND_GREEN)

  let row = headerRow + 1
  staffData.forEach((s, idx) => {
    const gName = !s.groupId || s.groupId === 'none'
      ? '未分组'
      : groups.find((g) => g.id === s.groupId)?.name || s.groupId
    const safeRoles = Array.isArray(s.roles) ? s.roles : []
    applyDataRow(ws, row, [
      s.name,
      safeRoles.join('、'),
      gName,
      s.status || '在职',
      safeRoles.length,
    ], idx % 2 === 1)
    row++
  })

  row++
  applyFooter(ws, row, cols)
}
