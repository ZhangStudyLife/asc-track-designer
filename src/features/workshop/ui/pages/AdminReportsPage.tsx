import { ShieldCheck } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkshopAuth } from '../../application/auth'
import { listReports, moderateReport } from '../../application/api'
import { formatWorkshopDate, QueryState, WorkshopLayout } from '../components/WorkshopCommon'

const reasonLabels = {
  spam: '垃圾或广告',
  abuse: '不当内容',
  copyright: '版权问题',
  'invalid-track': '无效赛道',
  other: '其他',
}

export function AdminReportsPage() {
  const auth = useWorkshopAuth()
  const cache = useQueryClient()
  const reports = useQuery({ queryKey: ['workshop-reports'], queryFn: listReports, enabled: auth.profile?.role === 'admin' })
  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'hide' | 'dismiss' }) => moderateReport(id, action),
    onSuccess: () => void cache.invalidateQueries({ queryKey: ['workshop-reports'] }),
  })
  if (auth.profile?.role !== 'admin') return <Navigate to="/workshop" replace />

  return (
    <WorkshopLayout>
      <header className="workshop-content-header"><div><p className="workshop-eyebrow">MODERATION</p><h2>举报管理</h2><p>隐藏违规公开内容，或驳回不成立的举报。</p></div></header>
      <QueryState loading={reports.isLoading} error={reports.error as Error | null} empty={!reports.data?.length}>
        <div className="workshop-report-list">
          {reports.data?.map((report) => <article key={report.id}><ShieldCheck /><div><header><strong>{reasonLabels[report.reason]}</strong><span>{report.targetType === 'track' ? '赛道' : '评论'} · {formatWorkshopDate(report.createdAt)}</span></header><p>{report.details || '举报人未填写补充说明'}</p><small>举报人 @{report.reporter.githubLogin} · 目标 {report.targetId}</small></div><div><button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: report.id, action: 'dismiss' })}>驳回</button><button className="is-danger" type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: report.id, action: 'hide' })}>隐藏内容</button></div></article>)}
        </div>
      </QueryState>
    </WorkshopLayout>
  )
}
