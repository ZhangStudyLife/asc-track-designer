import React from 'react'
import { Bell, Github, LayoutGrid, Route as RouteIcon } from 'lucide-react'
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import PvcDesigner from '../features/pvc/ui/PvcDesigner'

const WorkshopRouter = React.lazy(() => import('../features/workshop/ui/WorkshopRouter'))
const WorkshopProvider = React.lazy(async () => {
  const module = await import('../features/workshop/ui/WorkshopRouter')
  return { default: module.WorkshopProvider }
})

function Workspace() {
  const location = useLocation()
  const needsWorkshop = location.pathname.startsWith('/workshop')
    || location.pathname.startsWith('/notifications')
    || location.pathname.startsWith('/admin')
  const [workshopActivated, setWorkshopActivated] = React.useState(needsWorkshop)

  React.useEffect(() => {
    if (needsWorkshop) setWorkshopActivated(true)
  }, [needsWorkshop])

  const shell = (
    <div className="app-workspace-shell">
      <header className="workspace-nav" aria-label="主工作区导航">
        <NavLink className="workspace-brand" to="/editor" aria-label="打开赛道编辑器">
          <span className="workspace-brand-mark">ASC</span>
          <span>赛道设计器</span>
        </NavLink>
        <nav className="workspace-tabs">
          <NavLink to="/editor" className={({ isActive }) => isActive ? 'is-active' : ''}>
            <RouteIcon size={17} />
            <span>赛道编辑器</span>
          </NavLink>
          <NavLink to="/workshop" onClick={() => setWorkshopActivated(true)} className={({ isActive }) => isActive ? 'is-active' : ''}>
            <LayoutGrid size={17} />
            <span>创意工坊</span>
          </NavLink>
          <NavLink to="/notifications" onClick={() => setWorkshopActivated(true)} className={({ isActive }) => isActive ? 'is-active' : ''}>
            <Bell size={17} />
            <span>消息</span>
          </NavLink>
        </nav>
        <NavLink className="workspace-account-link" to="/workshop/account" onClick={() => setWorkshopActivated(true)}>
          <Github size={17} />
          <span>GitHub 账号</span>
        </NavLink>
      </header>
      <main className="workspace-content">
        <Routes>
          <Route path="/" element={<Navigate to="/editor" replace />} />
          <Route path="/editor" element={<PvcDesigner embedded />} />
          <Route
            path="*"
            element={needsWorkshop ? (
              <React.Suspense fallback={<div className="workspace-loading">正在打开创意工坊...</div>}>
                <WorkshopRouter />
              </React.Suspense>
            ) : <Navigate to="/editor" replace />}
          />
        </Routes>
      </main>
    </div>
  )

  if (!workshopActivated && !needsWorkshop) return shell
  return (
    <React.Suspense fallback={shell}>
      <WorkshopProvider>{shell}</WorkshopProvider>
    </React.Suspense>
  )
}

export default function AppShell() {
  return (
    <HashRouter>
      <Workspace />
    </HashRouter>
  )
}
