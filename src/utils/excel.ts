import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export function exportToExcel(
  data: Record<string, any>[],
  fileName: string,
  sheetName = 'Sheet1'
) {
  const ws = XLSX.utils.json_to_sheet(data)
  // 设置列宽
  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length * 2, 15),
  }))
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buf], { type: 'application/octet-stream' })
  saveAs(blob, `${fileName}.xlsx`)
}

export function exportMultiSheet(
  sheets: { name: string; data: Record<string, any>[] }[],
  fileName: string
) {
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.data)
    const colWidths = Object.keys(sheet.data[0] || {}).map((key) => ({
      wch: Math.max(key.length * 2, 15),
    }))
    ws['!cols'] = colWidths
    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  }

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buf], { type: 'application/octet-stream' })
  saveAs(blob, `${fileName}.xlsx`)
}
