"use client"
import React from 'react'
import { MiniMap } from './components/MiniMap'
import { MeasurementOverlay } from './components/MeasurementOverlay'
import { TrackCanvas } from './components/TrackCanvas'
import { TrackPiecesLayer } from './components/TrackPiecesLayer'
import { easeViewBox, normalizeWheelDelta, zoomViewBox } from './viewport'
import {
  findNearestConnectionPointInTargets,
  getConnectionPoints as getTrackConnectionPoints,
  getSnapTargets,
  getTrackPieceVisualCenter,
  SNAP_DISTANCE,
} from '../domain/geometry'
import { parseTrackCode } from '../domain/parser'
import { calculateTrackStats as calculateStatsForPieces } from '../domain/stats'
import { getPvcPieces, usePvcEditorStore } from '../application/editorStore'
import {
  flushPiecesHistory,
  pushPiecesHistory,
  redoPiecesHistory,
  undoPiecesHistory,
} from '../application/storage'
import type { ConnectionPoint, ConnectionPointRef, TrackPiece } from '../domain/types'
import { openTextFile, saveBlobFile, saveTextFile } from '../../../shared/platform/files'
import { isTauriRuntime } from '../../../shared/platform/runtime'

const DESIGN_BOUNDS = { width: 3200, height: 1600, x: -1600, y: -800 }
const ZOOM_ANIMATION_MS = 100

export default function PvcDesigner() {
  const pieceCount = usePvcEditorStore((state) => state.pieceIds.length)
  const setPieces = usePvcEditorStore((state) => state.setPieces)
  // 拖动状态
  const [isDragging, setIsDragging] = React.useState(false)
  // 拖动状态
  // 测量吸附点距离相关状态
  const [isMeasuring, setIsMeasuring] = React.useState(false)
  // 记录测量点为 { pieceId, type: 'start'|'end' }
  const [measurePoints, setMeasurePoints] = React.useState<ConnectionPointRef[]>([])
  // 自动补全直道相关状态
  const [isAutoFill, setIsAutoFill] = React.useState(false)
  const [autoFillPoints, setAutoFillPoints] = React.useState<ConnectionPointRef[]>([])

  // 计算两点距离

  // 吸附点点击事件
  // 点击吸附点时传入pieceId和点类型
  // 测量模式下点击吸附点
  const handleMeasurePointClick = (info: ConnectionPointRef) => {
    if (!isMeasuring) return;
    if (measurePoints.length === 0) {
      setMeasurePoints([info]);
    } else if (measurePoints.length === 1) {
      setMeasurePoints(prev => [prev[0], info]);
      // 测量完成后关闭测量模式，但保留测量结果显示
      setIsMeasuring(false);
    }
  }

  // 自动补全模式下点击吸附点
  const handleAutoFillPointClick = (info: ConnectionPointRef) => {
    if (!isAutoFill) return;
    if (autoFillPoints.length === 0) {
      setAutoFillPoints([info]);
    } else if (autoFillPoints.length === 1) {
      const newPoints = [autoFillPoints[0], info];
      setAutoFillPoints(newPoints);
      setTimeout(() => setIsAutoFill(false), 100);
      setTimeout(() => {
        // 获取两个点的最新坐标
        const getPointCoord = (mp: { pieceId: number, type: 'start' | 'end' }) => {
          const piece = piecesRef.current.find(p => p.id === mp.pieceId)
          if (!piece) return { x: 0, y: 0 }
          if (piece.type === 'straight') {
            const length = piece.params.length * 2
            if (mp.type === 'start') {
              return { x: piece.x, y: piece.y }
            } else {
              return {
                x: piece.x + length * Math.cos((piece.rotation || 0) * Math.PI / 180),
                y: piece.y + length * Math.sin((piece.rotation || 0) * Math.PI / 180)
              }
            }
          } else if (piece.type === 'curve') {
            const centerRadius = piece.params.radius * 2
            const angleRad = (piece.params.angle * Math.PI) / 180
            if (mp.type === 'start') {
              const cx = centerRadius
              const cy = 0
              return {
                x: piece.x + cx * Math.cos((piece.rotation || 0) * Math.PI / 180) - cy * Math.sin((piece.rotation || 0) * Math.PI / 180),
                y: piece.y + cx * Math.sin((piece.rotation || 0) * Math.PI / 180) + cy * Math.cos((piece.rotation || 0) * Math.PI / 180)
              }
            } else {
              const cx = centerRadius * Math.cos(angleRad)
              const cy = centerRadius * Math.sin(angleRad)
              return {
                x: piece.x + cx * Math.cos((piece.rotation || 0) * Math.PI / 180) - cy * Math.sin((piece.rotation || 0) * Math.PI / 180),
                y: piece.y + cx * Math.sin((piece.rotation || 0) * Math.PI / 180) + cy * Math.cos((piece.rotation || 0) * Math.PI / 180)
              }
            }
          }
          return { x: 0, y: 0 }
        }
        const pt1 = getPointCoord(newPoints[0]);
        const pt2 = getPointCoord(newPoints[1]);
        // 计算距离和角度
        const dx = pt2.x - pt1.x;
        const dy = pt2.y - pt1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        // 插入直道piece，起点pt1，长度dist/2，角度angle
        setPieces(prev => {
          const next = [
            ...prev,
            {
              id: Date.now(),
              type: 'straight',
              params: { length: dist / 2 },
              x: pt1.x,
              y: pt1.y,
              rotation: angle
            }
          ];
          pushPiecesHistory(next);
          return next;
        });
        setTimeout(() => setAutoFillPoints([]), 200);
      }, 150);
    }
  }

  // 启动测量
  const startMeasure = () => {
    setIsMeasuring(true)
    setMeasurePoints([])
  }

  // 缩略图拖拽视口框相关状态
  const [draggingMini, setDraggingMini] = React.useState(false);
  const miniDragOffset = React.useRef({ x: 0, y: 0 });
  // 缩略图常量（全局唯一）
  const miniWidth = 300;
  const miniHeight = 150;
  const designX = -2000;
  const designY = -1000;
  const designW = 4000;
  const designH = 2000;
  const scaleX = miniWidth / designW;
  const scaleY = miniHeight / designH;

  // 缩略图拖拽事件处理
  const handleMiniMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingMini(true);
    // 记录鼠标在红框内的偏移
    const startX = e.nativeEvent.offsetX;
    const startY = e.nativeEvent.offsetY;
    const rectX = (viewBox.x - designX) * scaleX;
    const rectY = (viewBox.y - designY) * scaleY;
    miniDragOffset.current = {
      x: startX - rectX,
      y: startY - rectY
    };
    e.stopPropagation();
  };
  const handleMiniMouseMove = (e: React.MouseEvent) => {
    if (!draggingMini) return;
    const mouseX = e.nativeEvent.offsetX;
    const mouseY = e.nativeEvent.offsetY;
    const rectW = viewBox.width * scaleX;
    const rectH = viewBox.height * scaleY;
    let newRectX = mouseX - miniDragOffset.current.x;
    let newRectY = mouseY - miniDragOffset.current.y;
    newRectX = Math.max(0, Math.min(miniWidth - rectW, newRectX));
    newRectY = Math.max(0, Math.min(miniHeight - rectH, newRectY));
    const newViewBoxX = designX + newRectX / scaleX;
    const newViewBoxY = designY + newRectY / scaleY;
    setViewBox({ ...viewBox, x: newViewBoxX, y: newViewBoxY });
  };
  const handleMiniMouseUp = () => {
    setDraggingMini(false);
  };
  // 每次 pieces 变化时自动记录历史快照（拖动时不入栈）
  const [viewBox, setViewBox] = React.useState({ 
    x: -2000, // 扩大视图范围，确保16M×8M区域完全可见
    y: -1000,  
    width: 4000, // 20M宽度（16M+4M边距）
    height: 2000 // 10M高度（8M+2M边距）
  })
  const viewBoxRef = React.useRef(viewBox)
  viewBoxRef.current = viewBox
  const [selectedId, setSelectedId] = React.useState<number | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]) // 多选
  const selectedIdsSet = React.useMemo(() => new Set(selectedIds), [selectedIds])
  const [isSelecting, setIsSelecting] = React.useState(false) // 框选状态
  const [selectionStart, setSelectionStart] = React.useState<{x: number, y: number} | null>(null)
  const [selectionBox, setSelectionBox] = React.useState<{x: number, y: number, width: number, height: number} | null>(null)
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 })
  const [isRotating, setIsRotating] = React.useState(false)
  const [rotationInput, setRotationInput] = React.useState('')
  const [showCustomDialog, setShowCustomDialog] = React.useState(false)
  const [customType, setCustomType] = React.useState('straight')
  const [customLength, setCustomLength] = React.useState('')
  const [customRadius, setCustomRadius] = React.useState('')
  const [customAngle, setCustomAngle] = React.useState('')
  const [savedSizes, setSavedSizes] = React.useState<{straights: number[], curves: {radius: number, angle: number}[]}>({straights: [], curves: []})
  const [hiddenFixedSizes, setHiddenFixedSizes] = React.useState<{straights: number[], curves: {radius: number, angle: number}[]}>({straights: [], curves: []})
  const [isClient, setIsClient] = React.useState(false)
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light')
  const [statusMessage, setStatusMessage] = React.useState('')
  const statusTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [currentArchiveName, setCurrentArchiveName] = React.useState('未命名项目')
  const [archives, setArchives] = React.useState<string[]>([])
  const [showArchiveDialog, setShowArchiveDialog] = React.useState(false)
  const [archiveName, setArchiveName] = React.useState('')
  const [isPanning, setIsPanning] = React.useState(false)
  const svgRef = React.useRef<SVGSVGElement>(null)
  const snapTargetsRef = React.useRef<ConnectionPoint[]>([])
  const pointerFrameRef = React.useRef<number | null>(null)
  const pendingPointerRef = React.useRef<{ clientX: number; clientY: number } | null>(null)
  const zoomFrameRef = React.useRef<number | null>(null)
  const pendingZoomRef = React.useRef<{ delta: number; clientX: number; clientY: number } | null>(null)
  const zoomAnimationFrameRef = React.useRef<number | null>(null)
  const zoomTargetRef = React.useRef<typeof viewBox | null>(null)
  const zoomAnimationStartRef = React.useRef<{ time: number; viewBox: typeof viewBox } | null>(null)
  const isPanningRef = React.useRef(false)
  const panButtonRef = React.useRef<number | null>(null)
  const panPreviousRef = React.useRef<{ clientX: number; clientY: number } | null>(null)
  const pendingPanRef = React.useRef<{ clientX: number; clientY: number } | null>(null)
  const panFrameRef = React.useRef<number | null>(null)
  const selectionBoxRef = React.useRef<{ x: number; y: number; width: number; height: number } | null>(null)
  const dragAnchorIdRef = React.useRef<number | null>(null)
  const piecesRef = React.useRef(getPvcPieces())
  const selectedIdRef = React.useRef(selectedId)
  const selectedIdsRef = React.useRef(selectedIds)
  const isDraggingRef = React.useRef(isDragging)
  const isSelectingRef = React.useRef(isSelecting)
  const selectionStartRef = React.useRef(selectionStart)
  const dragOffsetRef = React.useRef(dragOffset)
  const isClientRef = React.useRef(isClient)
  const currentArchiveNameRef = React.useRef(currentArchiveName)
  selectedIdRef.current = selectedId
  selectedIdsRef.current = selectedIds
  isDraggingRef.current = isDragging
  isSelectingRef.current = isSelecting
  selectionStartRef.current = selectionStart
  dragOffsetRef.current = dragOffset
  isClientRef.current = isClient
  currentArchiveNameRef.current = currentArchiveName

  const showStatusMessage = React.useCallback((message: string, duration = 2000) => {
    setStatusMessage(message)
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    statusTimerRef.current = setTimeout(() => {
      setStatusMessage('')
      statusTimerRef.current = null
    }, duration)
  }, [])

  const scheduleAutoSave = React.useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    if (!isClientRef.current || getPvcPieces().length === 0) return

    autoSaveTimerRef.current = setTimeout(() => {
      const projectData = {
        name: currentArchiveNameRef.current,
        pieces: getPvcPieces(),
        viewBox: viewBoxRef.current,
        timestamp: new Date().toISOString(),
      }
      localStorage.setItem('currentTrackProject', JSON.stringify(projectData))
      showStatusMessage('鑷姩淇濆瓨瀹屾垚')
      autoSaveTimerRef.current = null
    }, 5000)
  }, [showStatusMessage])

  React.useEffect(() => usePvcEditorStore.subscribe(
    (state) => state.revision,
    () => {
      piecesRef.current = getPvcPieces()
      scheduleAutoSave()
    },
    { fireImmediately: true },
  ), [scheduleAutoSave])

  React.useEffect(() => {
    scheduleAutoSave()
  }, [isClient, viewBox, currentArchiveName, scheduleAutoSave])

  React.useEffect(() => {
    const flushHistory = () => flushPiecesHistory()
    window.addEventListener('pagehide', flushHistory)

    return () => {
      window.removeEventListener('pagehide', flushHistory)
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current)
      flushPiecesHistory()
    }
  }, [])

  // 撤销功能：Ctrl+Z
  React.useEffect(() => {
    const handleUndoKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return

      const key = e.key.toLowerCase()
      const isRedo = key === 'y' || (key === 'z' && e.shiftKey)
      const isUndo = key === 'z' && !e.shiftKey
      if (!isUndo && !isRedo) return

      e.preventDefault()
      const currentPieces = getPvcPieces()
      const nextPieces = isRedo
        ? redoPiecesHistory(currentPieces)
        : undoPiecesHistory(currentPieces)

      if (nextPieces) {
        setPieces(nextPieces)
        showStatusMessage(isRedo ? '????' : '????', 1000)
      } else {
        showStatusMessage(isRedo ? '????????' : '????????', 1000)
      }
    }
    window.addEventListener('keydown', handleUndoKey)
    return () => window.removeEventListener('keydown', handleUndoKey)
  }, [setPieces, showStatusMessage])
  
  // 客户端水合后加载localStorage数据
  React.useEffect(() => {
    setIsClient(true)
    try {
      const saved = localStorage.getItem('trackSizes')
      if (saved) {
        setSavedSizes(JSON.parse(saved))
      }
      
      // 加载隐藏的固定尺寸
      const hiddenSizes = localStorage.getItem('hiddenFixedSizes')
      if (hiddenSizes) {
        setHiddenFixedSizes(JSON.parse(hiddenSizes))
      }
      
      // 加载存档列表
      const archiveList = localStorage.getItem('trackArchives')
      if (archiveList) {
        setArchives(JSON.parse(archiveList))
      }

      const savedTheme = localStorage.getItem('trackDesignerTheme')
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme)
      }
      
      // 加载当前项目
      const currentProject = localStorage.getItem('currentTrackProject')
      if (currentProject) {
        const projectData = JSON.parse(currentProject)
        setPieces(projectData.pieces || [])
        setCurrentArchiveName(projectData.name || '未命名项目')
      }
    } catch {
      // 忽略localStorage错误
    }
  }, [setPieces])

  // 自动保存功能
  React.useEffect(() => {
    if (isClient) {
      localStorage.setItem('trackDesignerTheme', theme)
    }
  }, [isClient, theme])


  // 禁用右键菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  // 存档管理
  const saveAsArchive = () => {
    if (piecesRef.current.length === 0) {
      alert('没有赛道可保存')
      return
    }
    setShowArchiveDialog(true)
  }

  const confirmSaveArchive = () => {
    if (!archiveName.trim()) {
      alert('请输入存档名称')
      return
    }
    
    const archiveData = {
      name: archiveName,
      pieces: piecesRef.current,
      viewBox,
      timestamp: new Date().toISOString()
    }
    
    // 保存到localStorage
    localStorage.setItem(`archive_${archiveName}`, JSON.stringify(archiveData))
    
    // 更新存档列表
    const newArchives = [...archives.filter(name => name !== archiveName), archiveName]
    setArchives(newArchives)
    localStorage.setItem('trackArchives', JSON.stringify(newArchives))
    
    setCurrentArchiveName(archiveName)
    setShowArchiveDialog(false)
    setArchiveName('')
    showStatusMessage(`存档"${archiveName}"保存成功`, 3000)
  }

  const loadArchive = (name: string) => {
    try {
      const archiveData = localStorage.getItem(`archive_${name}`)
      if (archiveData) {
        const data = JSON.parse(archiveData)
        setPieces(data.pieces || [])
        setViewBox(data.viewBox || DESIGN_BOUNDS)
        setCurrentArchiveName(name)
        setSelectedId(null)
        setSelectedIds([])
        showStatusMessage(`已加载存档"${name}"`, 3000)
      }
    } catch (error) {
      alert('加载存档失败')
    }
  }

  const newProject = () => {
    if (piecesRef.current.length > 0) {
      if (!confirm('当前项目尚未保存，确定要新建项目吗？')) {
        return
      }
    }
    // ...existing code...
    const commonCurves = {
      'R180': { radius: 200, angle: 180 }
    };
    // normalized 示例赋值
    let normalized = 'R180';
    if (commonCurves[normalized]) {
      return {
        type: 'curve' as const,
        params: commonCurves[normalized]
      }
    }
    return null
  }

  const addTrackFromCode = (code: string) => {
    const trackSpec = parseTrackCode(code)
    if (!trackSpec) {
      alert(`无法识别赛道代码"${code}"，请使用格式：L88(直道) 或 R200A90(弯道)`)
      return
    }
    
    const newPiece = {
      id: Date.now(),
      type: trackSpec.type,
      params: trackSpec.params,
      x: viewBox.x + viewBox.width / 2,
      y: viewBox.y + viewBox.height / 2,
      rotation: 0
    }
    
    setPieces(prev => {
      const next = [...prev, newPiece];
      pushPiecesHistory(next);
      return next;
    });
    setSelectedId(newPiece.id)
    showStatusMessage(`已添加赛道: ${code}`, 3000)
  }

  // 一键回中功能 - 使用与初始状态相同的视角
  const resetView = () => {
    setViewBox({ 
      x: -2000, 
      y: -1000, 
      width: 4000, 
      height: 2000 
    })
    showStatusMessage('视图已重置到默认位置')
  }
  
  const addPiece = (type: string, params: any) => {
    setPieces(prev => {
      const next = [...prev, {
        id: Date.now(),
        type,
        x: viewBox.x + viewBox.width / 2 + (Math.random() - 0.5) * 100,
        y: viewBox.y + viewBox.height / 2 + (Math.random() - 0.5) * 100,
        rotation: 0, // 添加旋转角度
        params
      }];
      pushPiecesHistory(next);
      return next;
    });
  }

  // 保存赛道为JSON文件
  const exportTrackAsJSON = async () => {
    if (piecesRef.current.length === 0) {
      alert('没有赛道可导出')
      return
    }
    
    const trackData = {
      version: '1.0',
      created: new Date().toISOString(),
      bounds: DESIGN_BOUNDS,
      pieces: piecesRef.current
    }
    const fileName = `track_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.json`

    try {
      if (await saveTextFile(fileName, JSON.stringify(trackData, null, 2))) {
        showStatusMessage('赛道数据已导出为JSON文件', 3000)
      }
    } catch (error) {
      console.error('Failed to export track JSON:', error)
      alert('导出失败，请检查文件保存位置后重试')
    }
  }

  // 加载JSON文件 - 增强兼容性
  const loadTrackText = (contents: string) => {
    try {
      const trackData = JSON.parse(contents)
        
      // 兼容不同格式的JSON文件 - 修正判断顺序
      let piecesToLoad: any[] = []
        
      // 优先检查最具体的格式：有 totalPieces 和 details
      if (trackData.totalPieces && trackData.details && Array.isArray(trackData.details)) {
        console.log('识别为完整导出信息格式')
        piecesToLoad = trackData.details.map((detail: any, index: number) => ({
          id: Date.now() + index,
          type: detail.type,
          x: detail.position?.x !== undefined ? detail.position.x : (viewBox.x + viewBox.width / 2),
          y: detail.position?.y !== undefined ? detail.position.y : (viewBox.y + viewBox.height / 2),
          rotation: detail.rotation !== undefined ? detail.rotation : 0,
          params: detail.params
        }))
      } else if (trackData.pieces && Array.isArray(trackData.pieces)) {
        console.log('识别为标准格式')
        piecesToLoad = trackData.pieces
      } else if (trackData.details && Array.isArray(trackData.details)) {
        console.log('识别为简单details格式')
        piecesToLoad = trackData.details.map((detail: any, index: number) => ({
          id: Date.now() + index,
          type: detail.type,
          x: detail.position?.x !== undefined ? detail.position.x : (viewBox.x + viewBox.width / 2),
          y: detail.position?.y !== undefined ? detail.position.y : (viewBox.y + viewBox.height / 2),
          rotation: detail.rotation !== undefined ? detail.rotation : 0,
          params: detail.params
        }))
      } else if (Array.isArray(trackData)) {
        console.log('识别为数组格式')
        piecesToLoad = trackData.map((piece: any, index: number) => ({
          ...piece,
          id: piece.id || Date.now() + index,
          x: piece.x !== undefined ? piece.x : (viewBox.x + viewBox.width / 2),
          y: piece.y !== undefined ? piece.y : (viewBox.y + viewBox.height / 2),
          rotation: piece.rotation || 0
        }))
      } else {
        console.log('未识别的格式，数据结构:', Object.keys(trackData))
      }
        
      if (piecesToLoad.length > 0) {
        // 验证每个元件的参数完整性
        const validPieces = piecesToLoad.filter((piece: any) => {
          // 基本结构检查
          if (!piece || typeof piece !== 'object') return false
          if (!piece.type || (piece.type !== 'straight' && piece.type !== 'curve')) return false
          if (!piece.params || typeof piece.params !== 'object') return false
            
          // 类型特定检查
          if (piece.type === 'straight') {
            return typeof piece.params.length === 'number' && piece.params.length > 0
          }
          if (piece.type === 'curve') {
            return typeof piece.params.radius === 'number' && piece.params.radius > 0 &&
                   typeof piece.params.angle === 'number' && piece.params.angle > 0 && piece.params.angle <= 360
          }
          return false
        }).map((piece: any, index: number) => ({
          ...piece,
          id: piece.id || Date.now() + index,
          x: typeof piece.x === 'number' ? piece.x : (viewBox.x + viewBox.width / 2),
          y: typeof piece.y === 'number' ? piece.y : (viewBox.y + viewBox.height / 2),
          rotation: typeof piece.rotation === 'number' ? piece.rotation : 0
        }))
          
        if (validPieces.length > 0) {
          setPieces(validPieces)
          setSelectedId(null)
          setSelectedIds([])
            
          if (validPieces.length < piecesToLoad.length) {
            alert(`成功加载 ${validPieces.length} 个赛道元件，${piecesToLoad.length - validPieces.length} 个元件因参数不完整被跳过`)
          } else {
            alert(`成功加载 ${validPieces.length} 个赛道元件`)
          }
        } else {
          alert('文件中没有找到有效的赛道数据')
        }
      } else {
        alert('文件中没有找到赛道数据')
      }
    } catch (error) {
      alert('文件格式错误，请选择有效的赛道JSON文件')
    }
  }

  const loadTrackFromJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => loadTrackText(reader.result as string)
    reader.readAsText(file)

    // 清空input以允许重新选择同一文件
    event.target.value = ''
  }

  const openTrackFromJSON = async () => {
    if (!isTauriRuntime()) {
      document.getElementById('file-input')?.click()
      return
    }

    try {
      const file = await openTextFile()
      if (file) loadTrackText(file.contents)
    } catch (error) {
      console.error('Failed to open track JSON:', error)
      alert('打开失败，请检查文件后重试')
    }
  }

  // 导出为图片 - 导出完整16M×8M区域
  const exportAsImage = () => {
    const svg = svgRef.current
    if (!svg) return

    // 获取BOM统计数据
    const stats = calculateTrackStats()
    const bomEntries = Object.entries(stats.bom).sort((a, b) => (b[1] as number) - (a[1] as number))

    // 创建临时SVG，包含完整设计区域
    const tempSvg = svg.cloneNode(true) as SVGSVGElement
    tempSvg.setAttribute('viewBox', `${DESIGN_BOUNDS.x} ${DESIGN_BOUNDS.y} ${DESIGN_BOUNDS.width} ${DESIGN_BOUNDS.height}`)
    tempSvg.setAttribute('width', '7680')  // 进一步提高分辨率到7680x3840
    tempSvg.setAttribute('height', '3840') // 16:8比例，超高分辨率
    
    const svgData = new XMLSerializer().serializeToString(tempSvg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    // 超高分辨率画布 - 增加宽度以容纳BOM信息
    canvas.width = 9600  // 增加宽度来放置BOM信息
    canvas.height = 3840
    
    img.onload = () => {
      if (ctx) {
        // 设置高质量渲染
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        
        // 白色背景
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // 绘制SVG (保持在左侧)
        ctx.drawImage(img, 0, 0, 7680, 3840)
        
        // 在右侧绘制BOM信息
        const bomStartX = 7780  // SVG右侧100像素空隙后开始
        const bomStartY = 100
        
        // 标题
        ctx.fillStyle = '#1f2937'
        ctx.font = 'bold 80px Arial'
        ctx.fillText('📋 BOM物料清单', bomStartX, bomStartY)
        
        // 总结信息背景
        ctx.fillStyle = '#1f2937'
        ctx.fillRect(bomStartX, bomStartY + 40, 1700, 200)
        
        // 总结信息文字
        ctx.fillStyle = 'white'
        ctx.font = 'bold 60px Arial'
        ctx.fillText(`总元件数量: ${stats.totalPieces} 个`, bomStartX + 20, bomStartY + 120)
        ctx.fillStyle = '#fbbf24'
        ctx.font = 'bold 70px Arial'
        ctx.fillText(`赛道总长度: ${stats.totalLength} 米`, bomStartX + 20, bomStartY + 200)
        
        // 元件列表标题
        let currentY = bomStartY + 320
        ctx.fillStyle = '#1f2937'
        ctx.font = 'bold 60px Arial'
        ctx.fillText('🏆 赛道元件统计', bomStartX, currentY)
        
        // 绘制每个元件统计
        currentY += 80
        bomEntries.forEach(([type, count], index) => {
          // 交替背景色
          ctx.fillStyle = index % 2 === 0 ? '#1f2937' : '#374151'
          ctx.fillRect(bomStartX, currentY, 1700, 80)
          
          // 元件类型 (黄色)
          ctx.fillStyle = '#fbbf24'
          ctx.font = 'bold 50px monospace'
          ctx.fillText(type, bomStartX + 20, currentY + 55)
          
          // 数量 (绿色背景)
          ctx.fillStyle = 'rgba(16, 185, 129, 0.3)'
          ctx.fillRect(bomStartX + 1400, currentY + 10, 280, 60)
          ctx.fillStyle = '#10b981'
          ctx.font = 'bold 50px Arial'
          ctx.fillText(`${count} 个`, bomStartX + 1420, currentY + 55)
          
          currentY += 90
        })
      }
      
      // 导出高质量PNG
      canvas.toBlob(async (blob) => {
        try {
          if (blob) {
            const fileName = `track_design_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.png`
            await saveBlobFile(fileName, blob)
          }
        } catch (error) {
          console.error('Failed to export track image:', error)
          alert('图片导出失败，请检查文件保存位置后重试')
        } finally {
          canvas.width = 0
          canvas.height = 0
          URL.revokeObjectURL(svgUrl)
        }
      }, 'image/png', 1.0)
    }

    img.onerror = () => {
      canvas.width = 0
      canvas.height = 0
      URL.revokeObjectURL(svgUrl)
    }
    img.src = svgUrl
  }

  // BOM统计和赛道长度计算
  const calculateTrackStats = () => calculateStatsForPieces(piecesRef.current)

  // 显示BOM对话框状态
  const [showBomDialog, setShowBomDialog] = React.useState(false)

  // 导出赛道尺寸信息
  // 导出赛道尺寸信息
  const exportTrackInfo = async () => {
    const stats = calculateTrackStats()
    const currentPieces = piecesRef.current
    
    const trackInfo = currentPieces.map(piece => {
      if (piece.type === 'straight') {
        return `L${piece.params.length}`
      } else if (piece.type === 'curve') {
        return `R${piece.params.radius}-${piece.params.angle}`
      }
      return ''
    }).filter(Boolean)
    
    const info = {
      totalPieces: currentPieces.length,
      totalLength: `${stats.totalLength}米`,
      pieces: trackInfo,
      bom: stats.bom,
      details: currentPieces.map(p => ({
        type: p.type,
        params: p.params,
        position: { x: p.x, y: p.y },
        rotation: p.rotation
      }))
    }
    
    const fileName = `track_info_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.json`

    try {
      await saveTextFile(fileName, JSON.stringify(info, null, 2))
    } catch (error) {
      console.error('Failed to export track info:', error)
      alert('导出失败，请检查文件保存位置后重试')
    }
  }

  // 添加自定义赛道并永久保存尺寸
  const addCustomPiece = () => {
    if (customType === 'straight') {
      const length = parseFloat(customLength)
      if (length > 0) {
        addPiece('straight', { length })
        
        // 保存到永久列表
        const newSavedSizes = {
          ...savedSizes,
          straights: [...new Set([...savedSizes.straights, length])].sort((a, b) => a - b)
        }
        setSavedSizes(newSavedSizes)
        
        // 只在客户端保存到localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('trackSizes', JSON.stringify(newSavedSizes))
        }
        
        setShowCustomDialog(false)
        setCustomLength('')
      }
    } else if (customType === 'curve') {
      const radius = parseFloat(customRadius)
      const angle = parseFloat(customAngle)
      if (radius > 0 && angle > 0 && angle <= 360) {
        addPiece('curve', { radius, angle })
        
        // 保存到永久列表
        const newCurve = { radius, angle }
        const existingCurves = savedSizes.curves
        const exists = existingCurves.some(c => c.radius === radius && c.angle === angle)
        
        if (!exists) {
          const newSavedSizes = {
            ...savedSizes,
            curves: [...existingCurves, newCurve].sort((a, b) => 
              a.radius === b.radius ? a.angle - b.angle : a.radius - b.radius
            )
          }
          setSavedSizes(newSavedSizes)
          
          // 只在客户端保存到localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('trackSizes', JSON.stringify(newSavedSizes))
          }
        }
        
        setShowCustomDialog(false)
        setCustomRadius('')
        setCustomAngle('')
      }
    }
  }

  // 删除自定义尺寸
  const removeSavedSize = (type: 'straight' | 'curve', value: any) => {
    if (type === 'straight') {
      const newSavedSizes = {
        ...savedSizes,
        straights: savedSizes.straights.filter(length => length !== value)
      }
      setSavedSizes(newSavedSizes)
      localStorage.setItem('trackSizes', JSON.stringify(newSavedSizes))
    } else if (type === 'curve') {
      const newSavedSizes = {
        ...savedSizes,
        curves: savedSizes.curves.filter(curve => 
          !(curve.radius === value.radius && curve.angle === value.angle)
        )
      }
      setSavedSizes(newSavedSizes)
      localStorage.setItem('trackSizes', JSON.stringify(newSavedSizes))
    }
  }

  // 隐藏/显示固定尺寸
  const toggleFixedSize = (type: 'straight' | 'curve', value: any) => {
    if (type === 'straight') {
      const isHidden = hiddenFixedSizes.straights.includes(value)
      const newHiddenSizes = {
        ...hiddenFixedSizes,
        straights: isHidden 
          ? hiddenFixedSizes.straights.filter(length => length !== value)
          : [...hiddenFixedSizes.straights, value]
      }
      setHiddenFixedSizes(newHiddenSizes)
      localStorage.setItem('hiddenFixedSizes', JSON.stringify(newHiddenSizes))
    } else if (type === 'curve') {
      const isHidden = hiddenFixedSizes.curves.some(curve => 
        curve.radius === value.radius && curve.angle === value.angle
      )
      const newHiddenSizes = {
        ...hiddenFixedSizes,
        curves: isHidden
          ? hiddenFixedSizes.curves.filter(curve => 
              !(curve.radius === value.radius && curve.angle === value.angle)
            )
          : [...hiddenFixedSizes.curves, value]
      }
      setHiddenFixedSizes(newHiddenSizes)
      localStorage.setItem('hiddenFixedSizes', JSON.stringify(newHiddenSizes))
    }
  }

  // 统一的鼠标坐标转SVG坐标转换函数
  const getClientSVGCoords = React.useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    
    const matrix = svg.getScreenCTM()
    if (!matrix) return { x: 0, y: 0 }
    
    // 精确的坐标转换
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const coords = point.matrixTransform(matrix.inverse())
    
    return { x: coords.x, y: coords.y }
  }, [])

  const getMouseSVGCoords = (e: React.MouseEvent) => getClientSVGCoords(e.clientX, e.clientY)

  const cancelZoomAnimation = React.useCallback(() => {
    if (zoomFrameRef.current !== null) cancelAnimationFrame(zoomFrameRef.current)
    if (zoomAnimationFrameRef.current !== null) cancelAnimationFrame(zoomAnimationFrameRef.current)
    zoomFrameRef.current = null
    zoomAnimationFrameRef.current = null
    pendingZoomRef.current = null
    zoomTargetRef.current = null
    zoomAnimationStartRef.current = null
  }, [])

  const applyPanPosition = React.useCallback((clientX: number, clientY: number) => {
    const previous = panPreviousRef.current
    if (!previous) return

    const previousCoords = getClientSVGCoords(previous.clientX, previous.clientY)
    const currentCoords = getClientSVGCoords(clientX, clientY)
    const currentViewBox = viewBoxRef.current
    const nextViewBox = {
      ...currentViewBox,
      x: currentViewBox.x - (currentCoords.x - previousCoords.x),
      y: currentViewBox.y - (currentCoords.y - previousCoords.y),
    }

    panPreviousRef.current = { clientX, clientY }
    viewBoxRef.current = nextViewBox
    setViewBox(nextViewBox)
  }, [getClientSVGCoords])

  const startCanvasPan = React.useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const shouldPan = e.button === 1 || (e.button === 0 && e.ctrlKey)
    if (!shouldPan) return

    e.preventDefault()
    cancelZoomAnimation()
    isPanningRef.current = true
    panButtonRef.current = e.button
    panPreviousRef.current = { clientX: e.clientX, clientY: e.clientY }
    pendingPanRef.current = null
    setIsPanning(true)
  }, [cancelZoomAnimation])

  React.useEffect(() => {
    const flushPan = (clientX: number, clientY: number) => {
      if (panFrameRef.current !== null) cancelAnimationFrame(panFrameRef.current)
      panFrameRef.current = null
      pendingPanRef.current = null
      applyPanPosition(clientX, clientY)
    }

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return

      e.preventDefault()
      pendingPanRef.current = { clientX: e.clientX, clientY: e.clientY }
      if (panFrameRef.current !== null) return

      panFrameRef.current = requestAnimationFrame(() => {
        panFrameRef.current = null
        const pending = pendingPanRef.current
        pendingPanRef.current = null
        if (pending) applyPanPosition(pending.clientX, pending.clientY)
      })
    }

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (!isPanningRef.current || e.button !== panButtonRef.current) return

      e.preventDefault()
      flushPan(e.clientX, e.clientY)
      isPanningRef.current = false
      panButtonRef.current = null
      panPreviousRef.current = null
      setIsPanning(false)
    }

    window.addEventListener('mousemove', handleWindowMouseMove, { passive: false })
    window.addEventListener('mouseup', handleWindowMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)
      if (panFrameRef.current !== null) cancelAnimationFrame(panFrameRef.current)
      panFrameRef.current = null
      pendingPanRef.current = null
      panPreviousRef.current = null
      panButtonRef.current = null
      isPanningRef.current = false
    }
  }, [applyPanPosition])

  // 滚轮缩放
  React.useEffect(() => {
    const animateZoom = (time: number) => {
      zoomAnimationFrameRef.current = null
      const animation = zoomAnimationStartRef.current
      const target = zoomTargetRef.current
      if (!animation || !target) return

      const progress = Math.min(1, (time - animation.time) / ZOOM_ANIMATION_MS)
      const nextViewBox = progress === 1
        ? target
        : easeViewBox(animation.viewBox, target, progress)
      viewBoxRef.current = nextViewBox
      setViewBox(nextViewBox)

      if (progress < 1) {
        zoomAnimationFrameRef.current = requestAnimationFrame(animateZoom)
      } else {
        zoomTargetRef.current = null
        zoomAnimationStartRef.current = null
      }
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const svg = svgRef.current
      if (svg) {
        const delta = normalizeWheelDelta(e.deltaY, e.deltaMode, svg.clientHeight)
        const pending = pendingZoomRef.current
        pendingZoomRef.current = {
          delta: (pending?.delta || 0) + delta,
          clientX: e.clientX,
          clientY: e.clientY,
        }

        if (zoomFrameRef.current !== null) return
        zoomFrameRef.current = requestAnimationFrame(() => {
          zoomFrameRef.current = null
          const zoom = pendingZoomRef.current
          pendingZoomRef.current = null
          if (!zoom) return

          const anchor = getClientSVGCoords(zoom.clientX, zoom.clientY)
          const displayedViewBox = viewBoxRef.current
          const ratioX = (anchor.x - displayedViewBox.x) / displayedViewBox.width
          const ratioY = (anchor.y - displayedViewBox.y) / displayedViewBox.height
          const baseViewBox = zoomTargetRef.current || displayedViewBox
          const targetAnchor = {
            x: baseViewBox.x + ratioX * baseViewBox.width,
            y: baseViewBox.y + ratioY * baseViewBox.height,
          }

          zoomTargetRef.current = zoomViewBox(baseViewBox, targetAnchor, zoom.delta)
          zoomAnimationStartRef.current = {
            time: performance.now(),
            viewBox: displayedViewBox,
          }
          if (zoomAnimationFrameRef.current !== null) {
            cancelAnimationFrame(zoomAnimationFrameRef.current)
          }
          zoomAnimationFrameRef.current = requestAnimationFrame(animateZoom)
        })
      }
    }

    const svg = svgRef.current
    if (svg) {
      svg.addEventListener('wheel', handleWheel, { passive: false })
      return () => {
        svg.removeEventListener('wheel', handleWheel)
        cancelZoomAnimation()
      }
    }
  }, [cancelZoomAnimation, getClientSVGCoords])

  // 键盘控制：Tab键旋转，Delete键删除，ESC取消旋转，Ctrl+A全选，快捷键操作
  const saveAsArchiveRef = React.useRef(saveAsArchive)
  const exportAsImageRef = React.useRef(exportAsImage)
  const openTrackFromJSONRef = React.useRef(openTrackFromJSON)
  saveAsArchiveRef.current = saveAsArchive
  exportAsImageRef.current = exportAsImage
  openTrackFromJSONRef.current = openTrackFromJSON

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S 保存
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        saveAsArchiveRef.current()
        return
      }
      
      // Ctrl+O 打开
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault()
        void openTrackFromJSONRef.current()
        return
      }
      
      // Ctrl+E 导出图片
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault()
        exportAsImageRef.current()
        return
      }
      
      const activeSelectedId = selectedIdRef.current
      const activeSelectedIds = selectedIdsRef.current

      if (e.key === 'Tab' && (activeSelectedId !== null || activeSelectedIds.length > 0)) {
        e.preventDefault()
        // Tab键：旋转选中的赛道，并同步入栈
        const idsToRotate = new Set(activeSelectedIds.length > 0 ? activeSelectedIds : (activeSelectedId !== null ? [activeSelectedId] : []))
        setPieces(prev => {
          const next = prev.map(p =>
            idsToRotate.has(p.id)
              ? { ...p, rotation: (p.rotation - 15) % 360 }
              : p
          );
          pushPiecesHistory(next);
          return next;
        });
      } else if (e.key === 'Delete') {
        // Delete键：删除选中元件，并同步入栈
        const idsToDelete = new Set(activeSelectedIds.length > 0 ? activeSelectedIds : (activeSelectedId !== null ? [activeSelectedId] : []))
        setPieces(prev => {
          const next = prev.filter(p => !idsToDelete.has(p.id));
          pushPiecesHistory(next);
          return next;
        });
        setSelectedId(null)
        setSelectedIds([])
        selectedIdRef.current = null
        selectedIdsRef.current = []
      } else if (e.key === 'Escape') {
        // ESC键：取消选择和旋转输入
        setIsRotating(false)
        setRotationInput('')
        setSelectedId(null)
        setSelectedIds([])
        setIsSelecting(false)
        setSelectionBox(null)
        selectedIdRef.current = null
        selectedIdsRef.current = []
        isSelectingRef.current = false
        selectionStartRef.current = null
        selectionBoxRef.current = null
      } else if (e.key === 'a' && e.ctrlKey) {
        // Ctrl+A：全选
        e.preventDefault()
        const allPieceIds = piecesRef.current.map(p => p.id)
        selectedIdsRef.current = allPieceIds
        selectedIdRef.current = null
        setSelectedIds(allPieceIds)
        setSelectedId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setPieces])

  // 框选检测
  const isInSelectionBox = (piece: TrackPiece, box: {x: number, y: number, width: number, height: number}) => {
    const center = getTrackPieceVisualCenter(piece)
    return center.x >= box.x &&
           center.x <= box.x + box.width &&
           center.y >= box.y &&
           center.y <= box.y + box.height
  }

  // 双击旋转功能
  const handleDoubleClick = (piece: any) => {
    if (selectedIds.length > 0) {
      // 多选状态下双击
      setIsRotating(true)
      setRotationInput('')
    } else {
      // 单选状态
      selectedIdRef.current = piece.id
      selectedIdsRef.current = []
      setSelectedId(piece.id)
      setSelectedIds([])
      setIsRotating(true)
      setRotationInput(piece.rotation.toString())
    }
  }

  // 计算连接点位置
  const getConnectionPoints = (piece: TrackPiece) => getTrackConnectionPoints(piece)

  // 寻找最近的连接点 - 简化：只检查距离，不检查角度
  const findNearestConnectionPoint = (draggedPiece: TrackPiece, newX: number, newY: number) => {
    return findNearestConnectionPointInTargets(draggedPiece, snapTargetsRef.current, newX, newY, SNAP_DISTANCE)
  }

  // 确认旋转角度
  const confirmRotation = () => {
    const angle = parseFloat(rotationInput)
    if (!isNaN(angle)) {
      setPieces(prev => prev.map(p => 
        p.id === selectedId 
          ? { ...p, rotation: angle % 360 }
          : p
      ))
    }
    setIsRotating(false)
    setRotationInput('')
  }

  // 鼠标事件处理 - 支持多选和框选
  const handleMouseDown = (e: React.MouseEvent, piece?: any) => {
    cancelZoomAnimation()
    if (piece) {
      if (e.button !== 0) return
      e.stopPropagation()
      const activeSelectedIds = selectedIdsRef.current
      const activeSelectedIdsSet = new Set(activeSelectedIds)
      const currentPieces = piecesRef.current
      
      if (e.ctrlKey) {
        // Ctrl+点击：多选
        if (activeSelectedIdsSet.has(piece.id)) {
          const nextSelectedIds = activeSelectedIds.filter(id => id !== piece.id)
          selectedIdsRef.current = nextSelectedIds
          setSelectedIds(nextSelectedIds)
        } else {
          const nextSelectedIds = [...activeSelectedIds, piece.id]
          selectedIdsRef.current = nextSelectedIds
          setSelectedIds(nextSelectedIds)
        }
        selectedIdRef.current = null
        setSelectedId(null)
      } else if (activeSelectedIdsSet.has(piece.id)) {
        // 点击已选中的多选项：开始拖拽多选
        // 拖动开始时入栈一次快照
        pushPiecesHistory(currentPieces);
        snapTargetsRef.current = currentPieces.flatMap(candidate =>
          activeSelectedIdsSet.has(candidate.id) ? [] : getConnectionPoints(candidate)
        )
        dragAnchorIdRef.current = piece.id
        isDraggingRef.current = true
        setIsDragging(true)
        const coords = getMouseSVGCoords(e)
        const nextDragOffset = { x: coords.x - piece.x, y: coords.y - piece.y }
        dragOffsetRef.current = nextDragOffset
        setDragOffset(nextDragOffset)
      } else {
        // 单选
        selectedIdRef.current = piece.id
        selectedIdsRef.current = []
        setSelectedId(piece.id)
        setSelectedIds([])
        // 拖动开始时入栈一次快照
        pushPiecesHistory(currentPieces);
        snapTargetsRef.current = getSnapTargets(currentPieces, piece.id)
        dragAnchorIdRef.current = piece.id
        isDraggingRef.current = true
        setIsDragging(true)
        const coords = getMouseSVGCoords(e)
        const nextDragOffset = { x: coords.x - piece.x, y: coords.y - piece.y }
        dragOffsetRef.current = nextDragOffset
        setDragOffset(nextDragOffset)
      }
    } else {
      // 空白区域点击：开始框选
      if (e.button !== 0 || e.ctrlKey) return

      const coords = getMouseSVGCoords(e)
      
      if (!e.ctrlKey) {
        selectedIdRef.current = null
        selectedIdsRef.current = []
        setSelectedId(null)
        setSelectedIds([])
      }
      setIsRotating(false)
      isSelectingRef.current = true
      selectionStartRef.current = { x: coords.x, y: coords.y }
      setIsSelecting(true)
      setSelectionStart(selectionStartRef.current)
      const initialBox = { x: coords.x, y: coords.y, width: 0, height: 0 }
      selectionBoxRef.current = initialBox
      setSelectionBox(initialBox)
    }
  }

  const processMouseMove = (clientX: number, clientY: number) => {
    const activeSelectionStart = selectionStartRef.current
    if (isSelectingRef.current && activeSelectionStart) {
      // 框选模式 - 使用统一的坐标转换
      const coords = getClientSVGCoords(clientX, clientY)
      
      // 确保选择框精确跟随鼠标
      const newBox = {
        x: Math.min(activeSelectionStart.x, coords.x),
        y: Math.min(activeSelectionStart.y, coords.y),
        width: Math.abs(coords.x - activeSelectionStart.x),
        height: Math.abs(coords.y - activeSelectionStart.y)
      }
      selectionBoxRef.current = newBox
      setSelectionBox(newBox)
    } else if (isDraggingRef.current) {
      // 拖拽模式 - 使用统一的坐标转换
      const activeSelectedId = selectedIdRef.current
      const activeSelectedIds = selectedIdsRef.current
      const activeSelectedIdsSet = new Set(activeSelectedIds)
      const idsToMove = activeSelectedIds.length > 0 ? activeSelectedIds : (activeSelectedId !== null ? [activeSelectedId] : [])
      if (idsToMove.length === 0) return

      const coords = getClientSVGCoords(clientX, clientY)
      
      let newX = coords.x - dragOffsetRef.current.x
      let newY = coords.y - dragOffsetRef.current.y
      
      // 边界限制
      newX = Math.max(DESIGN_BOUNDS.x, Math.min(DESIGN_BOUNDS.x + DESIGN_BOUNDS.width, newX))
      newY = Math.max(DESIGN_BOUNDS.y, Math.min(DESIGN_BOUNDS.y + DESIGN_BOUNDS.height, newY))
        
        // 确定要移动的赛道
        const currentPieces = piecesRef.current
        
        if (snapTargetsRef.current.length > 0) {
          // 单个赛道或多选锚点：检查外部连接点吸附
          const draggedPiece = currentPieces.find(p => p.id === dragAnchorIdRef.current)
          if (draggedPiece) {
            const snapPoint = findNearestConnectionPoint(draggedPiece, newX, newY)
            if (snapPoint) {
              newX = snapPoint.targetX
              newY = snapPoint.targetY
            }
          }
        }
        
        // 多选或单选移动
        if (activeSelectedIds.length > 0) {
          // 多选移动：计算偏移量
          const referencePiece = currentPieces.find(p => p.id === dragAnchorIdRef.current)
          if (referencePiece) {
            const deltaX = newX - referencePiece.x
            const deltaY = newY - referencePiece.y
            setPieces(prev => prev.map(p => 
              activeSelectedIdsSet.has(p.id)
                ? { ...p, x: p.x + deltaX, y: p.y + deltaY }
                : p
            ))
          }
        } else if (activeSelectedId !== null) {
          // 单选移动
          setPieces(prev => prev.map(p => 
            p.id === activeSelectedId
              ? { ...p, x: newX, y: newY }
              : p
          ))
        }
    }
  }

  const flushPendingPointerMove = () => {
    if (pointerFrameRef.current !== null) {
      cancelAnimationFrame(pointerFrameRef.current)
      pointerFrameRef.current = null
    }

    const pendingPointer = pendingPointerRef.current
    pendingPointerRef.current = null
    if (pendingPointer) processMouseMove(pendingPointer.clientX, pendingPointer.clientY)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelectingRef.current && !isDraggingRef.current) return

    pendingPointerRef.current = { clientX: e.clientX, clientY: e.clientY }
    if (pointerFrameRef.current !== null) return

    pointerFrameRef.current = requestAnimationFrame(() => {
      pointerFrameRef.current = null
      const pendingPointer = pendingPointerRef.current
      pendingPointerRef.current = null
      if (pendingPointer) processMouseMove(pendingPointer.clientX, pendingPointer.clientY)
    })
  }

  const handleMouseUp = () => {
    flushPendingPointerMove()

    const activeSelectionBox = selectionBoxRef.current || selectionBox
    if (isSelectingRef.current && activeSelectionBox) {
      // 完成框选
      const selectedInBox = piecesRef.current.filter(piece => isInSelectionBox(piece, activeSelectionBox))
      const nextSelectedIds = [...new Set([...selectedIdsRef.current, ...selectedInBox.map(piece => piece.id)])]
      selectedIdsRef.current = nextSelectedIds
      setSelectedIds(nextSelectedIds)
      isSelectingRef.current = false
      selectionStartRef.current = null
      setIsSelecting(false)
      setSelectionBox(null)
      setSelectionStart(null)
      selectionBoxRef.current = null
    }
    isDraggingRef.current = false
    dragAnchorIdRef.current = null
    setIsDragging(false)
    snapTargetsRef.current = []
    // 拖动结束时如pieces有变化则入栈一次
    setPieces(currentPieces => {
      pushPiecesHistory(currentPieces)
      return currentPieces
    })
  }

  const isDark = theme === 'dark'
  const ui = {
    appBg: isDark ? '#020817' : '#eef2f7',
    panel: isDark ? '#0f172a' : '#ffffff',
    panelSoft: isDark ? '#111c30' : '#f8fafc',
    canvas: isDark ? '#08111f' : '#f8fafc',
    canvasGrid: isDark ? '#203047' : '#e7edf5',
    border: isDark ? '#23324a' : '#dbe3ee',
    borderStrong: isDark ? '#334155' : '#cbd5e1',
    text: isDark ? '#e5e7eb' : '#111827',
    muted: isDark ? '#94a3b8' : '#64748b',
    button: isDark ? '#101b2d' : '#ffffff',
    primary: isDark ? '#38bdf8' : '#2563eb',
    primaryText: isDark ? '#04111f' : '#ffffff',
    statusBg: isDark ? '#030712' : '#111827',
    statusText: isDark ? '#94a3b8' : '#cbd5e1',
    shadow: isDark ? '0 18px 50px rgba(0,0,0,0.35)' : '0 18px 45px rgba(15,23,42,0.10)'
  }
  const buttonBase = {
    height: 34,
    padding: '0 12px',
    borderRadius: 7,
    border: `1px solid ${ui.borderStrong}`,
    backgroundColor: ui.button,
    color: ui.text,
    cursor: 'pointer',
    userSelect: 'none' as const,
    fontSize: 13,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    boxShadow: 'none'
  }
  const primaryButton = {
    ...buttonBase,
    border: `1px solid ${ui.primary}`,
    backgroundColor: ui.primary,
    color: ui.primaryText
  }

  return React.createElement('div', {
    style: { 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: 'Inter, Microsoft YaHei, Arial, sans-serif',
      position: 'relative',
      backgroundColor: ui.appBg,
      color: ui.text
    }
  }, [
    // 工具栏
    React.createElement('div', {
      key: 'toolbar',
      style: {
        padding: '12px 18px',
        borderBottom: `1px solid ${ui.border}`,
        backgroundColor: ui.panel,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: ui.shadow,
        zIndex: 20
      }
    }, [
      // 实验室Logo和标题
      React.createElement('div', {
        key: 'brand',
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }
      }, [
        React.createElement('img', {
          key: 'logo',
          src: '/lab-logo.png',
          alt: 'ASC实验室',
          style: {
            width: '40px',
            height: '40px',
            objectFit: 'contain'
          },
          onError: (e: any) => {
            e.target.style.display = 'none'
          }
        }),
        React.createElement('div', {
          key: 'title-group',
          style: {
            display: 'flex',
            flexDirection: 'column'
          }
        }, [
          React.createElement('h1', {
            key: 'title',
            style: {
              margin: '0',
              fontSize: '22px',
              fontWeight: 800,
              color: ui.text,
              fontFamily: 'Microsoft YaHei, sans-serif'
            }
          }, 'ASC智能车赛道设计器'),
          React.createElement('span', {
            key: 'subtitle',
            style: {
              fontSize: '12px',
              color: ui.muted
            }
          }, '实验室内部专用工具')
        ])
      ]),
    // 工具栏右侧功能按钮区（含测量按钮）
    React.createElement('div', {
      key: 'toolbar-actions',
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginLeft: 'auto'
      }
    }, [
      React.createElement('button', {
        key: 'measure-btn',
        style: isMeasuring ? { ...primaryButton, backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#ffffff' } : buttonBase,
        onClick: () => { setIsMeasuring(true); setMeasurePoints([]); setIsAutoFill(false); setAutoFillPoints([]); },
        title: isMeasuring ? '依次点击两个吸附点' : '点击后可测量两个吸附点间距离'
      }, isMeasuring ? (measurePoints.length === 1 ? '再点一个吸附点' : '点击吸附点') : '测量距离'),
      React.createElement('button', {
        key: 'theme-toggle',
        style: buttonBase,
        onClick: () => setTheme(prev => prev === 'light' ? 'dark' : 'light'),
        title: '切换白天/夜间模式'
      }, theme === 'light' ? '夜间' : '白天'),
      React.createElement('button', {
        key: 'autofill-btn',
        style: isAutoFill ? primaryButton : buttonBase,
        onClick: () => { setIsAutoFill(true); setAutoFillPoints([]); setIsMeasuring(false); setMeasurePoints([]); },
        title: isAutoFill ? '依次点击两个吸附点' : '点击后可自动补全直道'
      }, isAutoFill ? (autoFillPoints.length === 1 ? '再点一个吸附点' : '点击吸附点') : '自动补全直道'),
    ]),

    // 右下角悬浮缩略图
    React.createElement('div', {
      key: 'mini-map',
      style: {
        position: 'fixed',
        right: 20,
        bottom: 44,
        zIndex: 1000,
        background: isDark ? 'rgba(15,23,42,0.94)' : 'rgba(255,255,255,0.94)',
        borderRadius: 10,
        boxShadow: ui.shadow,
        padding: 8,
        border: `1px solid ${ui.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 190,
        minHeight: 100
      }
    }, 
      React.createElement(MiniMap, {
        viewBox,
        dragging: draggingMini,
        onMouseDown: handleMiniMouseDown,
        onMouseMove: handleMiniMouseMove,
        onMouseUp: handleMiniMouseUp,
      })
    ),
      
      React.createElement('h1', {
        key: 'old-title',
        style: { display: 'none' } // 隐藏原标题
      }, '🏁 SolidWorks风格智能车赛道设计器'),

      React.createElement('div', {
        key: 'controls',
        style: {
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          alignItems: 'center',
          width: '100%',
          paddingTop: 10,
          borderTop: `1px solid ${ui.border}`
        }
      }, [
        // L25直道按钮
        ...(!hiddenFixedSizes.straights.includes(25) ? [
          React.createElement('div', {
            key: 'str25-group',
            style: { display: 'flex', alignItems: 'center', gap: '2px' }
          }, 
            React.createElement('button', {
              key: 'str25',
              onClick: () => addPiece('straight', { length: 25 }),
              style: {
                padding: '8px 16px',
                backgroundColor: isDark ? '#13274a' : '#dbeafe',
                color: isDark ? '#93c5fd' : '#1d4ed8',
                border: `1px solid ${isDark ? '#1d4f86' : '#bfdbfe'}`,
                borderRadius: '6px 0 0 6px',
                cursor: 'pointer',
                userSelect: 'none'
              }
            }, 'L25'),
            React.createElement('button', {
              key: 'hide-str25',
              onClick: () => toggleFixedSize('straight', 25),
              style: {
                padding: '8px 8px',
                backgroundColor: isDark ? '#2a1420' : '#f8fafc',
                color: isDark ? '#fca5a5' : '#991b1b',
                border: `1px solid ${isDark ? '#59303a' : '#e2e8f0'}`,
                borderRadius: '0 6px 6px 0',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '12px'
              }
            }, '×')
          )
        ] : []),

        // L37.5直道按钮
        ...(!hiddenFixedSizes.straights.includes(37.5) ? [
          React.createElement('div', {
            key: 'str37.5-group',
            style: { display: 'flex', alignItems: 'center', gap: '2px' }
          }, [
            React.createElement('button', {
              key: 'str37.5',
              onClick: () => addPiece('straight', { length: 37.5 }),
              style: {
                padding: '8px 16px',
                backgroundColor: isDark ? '#13274a' : '#dbeafe',
                color: isDark ? '#93c5fd' : '#1d4ed8',
                border: `1px solid ${isDark ? '#1d4f86' : '#bfdbfe'}`,
                borderRadius: '6px 0 0 6px',
                cursor: 'pointer',
                userSelect: 'none'
              }
            }, 'L37.5'),
            React.createElement('button', {
              key: 'hide-str37.5',
              onClick: () => toggleFixedSize('straight', 37.5),
              style: {
                padding: '8px 8px',
                backgroundColor: isDark ? '#2a1420' : '#f8fafc',
                color: isDark ? '#fca5a5' : '#991b1b',
                border: `1px solid ${isDark ? '#59303a' : '#e2e8f0'}`,
                borderRadius: '0 6px 6px 0',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '12px'
              }
            }, '×')
          ])
        ] : []),

        // L50直道按钮
        ...(!hiddenFixedSizes.straights.includes(50) ? [
          React.createElement('div', {
            key: 'str50-group',
            style: { display: 'flex', alignItems: 'center', gap: '2px' }
          }, [
            React.createElement('button', {
              key: 'str50',
              onClick: () => addPiece('straight', { length: 50 }),
              style: {
                padding: '8px 16px',
                backgroundColor: isDark ? '#13274a' : '#dbeafe',
                color: isDark ? '#93c5fd' : '#1d4ed8',
                border: `1px solid ${isDark ? '#1d4f86' : '#bfdbfe'}`,
                borderRadius: '6px 0 0 6px',
                cursor: 'pointer',
                userSelect: 'none'
              }
            }, 'L50'),
            React.createElement('button', {
              key: 'hide-str50',
              onClick: () => toggleFixedSize('straight', 50),
              style: {
                padding: '8px 8px',
                backgroundColor: isDark ? '#2a1420' : '#f8fafc',
                color: isDark ? '#fca5a5' : '#991b1b',
                border: `1px solid ${isDark ? '#59303a' : '#e2e8f0'}`,
                borderRadius: '0 6px 6px 0',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '12px'
              }
            }, '×')
          ])
        ] : []),

        // L75直道按钮
        ...(!hiddenFixedSizes.straights.includes(75) ? [
          React.createElement('div', {
            key: 'str75-group',
            style: { display: 'flex', alignItems: 'center', gap: '2px' }
          }, [
            React.createElement('button', {
              key: 'str75',
              onClick: () => addPiece('straight', { length: 75 }),
              style: {
                padding: '8px 16px',
                backgroundColor: isDark ? '#13274a' : '#dbeafe',
                color: isDark ? '#93c5fd' : '#1d4ed8',
                border: `1px solid ${isDark ? '#1d4f86' : '#bfdbfe'}`,
                borderRadius: '6px 0 0 6px',
                cursor: 'pointer',
                userSelect: 'none'
              }
            }, 'L75'),
            React.createElement('button', {
              key: 'hide-str75',
              onClick: () => toggleFixedSize('straight', 75),
              style: {
                padding: '8px 8px',
                backgroundColor: isDark ? '#2a1420' : '#f8fafc',
                color: isDark ? '#fca5a5' : '#991b1b',
                border: `1px solid ${isDark ? '#59303a' : '#e2e8f0'}`,
                borderRadius: '0 6px 6px 0',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '12px'
              }
            }, '×')
          ])
        ] : []),

        // L100直道按钮
        ...(!hiddenFixedSizes.straights.includes(100) ? [
          React.createElement('div', {
            key: 'str100-group',
            style: { display: 'flex', alignItems: 'center', gap: '2px' }
          }, [
            React.createElement('button', {
              key: 'str100',
              onClick: () => addPiece('straight', { length: 100 }),
              style: {
                padding: '8px 16px',
                backgroundColor: isDark ? '#13274a' : '#dbeafe',
                color: isDark ? '#93c5fd' : '#1d4ed8',
                border: `1px solid ${isDark ? '#1d4f86' : '#bfdbfe'}`,
                borderRadius: '6px 0 0 6px',
                cursor: 'pointer',
                userSelect: 'none'
              }
            }, 'L100'),
            React.createElement('button', {
              key: 'hide-str100',
              onClick: () => toggleFixedSize('straight', 100),
              style: {
                padding: '8px 8px',
                backgroundColor: isDark ? '#2a1420' : '#f8fafc',
                color: isDark ? '#fca5a5' : '#991b1b',
                border: `1px solid ${isDark ? '#59303a' : '#e2e8f0'}`,
                borderRadius: '0 6px 6px 0',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '12px'
              }
            }, '×')
          ])
        ] : []),

        // R50-30弯道按钮
        ...(!hiddenFixedSizes.curves.some(curve => curve.radius === 50 && curve.angle === 30) ? [
          React.createElement('div', {
            key: 'curve50-30-group',
            style: { display: 'flex', alignItems: 'center', gap: '2px' }
          }, [
            React.createElement('button', {
              key: 'curve50-30',
              onClick: () => addPiece('curve', { radius: 50, angle: 30 }),
              style: {
                padding: '8px 16px',
                backgroundColor: isDark ? '#063a31' : '#d1fae5',
                color: isDark ? '#6ee7b7' : '#047857',
                border: `1px solid ${isDark ? '#0f766e' : '#a7f3d0'}`,
                borderRadius: '6px 0 0 6px',
                cursor: 'pointer',
                userSelect: 'none'
              }
            }, 'R50-30'),
            React.createElement('button', {
              key: 'hide-curve50-30',
              onClick: () => toggleFixedSize('curve', { radius: 50, angle: 30 }),
              style: {
                padding: '8px 8px',
                backgroundColor: isDark ? '#2a1420' : '#f8fafc',
                color: isDark ? '#fca5a5' : '#991b1b',
                border: `1px solid ${isDark ? '#59303a' : '#e2e8f0'}`,
                borderRadius: '0 6px 6px 0',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '12px'
              }
            }, '×')
          ])
        ] : []),

        // R50-45弯道按钮
        ...(!hiddenFixedSizes.curves.some(curve => curve.radius === 50 && curve.angle === 45) ? [
          React.createElement('div', {
            key: 'curve50-45-group',
            style: { display: 'flex', alignItems: 'center', gap: '2px' }
          }, [
            React.createElement('button', {
              key: 'curve50-45',
              onClick: () => addPiece('curve', { radius: 50, angle: 45 }),
              style: {
                padding: '8px 16px',
                backgroundColor: isDark ? '#063a31' : '#d1fae5',
                color: isDark ? '#6ee7b7' : '#047857',
                border: `1px solid ${isDark ? '#0f766e' : '#a7f3d0'}`,
                borderRadius: '6px 0 0 6px',
                cursor: 'pointer',
                userSelect: 'none'
              }
            }, 'R50-45'),
            React.createElement('button', {
              key: 'hide-curve50-45',
              onClick: () => toggleFixedSize('curve', { radius: 50, angle: 45 }),
              style: {
                padding: '8px 8px',
                backgroundColor: isDark ? '#2a1420' : '#f8fafc',
                color: isDark ? '#fca5a5' : '#991b1b',
                border: `1px solid ${isDark ? '#59303a' : '#e2e8f0'}`,
                borderRadius: '0 6px 6px 0',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '12px'
              }
            }, '×')
          ])
        ] : []),

        // R50-90弯道按钮
        ...(!hiddenFixedSizes.curves.some(curve => curve.radius === 50 && curve.angle === 90) ? [
          React.createElement('div', {
            key: 'curve50-90-group',
            style: { display: 'flex', alignItems: 'center', gap: '2px' }
          }, [
            React.createElement('button', {
              key: 'curve50-90',
              onClick: () => addPiece('curve', { radius: 50, angle: 90 }),
              style: {
                padding: '8px 16px',
                backgroundColor: isDark ? '#063a31' : '#d1fae5',
                color: isDark ? '#6ee7b7' : '#047857',
                border: `1px solid ${isDark ? '#0f766e' : '#a7f3d0'}`,
                borderRadius: '6px 0 0 6px',
                cursor: 'pointer',
                userSelect: 'none'
              }
            }, 'R50-90'),
            React.createElement('button', {
              key: 'hide-curve50-90',
              onClick: () => toggleFixedSize('curve', { radius: 50, angle: 90 }),
              style: {
                padding: '8px 8px',
                backgroundColor: isDark ? '#2a1420' : '#f8fafc',
                color: isDark ? '#fca5a5' : '#991b1b',
                border: `1px solid ${isDark ? '#59303a' : '#e2e8f0'}`,
                borderRadius: '0 6px 6px 0',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '12px'
              }
            }, '×')
          ])
        ] : []),

        // R70-45弯道按钮
        ...(!hiddenFixedSizes.curves.some(curve => curve.radius === 70 && curve.angle === 45) ? [
          React.createElement('div', {
            key: 'curve70-45-group',
            style: { display: 'flex', alignItems: 'center', gap: '2px' }
          }, [
            React.createElement('button', {
              key: 'curve70-45',
              onClick: () => addPiece('curve', { radius: 70, angle: 45 }),
              style: {
                padding: '8px 16px',
                backgroundColor: isDark ? '#063a31' : '#d1fae5',
                color: isDark ? '#6ee7b7' : '#047857',
                border: `1px solid ${isDark ? '#0f766e' : '#a7f3d0'}`,
                borderRadius: '6px 0 0 6px',
                cursor: 'pointer',
                userSelect: 'none'
              }
            }, 'R70-45'),
            React.createElement('button', {
              key: 'hide-curve70-45',
              onClick: () => toggleFixedSize('curve', { radius: 70, angle: 45 }),
              style: {
                padding: '8px 8px',
                backgroundColor: isDark ? '#2a1420' : '#f8fafc',
                color: isDark ? '#fca5a5' : '#991b1b',
                border: `1px solid ${isDark ? '#59303a' : '#e2e8f0'}`,
                borderRadius: '0 6px 6px 0',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '12px'
              }
            }, '×')
          ])
        ] : []),

        // R100-60弯道按钮
        ...(!hiddenFixedSizes.curves.some(curve => curve.radius === 100 && curve.angle === 60) ? [
          React.createElement('div', {
            key: 'curve100-60-group',
            style: { display: 'flex', alignItems: 'center', gap: '2px' }
          }, [
            React.createElement('button', {
              key: 'curve100-60',
              onClick: () => addPiece('curve', { radius: 100, angle: 60 }),
              style: {
                padding: '8px 16px',
                backgroundColor: isDark ? '#063a31' : '#d1fae5',
                color: isDark ? '#6ee7b7' : '#047857',
                border: `1px solid ${isDark ? '#0f766e' : '#a7f3d0'}`,
                borderRadius: '6px 0 0 6px',
                cursor: 'pointer',
                userSelect: 'none'
              }
            }, 'R100-60'),
            React.createElement('button', {
              key: 'hide-curve100-60',
              onClick: () => toggleFixedSize('curve', { radius: 100, angle: 60 }),
              style: {
                padding: '8px 8px',
                backgroundColor: isDark ? '#2a1420' : '#f8fafc',
                color: isDark ? '#fca5a5' : '#991b1b',
                border: `1px solid ${isDark ? '#59303a' : '#e2e8f0'}`,
                borderRadius: '0 6px 6px 0',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '12px'
              }
            }, '×')
          ])
        ] : []),

        // 显示已保存的自定义直道 - 只在客户端渲染后显示
        ...(isClient ? savedSizes.straights.map(length => 
          React.createElement('div', {
            key: `saved-str-group-${length}`,
            style: { display: 'flex', alignItems: 'center', gap: '2px' }
          }, [
            React.createElement('button', {
              key: `saved-str-${length}`,
              onClick: () => addPiece('straight', { length }),
              style: {
                padding: '8px 16px',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '6px 0 0 6px',
                cursor: 'pointer',
                userSelect: 'none'
              }
            }, `L${length}`),
            React.createElement('button', {
              key: `remove-str-${length}`,
              onClick: () => removeSavedSize('straight', length),
              style: {
                padding: '8px 8px',
                backgroundColor: isDark ? '#2a1420' : '#f8fafc',
                color: isDark ? '#fca5a5' : '#991b1b',
                border: `1px solid ${isDark ? '#59303a' : '#e2e8f0'}`,
                borderRadius: '0 6px 6px 0',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '12px'
              }
            }, '×')
          ])
        ) : []),

        // 显示已保存的自定义弯道 - 只在客户端渲染后显示
        ...(isClient ? savedSizes.curves.map(curve => 
          React.createElement('div', {
            key: `saved-curve-group-${curve.radius}-${curve.angle}`,
            style: { display: 'flex', alignItems: 'center', gap: '2px' }
          }, [
            React.createElement('button', {
              key: `saved-curve-${curve.radius}-${curve.angle}`,
              onClick: () => addPiece('curve', curve),
              style: {
                padding: '8px 16px',
                backgroundColor: '#06b6d4',
                color: 'white',
                border: 'none',
                borderRadius: '6px 0 0 6px',
                cursor: 'pointer',
                userSelect: 'none'
              }
            }, `R${curve.radius}-${curve.angle}`),
            React.createElement('button', {
              key: `remove-curve-${curve.radius}-${curve.angle}`,
              onClick: () => removeSavedSize('curve', curve),
              style: {
                padding: '8px 8px',
                backgroundColor: isDark ? '#2a1420' : '#f8fafc',
                color: isDark ? '#fca5a5' : '#991b1b',
                border: `1px solid ${isDark ? '#59303a' : '#e2e8f0'}`,
                borderRadius: '0 6px 6px 0',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '12px'
              }
            }, '×')
          ])
        ) : []),

        React.createElement('button', {
          key: 'custom',
          onClick: () => setShowCustomDialog(true),
          style: {
            padding: '8px 16px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            userSelect: 'none'
          }
        }, '自定义'),

        // 新建项目按钮
        React.createElement('button', {
          key: 'new-project',
          onClick: newProject,
          style: {
            ...primaryButton
          }
        }, '📄 新建'),

        // 存档列表
        archives.length > 0 && React.createElement('select', {
          key: 'archive-select',
          onChange: (e: any) => {
            if (e.target.value) {
              loadArchive(e.target.value)
              e.target.value = ''
            }
          },
          style: {
            padding: '8px 12px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer'
          }
        }, [
          React.createElement('option', { key: 'default', value: '' }, '选择存档'),
          ...archives.map(name => 
            React.createElement('option', { key: name, value: name }, name)
          )
        ]),

        // 一键回中按钮
        React.createElement('button', {
          key: 'reset-view',
          onClick: resetView,
          style: {
            ...buttonBase
          }
        }, '🎯 回中'),

        // 智能赛道输入
        React.createElement('div', {
          key: 'smart-track-input',
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginLeft: '8px'
          }
        }, [
          React.createElement('span', { 
            key: 'label',
            style: { fontSize: '13px', color: ui.muted }
          }, '快速添加:'),
          React.createElement('input', {
            key: 'track-code',
            type: 'text',
            placeholder: '输入赛道代码 (如: L88, R200A90)',
            style: {
              height: 34,
              padding: '0 10px',
              border: `1px solid ${ui.borderStrong}`,
              borderRadius: 7,
              width: '200px',
              fontSize: '13px',
              backgroundColor: ui.button,
              color: ui.text,
              outline: 'none'
            },
            onKeyDown: (e: any) => {
              if (e.key === 'Enter') {
                const code = e.target.value.trim()
                if (code) {
                  addTrackFromCode(code)
                  e.target.value = ''
                }
              }
            }
          }),
          React.createElement('button', {
            key: 'add-track',
            onClick: () => {
              const input = document.querySelector('input[placeholder*="赛道代码"]') as HTMLInputElement
              if (input && input.value.trim()) {
                addTrackFromCode(input.value.trim())
                input.value = ''
              }
            },
            style: {
              ...primaryButton,
              backgroundColor: '#f59e0b',
              borderColor: '#f59e0b',
              color: '#ffffff'
            }
          }, '添加')
        ]),

        React.createElement('button', {
          key: 'load-button',
          onClick: openTrackFromJSON,
          style: {
            ...buttonBase,
            backgroundColor: isDark ? '#12304a' : '#e0f2fe',
            color: isDark ? '#bae6fd' : '#0369a1',
            borderColor: isDark ? '#1e4f76' : '#7dd3fc',
            cursor: 'pointer',
            userSelect: 'none'
          }
        }, '📁 导入JSON'),

        React.createElement('input', {
          key: 'load-input',
          id: 'file-input',
          type: 'file',
          accept: '.json',
          onChange: loadTrackFromJSON,
          style: { display: 'none' }
        }),

        React.createElement('button', {
          key: 'export-image',
          onClick: exportAsImage,
          style: {
            ...primaryButton
          }
        }, '🖼️ 导出图片'),

        React.createElement('button', {
          key: 'view-bom',
          onClick: () => setShowBomDialog(true),
          style: {
            ...buttonBase,
            backgroundColor: isDark ? '#063a31' : '#d1fae5',
            color: isDark ? '#6ee7b7' : '#047857',
            borderColor: isDark ? '#0f766e' : '#6ee7b7'
          }
        }, '📋 查看BOM'),

        React.createElement('button', {
          key: 'clear',
          onClick: () => { setPieces([]); setSelectedId(null); setSelectedIds([]) },
          style: {
            ...buttonBase,
            backgroundColor: isDark ? '#3f1218' : '#fee2e2',
            color: isDark ? '#fecaca' : '#b91c1c',
            borderColor: isDark ? '#7f1d1d' : '#fecaca'
          }
        }, '清空')
      ])

    ]),

    // 状态栏
    React.createElement('div', {
      key: 'status',
      style: {
        padding: '8px 15px',
        backgroundColor: ui.panelSoft,
        fontSize: '12px',
        color: ui.muted,
        borderBottom: `1px solid ${ui.border}`,
        display: 'none'
      }
    }, `元件: ${pieceCount} | 选中: ${selectedIds.length > 0 ? `多选(${selectedIds.length})` : selectedId ? `ID-${selectedId}` : '无'} | Ctrl+滚轮缩放 | 右键拖拽视图 | 框选多选 | Tab旋转15° | 双击输入角度`),

    // 画布区域 - 使用viewBox实现真正的视图缩放
    React.createElement('div', {
      key: 'canvas',
      style: {
        flex: 1,
        backgroundColor: ui.canvas,
        position: 'relative',
        overflow: 'hidden'
      }
    }, [
      React.createElement(TrackCanvas, {
        key: 'svg',
        svgRef,
        viewBox,
        cursor: isPanning || isDragging ? 'grabbing' : 'default',
        onMouseDown: (e) => {
          handleMouseDown(e)
          startCanvasPan(e)
        },
        onMouseMove: handleMouseMove,
        onMouseUp: () => {
          if (!isPanningRef.current) handleMouseUp()
        },
        onContextMenu: handleContextMenu
      }, [
        // 网格背景 - 更精细的网格
        React.createElement('defs', { key: 'defs' }, [
          React.createElement('pattern', {
            key: 'grid',
            id: 'grid',
            width: 10,
            height: 10,
            patternUnits: 'userSpaceOnUse'
          }, [
            React.createElement('path', {
              key: 'grid-path',
              d: 'M 10 0 L 0 0 0 10',
              fill: 'none',
              stroke: ui.canvasGrid,
              strokeWidth: 0.5,
              opacity: isDark ? 0.45 : 0.65
            })
          ]),
          // 设计边界
          React.createElement('pattern', {
            key: 'bounds',
            id: 'bounds',
            width: 100,
            height: 100,
            patternUnits: 'userSpaceOnUse'
          }, [
            React.createElement('path', {
              key: 'bounds-path',
              d: 'M 100 0 L 0 0 0 100',
              fill: 'none',
              stroke: '#fbbf24',
              strokeWidth: 1,
              opacity: 0.5
            })
          ])
        ]),
        
        React.createElement('rect', {
          key: 'background',
          x: viewBox.x - 1000,
          y: viewBox.y - 1000,
          width: viewBox.width + 2000,
          height: viewBox.height + 2000,
          fill: 'url(#grid)'
        }),

        // 设计边界显示
        React.createElement('rect', {
          key: 'design-bounds',
          x: DESIGN_BOUNDS.x,
          y: DESIGN_BOUNDS.y,
          width: DESIGN_BOUNDS.width,
          height: DESIGN_BOUNDS.height,
          fill: 'none',
          stroke: '#f59e0b',
          strokeWidth: 3,
          strokeDasharray: '10,5',
          opacity: 0.7
        }),
        
        React.createElement('text', {
          key: 'bounds-label',
          x: DESIGN_BOUNDS.x + 30,
          y: DESIGN_BOUNDS.y + 40,
          fontSize: '20px',
          fill: '#dc2626',
          fontWeight: 'bold',
          style: { 
            userSelect: 'none',
            textShadow: '1px 1px 2px rgba(255,255,255,0.8)'
          }
        }, '🏁 ASC赛道区域: 16M × 8M'),

        // 渲染赛道元件 - 支持多选高亮
        React.createElement(TrackPiecesLayer, {
          key: 'track-pieces',
          selectedId,
          selectedIds: selectedIdsSet,
          isDark,
          isMeasuring,
          isAutoFill,
          onMouseDown: handleMouseDown,
          onDoubleClick: handleDoubleClick,
          onMeasurePointClick: handleMeasurePointClick,
          onAutoFillPointClick: handleAutoFillPointClick,
        }),
        React.createElement(MeasurementOverlay, {
          key: 'measurement-overlay',
          points: measurePoints,
        }),
      React.createElement('button', {
        key: 'measure-btn',
        style: {
          position: 'absolute',
          left: 20,
          top: 20,
          zIndex: 10,
          background: isMeasuring ? '#f59e42' : '#fff',
          color: isMeasuring ? '#fff' : '#333',
          border: '1.5px solid #f59e42',
          borderRadius: 6,
          padding: '6px 16px',
          fontWeight: 600,
          fontSize: 16,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        },
        onClick: startMeasure
      }, isMeasuring ? '点击吸附点（第2个）' : '测量距离'),
        
        // 选择框显示 - 优化样式和精度
        selectionBox ? React.createElement('rect', {
          key: 'selection-box',
          x: selectionBox.x,
          y: selectionBox.y,
          width: selectionBox.width,
          height: selectionBox.height,
          fill: 'rgba(59, 130, 246, 0.08)',
          stroke: '#3b82f6',
          strokeWidth: 1.5,
          strokeDasharray: '4,2',
          rx: 2,
          ry: 2,
          pointerEvents: 'none'
        }) : null
      ].filter(Boolean)),

      pieceCount < 0 ? React.createElement('div', {
        key: 'welcome',
        style: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#6b7280',
          pointerEvents: 'none'
        }
      }, [
        React.createElement('h2', {
          key: 'title',
          style: { marginBottom: '20px', color: '#2563eb' }
        }, '🏁 ASC智能车赛道设计器'),
        React.createElement('h3', {
          key: 'subtitle',
          style: { marginBottom: '30px', color: '#6b7280', fontSize: '18px' }
        }, '📖 操作手册 | 使用指南'),
        React.createElement('div', {
          key: 'instructions',
          style: { 
            textAlign: 'left', 
            maxWidth: '500px', 
            margin: '0 auto',
            backgroundColor: 'rgba(255,255,255,0.9)',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }
        }, [
          React.createElement('h4', { 
            key: 'quick-start',
            style: { color: '#059669', marginBottom: '10px' }
          }, '🚀 快速开始'),
          React.createElement('p', { key: 'step1' }, '1. 点击上方按钮添加赛道元件'),
          React.createElement('p', { key: 'step2' }, '2. 拖拽元件进行布局设计'),
          React.createElement('p', { key: 'step3' }, '3. 利用自动吸附连接功能'),
          
          React.createElement('h4', { 
            key: 'controls',
            style: { color: '#7c3aed', marginTop: '15px', marginBottom: '10px' }
          }, '🖱️ 操作控制'),
          React.createElement('p', { key: 'ctrl1' }, '• Ctrl+滚轮：缩放视图'),
          React.createElement('p', { key: 'ctrl2' }, '• 右键拖拽：移动画布'),
          React.createElement('p', { key: 'ctrl3' }, '• Tab键：旋转选中元件'),
          React.createElement('p', { key: 'ctrl4' }, '• Delete键：删除选中元件'),
          React.createElement('p', { key: 'ctrl5' }, '• Ctrl+F：适应屏幕视图'),
          React.createElement('p', { key: 'ctrl6' }, '• Ctrl+G：聚焦到赛道'),
          React.createElement('p', { key: 'ctrl7' }, '• Home键：回到初始视图'),
          
          React.createElement('h4', { 
            key: 'features',
            style: { color: '#dc2626', marginTop: '15px', marginBottom: '10px' }
          }, '✨ 智能特性'),
          React.createElement('p', { key: 'feat1' }, '• 45cm标准赛道宽度'),
          React.createElement('p', { key: 'feat2' }, '• 自动吸附连接功能'),
          React.createElement('p', { key: 'feat3' }, '• 快捷代码输入(L88, R200A90)'),
          React.createElement('p', { key: 'feat4' }, '• 16M×8M标准竞赛场地')
        ])
      ]) : null,

      // 旋转角度输入对话框
      isRotating ? React.createElement('div', {
        key: 'rotation-dialog',
        style: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          border: '2px solid #3b82f6',
          zIndex: 1000
        }
      }, [
        React.createElement('h3', {
          key: 'title',
          style: { margin: '0 0 15px 0', color: '#2563eb' }
        }, '设置旋转角度'),
        
        React.createElement('div', {
          key: 'input-group',
          style: { marginBottom: '15px' }
        }, [
          React.createElement('label', {
            key: 'label',
            style: { display: 'block', marginBottom: '5px', fontSize: '14px' }
          }, '角度 (°):'),
          React.createElement('input', {
            key: 'input',
            type: 'number',
            value: rotationInput,
            onChange: (e: any) => setRotationInput(e.target.value),
            onKeyDown: (e: any) => {
              if (e.key === 'Enter') confirmRotation()
              if (e.key === 'Escape') { setIsRotating(false); setRotationInput('') }
            },
            style: {
              width: '100px',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            },
            autoFocus: true
          })
        ]),
        
        React.createElement('div', {
          key: 'buttons',
          style: { display: 'flex', gap: '10px', justifyContent: 'flex-end' }
        }, [
          React.createElement('button', {
            key: 'cancel',
            onClick: () => { setIsRotating(false); setRotationInput('') },
            style: {
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }
          }, '取消'),
          React.createElement('button', {
            key: 'confirm',
            onClick: confirmRotation,
            style: {
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }
          }, '确定')
        ])
      ]) : null,

      // 存档对话框
      showArchiveDialog ? React.createElement('div', {
        key: 'archive-dialog',
        style: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          border: '1px solid #e5e7eb'
        }
      }, [
        React.createElement('h3', { 
          key: 'title',
          style: { margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }
        }, '保存存档'),
        React.createElement('div', { 
          key: 'content',
          style: { marginBottom: '16px' }
        }, [
          React.createElement('label', {
            key: 'label',
            style: { display: 'block', marginBottom: '8px', fontWeight: '500' }
          }, '存档名称:'),
          React.createElement('input', {
            key: 'name-input',
            type: 'text',
            value: archiveName,
            onChange: (e: any) => setArchiveName(e.target.value),
            placeholder: '输入存档名称',
            style: {
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            },
            onKeyDown: (e: any) => {
              if (e.key === 'Enter') {
                confirmSaveArchive()
              }
            }
          })
        ]),
        React.createElement('div', {
          key: 'buttons',
          style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' }
        }, [
          React.createElement('button', {
            key: 'cancel',
            onClick: () => {
              setShowArchiveDialog(false)
              setArchiveName('')
            },
            style: {
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }
          }, '取消'),
          React.createElement('button', {
            key: 'confirm',
            onClick: confirmSaveArchive,
            style: {
              padding: '8px 16px',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }
          }, '保存')
        ])
      ]) : null,

      // BOM统计对话框
      showBomDialog ? (() => {
        const stats = calculateTrackStats()
        const bomEntries = Object.entries(stats.bom).sort((a, b) => (b[1] as number) - (a[1] as number)) // 按数量排序
        
        return React.createElement('div', {
          key: 'bom-dialog',
          style: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '480px',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            border: '1px solid #e5e7eb'
          }
        }, [
          React.createElement('h3', { 
            key: 'bom-title',
            style: { 
              margin: '0 0 20px 0', 
              color: '#1f2937', 
              fontSize: '20px', 
              fontWeight: 'bold',
              textAlign: 'center',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '10px'
            }
          }, '📋 BOM物料清单'),
          
          React.createElement('div', {
            key: 'summary',
            style: {
              backgroundColor: '#1f2937',
              color: 'white',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }
          }, [
            React.createElement('div', { 
              key: 'total-pieces', 
              style: { fontSize: '16px', marginBottom: '8px' } 
            }, `总元件数量: ${stats.totalPieces} 个`),
            React.createElement('div', { 
              key: 'total-length', 
              style: { fontSize: '18px', fontWeight: 'bold', color: '#fbbf24' } 
            }, `赛道总长度: ${stats.totalLength} 米`)
          ]),
          
          React.createElement('h4', { 
            key: 'bom-list-title',
            style: { margin: '20px 0 15px 0', color: '#1f2937', fontSize: '16px', fontWeight: 'bold' }
          }, '🏆 赛道元件统计'),
          
          React.createElement('div', {
            key: 'bom-list',
            style: { marginBottom: '25px' }
          }, bomEntries.map(([type, count], index) => 
            React.createElement('div', {
              key: type,
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: index % 2 === 0 ? '#1f2937' : '#374151',
                color: 'white',
                borderRadius: '6px',
                marginBottom: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }
            }, [
              React.createElement('span', { 
                key: 'type', 
                style: { 
                  fontFamily: 'monospace', 
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#fbbf24'
                } 
              }, type),
              React.createElement('span', { 
                key: 'count', 
                style: { 
                  fontWeight: 'bold', 
                  fontSize: '16px',
                  color: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  padding: '4px 8px',
                  borderRadius: '4px'
                } 
              }, `${count} 个`)
            ])
          )),
          
          React.createElement('div', {
            key: 'bom-buttons',
            style: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }
          }, [
            React.createElement('button', {
              key: 'export-bom',
              onClick: exportTrackInfo,
              style: {
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.2s'
              },
              onMouseOver: (e) => e.target.style.backgroundColor = '#2563eb',
              onMouseOut: (e) => e.target.style.backgroundColor = '#3b82f6'
            }, '📁 导出JSON'),
            
            React.createElement('button', {
              key: 'close-bom',
              onClick: () => setShowBomDialog(false),
              style: {
                padding: '10px 20px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(107, 114, 128, 0.3)',
                transition: 'all 0.2s'
              },
              onMouseOver: (e) => e.target.style.backgroundColor = '#4b5563',
              onMouseOut: (e) => e.target.style.backgroundColor = '#6b7280'
            }, '✖️ 关闭')
          ])
        ])
      })() : null,

      // 自定义赛道对话框
      showCustomDialog ? React.createElement('div', {
        key: 'custom-dialog',
        style: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 1000,
          minWidth: '300px'
        }
      }, [
        React.createElement('h3', {
          key: 'title',
          style: { margin: '0 0 15px 0', color: '#2563eb' }
        }, '自定义赛道'),
        
        React.createElement('div', {
          key: 'type-group',
          style: { marginBottom: '15px' }
        }, [
          React.createElement('label', {
            key: 'type-label',
            style: { display: 'block', marginBottom: '5px', fontSize: '14px' }
          }, '类型:'),
          React.createElement('select', {
            key: 'type-select',
            value: customType,
            onChange: (e: any) => setCustomType(e.target.value),
            style: {
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }
          }, [
            React.createElement('option', { key: 'straight', value: 'straight' }, '直道 (L)'),
            React.createElement('option', { key: 'curve', value: 'curve' }, '弯道 (R)')
          ])
        ]),
        
        customType === 'straight' ? React.createElement('div', {
          key: 'length-group',
          style: { marginBottom: '15px' }
        }, [
          React.createElement('label', {
            key: 'length-label',
            style: { display: 'block', marginBottom: '5px', fontSize: '14px' }
          }, '长度 (cm):'),
          React.createElement('input', {
            key: 'length-input',
            type: 'number',
            value: customLength,
            onChange: (e: any) => setCustomLength(e.target.value),
            placeholder: '例如: 25, 37.5, 50',
            style: {
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }
          })
        ]) : React.createElement('div', { key: 'curve-inputs' }, [
          React.createElement('div', {
            key: 'radius-group',
            style: { marginBottom: '15px' }
          }, [
            React.createElement('label', {
              key: 'radius-label',
              style: { display: 'block', marginBottom: '5px', fontSize: '14px' }
            }, '半径 (cm):'),
            React.createElement('input', {
              key: 'radius-input',
              type: 'number',
              value: customRadius,
              onChange: (e: any) => setCustomRadius(e.target.value),
              placeholder: '例如: 50, 70, 100',
              style: {
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }
            })
          ]),
          React.createElement('div', {
            key: 'angle-group',
            style: { marginBottom: '15px' }
          }, [
            React.createElement('label', {
              key: 'angle-label',
              style: { display: 'block', marginBottom: '5px', fontSize: '14px' }
            }, '角度 (°):'),
            React.createElement('input', {
              key: 'angle-input',
              type: 'number',
              value: customAngle,
              onChange: (e: any) => setCustomAngle(e.target.value),
              placeholder: '例如: 30, 45, 90',
              style: {
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }
            })
          ])
        ]),
        
        React.createElement('div', {
          key: 'buttons',
          style: { display: 'flex', gap: '10px', justifyContent: 'flex-end' }
        }, [
          React.createElement('button', {
            key: 'cancel',
            onClick: () => setShowCustomDialog(false),
            style: {
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }
          }, '取消'),
          React.createElement('button', {
            key: 'confirm',
            onClick: addCustomPiece,
            style: {
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }
          }, '添加')
        ])
      ]) : null,
      
      // 状态栏
      React.createElement('div', {
        key: 'status-bar',
        style: {
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          height: '32px',
          backgroundColor: ui.statusBg,
          borderTop: `1px solid ${ui.borderStrong}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '12px',
          paddingRight: '12px',
          fontSize: '12px',
          color: ui.statusText,
          zIndex: 1000
        }
      }, [
        // 左侧：项目信息和实验室口号
        React.createElement('div', {
          key: 'left-info',
          style: { display: 'flex', alignItems: 'center', gap: '20px' }
        }, [
          React.createElement('span', { key: 'project-info' }, 
            `项目: ${currentArchiveName} | 元件数: ${pieceCount}`
          ),
          React.createElement('span', { 
            key: 'motto',
            style: { 
              color: '#fbbf24', 
              fontWeight: 'bold',
              fontSize: '13px'
            }
          }, '热爱技术 甘于奉献'),
          statusMessage && React.createElement('span', { 
            key: 'status',
            style: { color: '#10b981' }
          }, ` | ${statusMessage}`)
        ]),
        
        // 右侧：快捷键提示
        React.createElement('span', { 
          key: 'shortcuts',
          style: { 
            fontSize: '11px', 
            color: ui.statusText,
            fontFamily: 'monospace',
            display: 'none'
          }
        }, 'Ctrl+S:存档 | Ctrl+O:导入 | Ctrl+E:导出 | Tab:旋转 | Del:删除 | 右键:拖拽')
      ]),
      
      // 角落快捷键提示卡片
      React.createElement('div', {
        key: 'shortcut-card',
        style: {
          position: 'fixed',
          top: '80px',
          right: '20px',
          backgroundColor: 'rgba(31, 41, 55, 0.95)',
          color: '#f9fafb',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '11px',
          fontFamily: 'monospace',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 500,
          maxWidth: '200px',
          backdropFilter: 'blur(4px)',
          display: 'none'
        }
      }, [
        React.createElement('div', {
          key: 'shortcut-title',
          style: { 
            fontWeight: 'bold', 
            marginBottom: '8px',
            color: '#fbbf24',
            textAlign: 'center'
          }
        }, '🔥 快捷键'),
        React.createElement('div', { key: 'shortcuts-list' }, [
          '🖥️ 适应屏幕: Ctrl + F',
          '🎯 聚焦赛道: Ctrl + G', 
          '🏠 回到初始: Home键',
          '🖱️ 缩放: Ctrl + 滚轮',
          '🖱️ 拖拽: 右键拖拽画布',
          '⌨️ 旋转: Tab键(15°)',
          '⌨️ 删除: Delete键',
          '💾 存档: Ctrl + S',
          '📁 导入: Ctrl + O',
          '🖼️ 导出: Ctrl + E'
        ].map((text, index) => 
          React.createElement('div', { 
            key: index,
            style: { marginBottom: '2px' }
          }, text)
        ))
      ])
    ])
  ])
}

// 解析赛道代码，如 L88、R200A90
