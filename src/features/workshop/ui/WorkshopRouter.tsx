import React from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { Navigate, Route, Routes } from 'react-router-dom'
import { WorkshopAuthProvider, useWorkshopAuth } from '../application/auth'
import { getWorkshopClient } from '../application/client'
import { showWorkshopNotification } from '../application/notifications'
import { AccountPage } from './pages/AccountPage'
import { AdminReportsPage } from './pages/AdminReportsPage'
import { DiscoverPage } from './pages/DiscoverPage'
import { MinePage } from './pages/MinePage'
import { NotificationsPage } from './pages/NotificationsPage'
import { TrackDetailPage } from './pages/TrackDetailPage'
import './workshop.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
    mutations: { retry: 0 },
  },
})

function NotificationSync() {
  const auth = useWorkshopAuth()
  const cache = useQueryClient()

  React.useEffect(() => {
    const client = getWorkshopClient()
    if (!client || !auth.user) return undefined
    const channel = client
      .channel(`workshop-notifications:${auth.user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${auth.user.id}`,
      }, (payload) => {
        void cache.invalidateQueries({ queryKey: ['workshop-notifications'] })
        const message = typeof payload.new?.message === 'string' ? payload.new.message : '你收到了新的社区互动'
        void showWorkshopNotification(message)
      })
      .subscribe()
    return () => { void client.removeChannel(channel) }
  }, [auth.user, cache])

  return null
}

export function WorkshopProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkshopAuthProvider>
        <NotificationSync />
        {children}
      </WorkshopAuthProvider>
    </QueryClientProvider>
  )
}

export default function WorkshopRouter() {
  return (
    <Routes>
      <Route path="/workshop" element={<DiscoverPage />} />
      <Route path="/workshop/tracks/:trackId" element={<TrackDetailPage />} />
      <Route path="/workshop/mine" element={<MinePage />} />
      <Route path="/workshop/account" element={<AccountPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/admin/reports" element={<AdminReportsPage />} />
      <Route path="*" element={<Navigate to="/workshop" replace />} />
    </Routes>
  )
}
