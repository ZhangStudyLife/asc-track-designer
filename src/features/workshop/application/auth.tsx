import React from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { WorkshopProfile } from '../domain/types'
import { getWorkshopClient } from './client'
import { desktopGithubSignIn } from './desktopAuth'
import { workshopWebRedirectUrl } from './config'
import { isTauriRuntime } from '../../../shared/platform/runtime'

type AuthStatus = 'unconfigured' | 'loading' | 'anonymous' | 'authenticated'

type WorkshopAuthValue = {
  status: AuthStatus
  session: Session | null
  user: User | null
  profile: WorkshopProfile | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const WorkshopAuthContext = React.createContext<WorkshopAuthValue | null>(null)

function mapProfile(row: Record<string, unknown>): WorkshopProfile {
  return {
    id: String(row.id),
    githubId: Number(row.github_id),
    githubLogin: String(row.github_login || ''),
    displayName: String(row.display_name || row.github_login || ''),
    avatarUrl: String(row.avatar_url || ''),
    role: row.role === 'admin' ? 'admin' : 'user',
  }
}

export function WorkshopAuthProvider({ children }: { children: React.ReactNode }) {
  const client = React.useMemo(() => getWorkshopClient(), [])
  const [status, setStatus] = React.useState<AuthStatus>(client ? 'loading' : 'unconfigured')
  const [session, setSession] = React.useState<Session | null>(null)
  const [profile, setProfile] = React.useState<WorkshopProfile | null>(null)

  React.useEffect(() => {
    if (!client) return undefined
    let active = true

    const applySession = async (nextSession: Session | null) => {
      if (!active) return
      setSession(nextSession)
      if (!nextSession) {
        setProfile(null)
        setStatus('anonymous')
        return
      }

      let { data } = await client.from('profiles').select('*').eq('id', nextSession.user.id).maybeSingle()
      if (!data) {
        await new Promise((resolve) => setTimeout(resolve, 250))
        data = (await client.from('profiles').select('*').eq('id', nextSession.user.id).maybeSingle()).data
      }
      if (!active) return
      setProfile(data ? mapProfile(data) : null)
      setStatus('authenticated')
    }

    void client.auth.getSession().then(({ data }) => applySession(data.session))
    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [client])

  const signIn = React.useCallback(async () => {
    if (!client) throw new Error('创意工坊服务尚未配置')
    setStatus('loading')
    if (isTauriRuntime()) {
      try {
        await desktopGithubSignIn(client)
      } catch (reason) {
        setStatus(session ? 'authenticated' : 'anonymous')
        throw reason
      }
      return
    }
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: workshopWebRedirectUrl() },
      })
      if (error) throw error
    } catch (reason) {
      setStatus(session ? 'authenticated' : 'anonymous')
      throw reason
    }
  }, [client, session])

  const signOut = React.useCallback(async () => {
    if (!client) return
    const { error } = await client.auth.signOut()
    if (error) throw error
  }, [client])

  const value = React.useMemo<WorkshopAuthValue>(() => ({
    status,
    session,
    user: session?.user || null,
    profile,
    signIn,
    signOut,
  }), [profile, session, signIn, signOut, status])

  return <WorkshopAuthContext.Provider value={value}>{children}</WorkshopAuthContext.Provider>
}

export function useWorkshopAuth() {
  const value = React.useContext(WorkshopAuthContext)
  if (!value) throw new Error('useWorkshopAuth must be used inside WorkshopAuthProvider')
  return value
}
