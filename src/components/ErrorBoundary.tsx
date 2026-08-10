import { Component, ReactNode } from 'react'
import { Result, Button } from 'antd'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  handleClearData = () => {
    if (window.confirm('确定要清除所有本地数据并重置吗？这将丢失你编辑的所有数据。')) {
      // 清除所有版本的 localStorage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sanhe-dashboard-data')) {
          localStorage.removeItem(key)
        }
      })
      window.location.href = '/'
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40 }}>
          <Result
            status="error"
            title="页面崩溃了"
            subTitle={`错误信息: ${this.state.error?.message || '未知错误'}`}
            extra={[
              <Button type="primary" key="reset" onClick={this.handleReset}>
                返回首页
              </Button>,
              <Button key="clear" danger onClick={this.handleClearData}>
                清除数据重置
              </Button>,
            ]}
          />
          <details style={{ marginTop: 16, fontSize: 12, color: '#8c8c8c' }}>
            <summary>技术详情</summary>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {this.state.error?.stack}
            </pre>
          </details>
        </div>
      )
    }
    return this.props.children
  }
}
