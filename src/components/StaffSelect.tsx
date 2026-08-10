import { useState, useMemo } from 'react'
import { Select, Checkbox, Input, Empty } from 'antd'
import type { Staff } from '../types'

interface StaffSelectProps {
  value?: string[]
  onChange?: (value: string[]) => void
  staff: Staff[]
  placeholder?: string
  isMobile: boolean
}

/**
 * 员工多选组件
 * - 桌面端：Ant Design Select 多选下拉
 * - 手机端：内联可滚动 Checkbox 列表 + 搜索框（不用浮层，键盘不影响）
 */
export default function StaffSelect({ value = [], onChange, staff, placeholder, isMobile }: StaffSelectProps) {
  const options = staff.map((s) => ({
    label: `${s.name} (${s.roles.join('/')})`,
    value: s.id,
  }))

  if (!isMobile) {
    return (
      <Select
        mode="multiple"
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        style={{ width: '100%' }}
        maxTagCount="responsive"
      />
    )
  }

  // 手机端：内联 Checkbox 列表
  const [keyword, setKeyword] = useState('')
  const filtered = useMemo(() => {
    if (!keyword.trim()) return options
    const k = keyword.trim().toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(k))
  }, [keyword, options])

  const selectedCount = value.length

  return (
    <div>
      <Input.Search
        size="small"
        placeholder="搜索员工姓名或角色"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        style={{ marginBottom: 8 }}
        allowClear
      />
      <div style={{
        maxHeight: 180,
        overflowY: 'auto',
        border: '1px solid #f0f0f0',
        borderRadius: 6,
        padding: '4px 8px',
        background: '#fafafa',
      }}>
        {filtered.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无匹配员工" />
        ) : (
          <Checkbox.Group
            value={value}
            onChange={(checked) => onChange?.(checked as string[])}
            style={{ width: '100%' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filtered.map((opt) => (
                <Checkbox
                  key={opt.value}
                  value={opt.value}
                  style={{
                    padding: '4px 0',
                    margin: 0,
                    fontSize: 14,
                    lineHeight: '24px',
                  }}
                >
                  {opt.label}
                </Checkbox>
              ))}
            </div>
          </Checkbox.Group>
        )}
      </div>
      {selectedCount > 0 && (
        <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
          已选 {selectedCount} 人
        </div>
      )}
    </div>
  )
}
