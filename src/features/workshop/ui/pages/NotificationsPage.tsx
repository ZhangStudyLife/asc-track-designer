import { Bell, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkshopAuth } from '../../application/auth'
import { listNotifications, markNotificationsRead } from '../../application/api'
import { AuthButton, formatWorkshopDate, QueryState, WorkshopLayout } from '../components/WorkshopCommon'

export function NotificationsPage() {
  const auth = useWorkshopAuth()
  const cache = useQueryClient()
  const notifications = useQuery({
    queryKey: ['workshop-notifications'],
    queryFn: listNotifications,
    enabled: Boolean(auth.user),
    refetchInterval: 60_000,
  })
  const markRead = useMutation({ mutationFn: markNotificationsRead, onSuccess: () => void cache.invalidateQueries({ queryKey: ['workshop-notifications'] }) })
  if (!auth.user) return <WorkshopLayout><div className="workshop-gated"><Bell /><h2>登录后查看互动消息</h2><AuthButton /></div></WorkshopLayout>
  const unreadIds = (notifications.data || []).filter((item) => !item.readAt).map((item) => item.id)

  return (
    <WorkshopLayout>
      <header className="workshop-content-header"><div><p className="workshop-eyebrow">NOTIFICATIONS</p><h2>互动消息</h2></div><button type="button" disabled={!unreadIds.length || markRead.isPending} onClick={() => markRead.mutate(unreadIds)}>全部标为已读</button></header>
      <QueryState loading={notifications.isLoading} error={notifications.error as Error | null} empty={!notifications.data?.length}>
        <div className="workshop-notification-list">{notifications.data?.map((item) => <Link key={item.id} className={item.readAt ? '' : 'is-unread'} to={item.trackId ? `/workshop/tracks/${item.trackId}` : '/notifications'}>{item.actor?.avatarUrl ? <img src={item.actor.avatarUrl} alt="" /> : <Bell />}<div><strong>{item.actor?.displayName || '系统消息'}</strong><p>{item.message}{item.trackTitle ? `《${item.trackTitle}》` : ''}</p><time>{formatWorkshopDate(item.createdAt)}</time></div><ChevronRight /></Link>)}</div>
      </QueryState>
    </WorkshopLayout>
  )
}
