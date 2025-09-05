import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '智能车赛道绘制系统',
  description: '基于React + Konva.js的智能车赛道设计工具，支持拖拽、自动吸附和精确尺寸计算',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
