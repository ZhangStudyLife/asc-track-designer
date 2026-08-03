import React from 'react'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { listTracks } from '../../application/api'
import type { WorkshopTrackSort } from '../../domain/types'
import { QueryState, TrackCard, WorkshopLayout } from '../components/WorkshopCommon'

export function DiscoverPage() {
  const [search, setSearch] = React.useState('')
  const [query, setQuery] = React.useState('')
  const [sort, setSort] = React.useState<WorkshopTrackSort>('newest')
  const tracks = useQuery({
    queryKey: ['workshop-tracks', { query, sort }],
    queryFn: () => listTracks({ query, sort }),
  })

  return (
    <WorkshopLayout>
      <header className="workshop-content-header">
        <div>
          <p className="workshop-eyebrow">PUBLIC TRACKS</p>
          <h2>发现公开赛道</h2>
          <p>查看社区作品，登录后可导入编辑器、评分和参与讨论。</p>
        </div>
      </header>
      <form className="workshop-searchbar" onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()) }}>
        <label><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索标题或描述" /></label>
        <select value={sort} onChange={(event) => setSort(event.target.value as WorkshopTrackSort)} aria-label="赛道排序">
          <option value="newest">最新发布</option>
          <option value="rating">高评分</option>
          <option value="downloads">最多下载</option>
          <option value="likes">最多点赞</option>
        </select>
        <button type="submit">搜索</button>
      </form>
      <QueryState loading={tracks.isLoading} error={tracks.error as Error | null} empty={!tracks.data?.items.length}>
        <div className="workshop-track-grid">{tracks.data?.items.map((track) => <TrackCard key={track.id} track={track} />)}</div>
      </QueryState>
    </WorkshopLayout>
  )
}
