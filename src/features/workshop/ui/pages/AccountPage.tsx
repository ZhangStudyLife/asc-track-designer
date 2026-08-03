import React from 'react'
import { Github } from 'lucide-react'
import { useWorkshopAuth } from '../../application/auth'
import { AUTHOR_URL, REPOSITORY_URL } from '../../../../shared/appInfo'
import { openExternalUrl } from '../../../../shared/platform/externalLinks'
import {
  setWorkshopNotificationsEnabled,
  workshopNotificationsEnabled,
} from '../../application/notifications'
import { AuthButton, WorkshopLayout } from '../components/WorkshopCommon'

export function AccountPage() {
  const auth = useWorkshopAuth()
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(workshopNotificationsEnabled)
  const updateNotifications = async (enabled: boolean) => {
    setNotificationsEnabled(await setWorkshopNotificationsEnabled(enabled))
  }

  return (
    <WorkshopLayout>
      <div className="workshop-account-panel">
        <section><Github /><div><p className="workshop-eyebrow">GITHUB ACCOUNT</p><h2>社区账号</h2>{auth.profile ? <p>当前登录：{auth.profile.displayName} (@{auth.profile.githubLogin})</p> : <p>登录后可以下载、发布和参与互动。</p>}</div></section>
        {auth.profile ? <button type="button" onClick={() => void auth.signOut()}>退出登录</button> : <AuthButton />}
        <hr />
        <label className="workshop-toggle-row"><span><strong>Windows 互动通知</strong><small>仅桌面版在收到新点赞、评论或回复时显示系统通知。</small></span><input type="checkbox" checked={notificationsEnabled} onChange={(event) => void updateNotifications(event.target.checked)} /></label>
        <hr />
        <div className="workshop-about-links"><strong>开源与作者</strong><button type="button" onClick={() => void openExternalUrl(REPOSITORY_URL)}>ZhangStudyLife/asc-track-designer</button><button type="button" onClick={() => void openExternalUrl(AUTHOR_URL)}>github.com/ZhangStudyLife</button></div>
      </div>
    </WorkshopLayout>
  )
}
