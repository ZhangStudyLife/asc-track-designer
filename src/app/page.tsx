'use client'

import React from 'react'

// SolidWorks风格赛道设计器 - 增强版
export default function Home() {
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

  // 缩略图渲染函数

  function renderMiniMap(props?: {
    onMiniMouseDown?: (e: React.MouseEvent) => void;
    onMiniMouseMove?: (e: React.MouseEvent) => void;
    onMiniMouseUp?: (e: React.MouseEvent) => void;
  }) {
    // 视口框位置和尺寸直接用Home作用域变量（已声明）
  const rectX = (viewBox.x - designX) * scaleX;
  const rectY = (viewBox.y - designY) * scaleY;
  const rectW = viewBox.width * scaleX;
  const rectH = viewBox.height * scaleY;
    // 事件绑定：SVG级别
        return (
          <svg
            width={miniWidth}
            height={miniHeight}
            viewBox={`0 0 ${miniWidth} ${miniHeight}`}
            style={{ background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, cursor: draggingMini ? 'grabbing' : 'pointer' }}
            onMouseMove={props?.onMiniMouseMove}
            onMouseUp={props?.onMiniMouseUp}
            onMouseLeave={props?.onMiniMouseUp}
            onMouseDown={props?.onMiniMouseDown}
          >
            {/* 赛道渲染，需将赛道坐标映射到缩略图坐标 */}
            {pieces.map((piece) => {
              if (piece.type === 'straight') {
                const x1 = (piece.x - designX) * scaleX;
                const y1 = (piece.y - designY) * scaleY;
                const x2 = (piece.x + piece.params.length * Math.cos((piece.rotation || 0) * Math.PI / 180) - designX) * scaleX;
                const y2 = (piece.y + piece.params.length * Math.sin((piece.rotation || 0) * Math.PI / 180) - designY) * scaleY;
                return <line key={piece.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6366f1" strokeWidth={4} strokeLinecap="round" />;
              } else if (piece.type === 'curve') {
                const r = piece.params.radius * 2;
                const angle = piece.params.angle;
                const rot = (piece.rotation || 0) * Math.PI / 180;
                const cx = (piece.x - designX) * scaleX;
                const cy = (piece.y - designY) * scaleY;
                const startAngle = rot;
                const endAngle = rot + angle * Math.PI / 180;
                const x1 = cx + r * Math.cos(startAngle) * scaleX;
                const y1 = cy + r * Math.sin(startAngle) * scaleY;
                const x2 = cx + r * Math.cos(endAngle) * scaleX;
                const y2 = cy + r * Math.sin(endAngle) * scaleY;
                const largeArc = angle > 180 ? 1 : 0;
                const d = `M${x1},${y1} A${r*scaleX},${r*scaleY} 0 ${largeArc} 1 ${x2},${y2}`;
                return <path key={piece.id} d={d} stroke="#f59e42" strokeWidth={4} fill="none" />;
              }
              return null;
            })}
            {/* 当前视口区域框，可拖拽 */}
            <rect
              x={rectX}
              y={rectY}
              width={rectW}
              height={rectH}
              fill="none"
              stroke="#ef4444"
              strokeWidth={2.5}
              strokeDasharray="6,3"
              rx={3}
              style={{ cursor: 'grab', pointerEvents: 'all' }}
            />
          </svg>
        );
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
    let newRectX = mouseX - miniDragOffset.current.x;
    let newRectY = mouseY - miniDragOffset.current.y;
    const rectW = viewBox.width * scaleX;
    const rectH = viewBox.height * scaleY;
    newRectX = Math.max(0, Math.min(miniWidth - rectW, newRectX));
    newRectY = Math.max(0, Math.min(miniHeight - rectH, newRectY));
    const newViewBoxX = designX + newRectX / scaleX;
    const newViewBoxY = designY + newRectY / scaleY;
    setViewBox({ ...viewBox, x: newViewBoxX, y: newViewBoxY });
  };
  const handleMiniMouseUp = () => {
    setDraggingMini(false);
  };
  }
  const [pieces, setPieces] = React.useState<any[]>([])
  const [viewBox, setViewBox] = React.useState({ 
    x: -2000, // 扩大视图范围，确保16M×8M区域完全可见
    y: -1000,  
    width: 4000, // 20M宽度（16M+4M边距）
    height: 2000 // 10M高度（8M+2M边距）
  })
  const [scale, setScale] = React.useState(1.0)
  // 缩放比例上下限
  const MIN_SCALE = 0.18
  const MAX_SCALE = 2.5
  // 设计画布边界（与resetView一致）
  const CANVAS_BOUNDS = { x: -2000, y: -1000, width: 4000, height: 2000 }
  const [selectedId, setSelectedId] = React.useState<number | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]) // 多选
  const [isSelecting, setIsSelecting] = React.useState(false) // 框选状态
  const [selectionStart, setSelectionStart] = React.useState<{x: number, y: number} | null>(null)
  const [selectionBox, setSelectionBox] = React.useState<{x: number, y: number, width: number, height: number} | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
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
  const [statusMessage, setStatusMessage] = React.useState('')
  const [currentArchiveName, setCurrentArchiveName] = React.useState('未命名项目')
  const [archives, setArchives] = React.useState<string[]>([])
  const [showArchiveDialog, setShowArchiveDialog] = React.useState(false)
  const [archiveName, setArchiveName] = React.useState('')
  const [isRightDragging, setIsRightDragging] = React.useState(false)
  const [rightDragStart, setRightDragStart] = React.useState({ x: 0, y: 0 })
  const svgRef = React.useRef<SVGSVGElement>(null)
  
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
  }, [])

  // 自动保存功能
  React.useEffect(() => {
    if (isClient && pieces.length > 0) {
      const autoSave = () => {
        const projectData = {
          name: currentArchiveName,
          pieces,
          viewBox,
          timestamp: new Date().toISOString()
        }
        localStorage.setItem('currentTrackProject', JSON.stringify(projectData))
        setStatusMessage('自动保存完成')
        setTimeout(() => setStatusMessage(''), 2000)
      }
      
      const timer = setTimeout(autoSave, 5000) // 5秒后自动保存
      return () => clearTimeout(timer)
    }
  }, [pieces, viewBox, currentArchiveName, isClient])

  // 右键拖拽画布功能
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) { // 右键
      e.preventDefault()
      setIsRightDragging(true)
      setRightDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isRightDragging) {
      e.preventDefault()
      const deltaX = e.clientX - rightDragStart.x
      const deltaY = e.clientY - rightDragStart.y
      
      // 优化移动比例，提高拖拽灵敏度
      const moveScale = viewBox.width / (svgRef.current?.clientWidth || 800) * 0.8
      
      setViewBox(prev => ({
        ...prev,
        x: prev.x - deltaX * moveScale,
        y: prev.y - deltaY * moveScale
      }))
      
      setRightDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (e.button === 2) { // 右键
      setIsRightDragging(false)
    }
  }

  // 禁用右键菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  // 存档管理
  const saveAsArchive = () => {
    if (pieces.length === 0) {
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
      pieces,
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
    setStatusMessage(`存档"${archiveName}"保存成功`)
    setTimeout(() => setStatusMessage(''), 3000)
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
        setStatusMessage(`已加载存档"${name}"`)
        setTimeout(() => setStatusMessage(''), 3000)
      }
    } catch (error) {
      alert('加载存档失败')
    }
  }

  const newProject = () => {
    if (pieces.length > 0) {
      if (!confirm('当前项目尚未保存，确定要新建项目吗？')) {
        return
      }
    }
    // ...existing code...
    const commonCurves = {
      'R180': { radius: 200, angle: 180 }
    };
    
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
    
    setPieces(prev => [...prev, newPiece])
    setSelectedId(newPiece.id)
    setStatusMessage(`已添加赛道: ${code}`)
    setTimeout(() => setStatusMessage(''), 3000)
  }

  // 一键回中功能 - 使用与初始状态相同的视角
  const resetView = () => {
    setViewBox({ 
      x: -2000, 
      y: -1000, 
      width: 4000, 
      height: 2000 
    })
    setStatusMessage('视图已重置到默认位置')
    setTimeout(() => setStatusMessage(''), 2000)
  }
  
  // 设计范围：16M × 8M (转换为像素：1cm = 2px, 所以 16m = 3200px, 8m = 1600px)
  const DESIGN_BOUNDS = { width: 3200, height: 1600, x: -1600, y: -800 }
  const SNAP_DISTANCE = 30 // 吸附距离

  const addPiece = (type: string, params: any) => {
    setPieces(prev => [...prev, {
      id: Date.now(),
      type,
      x: viewBox.x + viewBox.width / 2 + (Math.random() - 0.5) * 100,
      y: viewBox.y + viewBox.height / 2 + (Math.random() - 0.5) * 100,
      rotation: 0, // 添加旋转角度
      params
    }])
  }

  // 保存赛道为JSON文件
  const exportTrackAsJSON = () => {
    if (pieces.length === 0) {
      alert('没有赛道可导出')
      return
    }
    
    const trackData = {
      version: '1.0',
      created: new Date().toISOString(),
      bounds: DESIGN_BOUNDS,
      pieces: pieces
    }
    const blob = new Blob([JSON.stringify(trackData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `track_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    setStatusMessage(`赛道数据已导出为JSON文件`)
    setTimeout(() => setStatusMessage(''), 3000)
  }

  // 加载JSON文件 - 增强兼容性
  const loadTrackFromJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const trackData = JSON.parse(e.target?.result as string)
        
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
    reader.readAsText(file)
    
    // 清空input以允许重新选择同一文件
    event.target.value = ''
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
      canvas.toBlob((blob) => {
        if (blob) {
          const link = document.createElement('a')
          link.download = `track_design_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.png`
          link.href = URL.createObjectURL(blob)
          link.click()
          URL.revokeObjectURL(link.href)
        }
      }, 'image/png', 1.0)
    }
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  // BOM统计和赛道长度计算
  const calculateTrackStats = () => {
    // 统计各种赛道数量
    const bomStats = {}
    let totalLength = 0

    pieces.forEach(piece => {
      let pieceKey = ''
      let pieceLength = 0

      if (piece.type === 'straight') {
        pieceKey = `L${piece.params.length}`
        pieceLength = piece.params.length // 直道长度就是参数值(cm)
      } else if (piece.type === 'curve') {
        pieceKey = `R${piece.params.radius}-${piece.params.angle}`
        // 弯道长度 = 半径 × 角度(弧度) = 半径 × (角度° × π / 180)
        const radiusInCm = piece.params.radius
        const angleInRadians = (piece.params.angle * Math.PI) / 180
        pieceLength = radiusInCm * angleInRadians
      }

      // 统计数量
      bomStats[pieceKey] = (bomStats[pieceKey] || 0) + 1
      totalLength += pieceLength
    })

    // 转换为米并保留2位小数
    const totalLengthInMeters = (totalLength / 100).toFixed(2)

    return {
      bom: bomStats,
      totalLength: totalLengthInMeters,
      totalPieces: pieces.length
    }
  }

  // 显示BOM对话框状态
  const [showBomDialog, setShowBomDialog] = React.useState(false)

  // 导出赛道尺寸信息
  // 导出赛道尺寸信息
  const exportTrackInfo = () => {
    const stats = calculateTrackStats()
    
    const trackInfo = pieces.map(piece => {
      if (piece.type === 'straight') {
        return `L${piece.params.length}`
      } else if (piece.type === 'curve') {
        return `R${piece.params.radius}-${piece.params.angle}`
      }
      return ''
    }).filter(Boolean)
    
    const info = {
      totalPieces: pieces.length,
      totalLength: `${stats.totalLength}米`,
      pieces: trackInfo,
      bom: stats.bom,
      details: pieces.map(p => ({
        type: p.type,
        params: p.params,
        position: { x: p.x, y: p.y },
        rotation: p.rotation
      }))
    }
    
    const blob = new Blob([JSON.stringify(info, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `track_info_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.json`
    a.click()
    URL.revokeObjectURL(url)
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
  const getMouseSVGCoords = (e: React.MouseEvent) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    
    const rect = svg.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // 精确的坐标转换
    const svgX = (mouseX / rect.width) * viewBox.width + viewBox.x
    const svgY = (mouseY / rect.height) * viewBox.height + viewBox.y
    
    return { x: svgX, y: svgY }
  }

  // 平滑缩放 - 限制最大视图为16M×8M，最小200×100，增强流畅性
  const handleZoom = (delta: number, centerX?: number, centerY?: number) => {
    const zoomFactor = delta > 0 ? 1.15 : 0.85 // 优化缩放步长，更流畅
    // 计算缩放后的宽高
    const newWidth = Math.max(150, Math.min(8000, viewBox.width * zoomFactor))
    const newHeight = Math.max(75, Math.min(4000, viewBox.height * zoomFactor))
    // 计算缩放后的 scale
    const newScale = 1000 / newWidth
    // 限制 scale 在上下限范围内
    if (newScale < MIN_SCALE || newScale > MAX_SCALE) {
      return // 超出缩放范围则不缩放
    }
  // 以指定点为中心缩放
  const centerViewX = centerX !== undefined ? centerX : viewBox.x + viewBox.width / 2
  const centerViewY = centerY !== undefined ? centerY : viewBox.y + viewBox.height / 2
  let newX = centerViewX - newWidth / 2
  let newY = centerViewY - newHeight / 2

  // 边界限制：缩放后画布不能超出设计区域
  // 限制左上角
  if (newX < CANVAS_BOUNDS.x) newX = CANVAS_BOUNDS.x
  if (newY < CANVAS_BOUNDS.y) newY = CANVAS_BOUNDS.y
  // 限制右下角
  if (newX + newWidth > CANVAS_BOUNDS.x + CANVAS_BOUNDS.width) newX = CANVAS_BOUNDS.x + CANVAS_BOUNDS.width - newWidth
  if (newY + newHeight > CANVAS_BOUNDS.y + CANVAS_BOUNDS.height) newY = CANVAS_BOUNDS.y + CANVAS_BOUNDS.height - newHeight

  setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight })
  setScale(newScale)
  }

  // 滚轮缩放
  React.useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        const svg = svgRef.current
        if (svg) {
          const rect = svg.getBoundingClientRect()
          const mouseX = e.clientX - rect.left
          const mouseY = e.clientY - rect.top
          
          // 转换到SVG坐标
          const svgX = (mouseX / rect.width) * viewBox.width + viewBox.x
          const svgY = (mouseY / rect.height) * viewBox.height + viewBox.y
          
          // 优化缩放响应，更灵敏的滚轮控制
          const zoomDelta = e.deltaY > 0 ? -1 : 1
          handleZoom(zoomDelta, svgX, svgY)
        }
      }
    }

    const svg = svgRef.current
    if (svg) {
      svg.addEventListener('wheel', handleWheel, { passive: false })
      return () => svg.removeEventListener('wheel', handleWheel)
    }
  }, [viewBox])

  // 键盘控制：Tab键旋转，Delete键删除，ESC取消旋转，Ctrl+A全选，快捷键操作
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S 保存
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        saveAsArchive()
        return
      }
      
      // Ctrl+O 打开
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault()
        document.getElementById('file-input')?.click()
        return
      }
      
      // Ctrl+E 导出图片
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault()
        exportAsImage()
        return
      }
      
      if (e.key === 'Tab' && (selectedId !== null || selectedIds.length > 0)) {
        e.preventDefault()
        // Tab键：旋转选中的赛道
        const idsToRotate = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : [])
        setPieces(prev => prev.map(p => 
          idsToRotate.includes(p.id)
            ? { ...p, rotation: (p.rotation - 15) % 360 }
            : p
        ))
      } else if (e.key === 'Delete') {
        // Delete键：删除选中元件
        const idsToDelete = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : [])
        setPieces(prev => prev.filter(p => !idsToDelete.includes(p.id)))
        setSelectedId(null)
        setSelectedIds([])
      } else if (e.key === 'Escape') {
        // ESC键：取消选择和旋转输入
        setIsRotating(false)
        setRotationInput('')
        setSelectedId(null)
        setSelectedIds([])
        setIsSelecting(false)
        setSelectionBox(null)
      } else if (e.key === 'a' && e.ctrlKey) {
        // Ctrl+A：全选
        e.preventDefault()
        setSelectedIds(pieces.map(p => p.id))
        setSelectedId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, selectedIds, pieces])

  // 框选检测
  const isInSelectionBox = (piece: any, box: {x: number, y: number, width: number, height: number}) => {
    return piece.x >= box.x && 
           piece.x <= box.x + box.width && 
           piece.y >= box.y && 
           piece.y <= box.y + box.height
  }

  // 双击旋转功能
  const handleDoubleClick = (piece: any) => {
    if (selectedIds.length > 0) {
      // 多选状态下双击
      setIsRotating(true)
      setRotationInput('')
    } else {
      // 单选状态
      setSelectedId(piece.id)
      setIsRotating(true)
      setRotationInput(piece.rotation.toString())
    }
  }

  // 计算连接点位置
  const getConnectionPoints = (piece: any) => {
    if (piece.type === 'straight') {
      const length = piece.params.length * 2
      const rad = (piece.rotation || 0) * Math.PI / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      
      return [
        { x: piece.x, y: piece.y, angle: piece.rotation || 0 }, // 起点
        { x: piece.x + length * cos, y: piece.y + length * sin, angle: (piece.rotation || 0) + 180 } // 终点
      ]
    } else if (piece.type === 'curve') {
      // R50-90意味着：赛道中心线到圆心距离50cm，圆心角90°
      const centerRadius = piece.params.radius * 2 // 赛道中心线半径
      const angleRad = (piece.params.angle * Math.PI) / 180
      const rotRad = (piece.rotation || 0) * Math.PI / 180
      
      // 起点：在赛道中心线上（旋转后）
      const startX = piece.x + centerRadius * Math.cos(rotRad)
      const startY = piece.y + centerRadius * Math.sin(rotRad)
      
      // 终点：在赛道中心线上（旋转后）
      const endAngle = angleRad + rotRad
      const endX = piece.x + centerRadius * Math.cos(endAngle)
      const endY = piece.y + centerRadius * Math.sin(endAngle)
      
      return [
        { x: startX, y: startY, angle: (piece.rotation || 0) - 90 }, // 起点，垂直于半径
        { x: endX, y: endY, angle: (piece.rotation || 0) + piece.params.angle - 90 } // 终点
      ]
    }
    return []
  }

  // 寻找最近的连接点 - 简化：只检查距离，不检查角度
  const findNearestConnectionPoint = (draggedPiece: any, newX: number, newY: number) => {
    const draggedPoints = getConnectionPoints({ ...draggedPiece, x: newX, y: newY })
    let bestSnap: {
      targetX: number;
      targetY: number;
      distance: number;
      draggedPoint: { x: any; y: any; angle: any };
      otherPoint: { x: any; y: any; angle: any };
    } | null = null
    let minDistance = SNAP_DISTANCE

    for (const otherPiece of pieces) {
      if (otherPiece.id === draggedPiece.id) continue
      
      const otherPoints = getConnectionPoints(otherPiece)
      
      for (const draggedPoint of draggedPoints) {
        for (const otherPoint of otherPoints) {
          const dx = draggedPoint.x - otherPoint.x
          const dy = draggedPoint.y - otherPoint.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < minDistance) {
            // 简化：只要距离近就可以连接，不检查角度
            minDistance = distance
            bestSnap = {
              targetX: otherPoint.x - (draggedPoint.x - newX),
              targetY: otherPoint.y - (draggedPoint.y - newY),
              distance,
              draggedPoint,
              otherPoint
            }
          }
        }
      }
    }
    
    return bestSnap
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
    if (piece) {
      e.stopPropagation()
      
      if (e.ctrlKey) {
        // Ctrl+点击：多选
        if (selectedIds.includes(piece.id)) {
          setSelectedIds(prev => prev.filter(id => id !== piece.id))
        } else {
          setSelectedIds(prev => [...prev, piece.id])
        }
        setSelectedId(null)
      } else if (selectedIds.includes(piece.id)) {
        // 点击已选中的多选项：开始拖拽多选
        setIsDragging(true)
        const coords = getMouseSVGCoords(e)
        setDragOffset({ x: coords.x - piece.x, y: coords.y - piece.y })
      } else {
        // 单选
        setSelectedId(piece.id)
        setSelectedIds([])
        setIsDragging(true)
        
        const coords = getMouseSVGCoords(e)
        setDragOffset({ x: coords.x - piece.x, y: coords.y - piece.y })
      }
    } else {
      // 空白区域点击：开始框选
      const coords = getMouseSVGCoords(e)
      
      if (!e.ctrlKey) {
        setSelectedId(null)
        setSelectedIds([])
      }
      setIsRotating(false)
      setIsSelecting(true)
      setSelectionStart({ x: coords.x, y: coords.y })
      setSelectionBox({ x: coords.x, y: coords.y, width: 0, height: 0 })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isSelecting && selectionStart) {
      // 框选模式 - 使用统一的坐标转换
      const coords = getMouseSVGCoords(e)
      
      // 确保选择框精确跟随鼠标
      const newBox = {
        x: Math.min(selectionStart.x, coords.x),
        y: Math.min(selectionStart.y, coords.y),
        width: Math.abs(coords.x - selectionStart.x),
        height: Math.abs(coords.y - selectionStart.y)
      }
      setSelectionBox(newBox)
    } else if (isDragging && (selectedId !== null || selectedIds.length > 0)) {
      // 拖拽模式 - 使用统一的坐标转换
      const coords = getMouseSVGCoords(e)
      
      let newX = coords.x - dragOffset.x
      let newY = coords.y - dragOffset.y
      
      // 边界限制
      newX = Math.max(DESIGN_BOUNDS.x, Math.min(DESIGN_BOUNDS.x + DESIGN_BOUNDS.width, newX))
      newY = Math.max(DESIGN_BOUNDS.y, Math.min(DESIGN_BOUNDS.y + DESIGN_BOUNDS.height, newY))
        
        // 确定要移动的赛道
        const idsToMove = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : [])
        
        if (idsToMove.length === 1) {
          // 单个赛道：检查连接点吸附
          const draggedPiece = pieces.find(p => p.id === idsToMove[0])
          if (draggedPiece) {
            const snapPoint = findNearestConnectionPoint(draggedPiece, newX, newY)
            if (snapPoint) {
              newX = snapPoint.targetX
              newY = snapPoint.targetY
            }
          }
        }
        
        // 多选或单选移动
        if (selectedIds.length > 0) {
          // 多选移动：计算偏移量
          const referencePiece = pieces.find(p => selectedIds.includes(p.id))
          if (referencePiece) {
            const deltaX = newX - referencePiece.x
            const deltaY = newY - referencePiece.y
            setPieces(prev => prev.map(p => 
              selectedIds.includes(p.id)
                ? { ...p, x: p.x + deltaX, y: p.y + deltaY }
                : p
            ))
          }
        } else if (selectedId !== null) {
          // 单选移动
          setPieces(prev => prev.map(p => 
            p.id === selectedId 
              ? { ...p, x: newX, y: newY }
              : p
          ))
        }
    }
  }

  const handleMouseUp = () => {
    if (isSelecting && selectionBox) {
      // 完成框选
      const selectedInBox = pieces.filter(piece => isInSelectionBox(piece, selectionBox))
      setSelectedIds(prev => {
        const newIds = selectedInBox.map(p => p.id)
        return [...new Set([...prev, ...newIds])] // 避免重复
      })
      setIsSelecting(false)
      setSelectionBox(null)
      setSelectionStart(null)
    }
    setIsDragging(false)
  }

  return React.createElement('div', {
    style: { 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif',
      position: 'relative'
    }
  }, [
    // 工具栏
    React.createElement('div', {
      key: 'toolbar',
      style: {
        padding: '16px 20px',
        borderBottom: '2px solid #e5e7eb',
        backgroundColor: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
            width: '48px',
            height: '48px',
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
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1f2937',
              fontFamily: 'Microsoft YaHei, sans-serif'
            }
          }, 'ASC智能车赛道设计器'),
          React.createElement('span', {
            key: 'subtitle',
            style: {
              fontSize: '12px',
              color: '#6b7280',
              fontStyle: 'italic'
            }
          }, '实验室内部专用工具')
        ])
      ]),
    // 右下角悬浮缩略图
    React.createElement('div', {
      key: 'mini-map',
      style: {
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 1000,
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        padding: 8,
        border: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 190,
        minHeight: 100
      }
    }, [
      renderMiniMap({
        onMiniMouseDown: handleMiniMouseDown,
        onMiniMouseMove: handleMiniMouseMove,
        onMiniMouseUp: handleMiniMouseUp,
      })
    ]),
      
      React.createElement('h1', {
        key: 'old-title',
        style: { display: 'none' } // 隐藏原标题
      }, '🏁 SolidWorks风格智能车赛道设计器'),

      React.createElement('div', {
        key: 'controls',
        style: { display: 'flex', gap: '10px', flexWrap: 'wrap' }
      }, [
        // L25直道按钮
        ...(!hiddenFixedSizes.straights.includes(25) ? [
          React.createElement('div', {
            key: 'str25-group',
            style: { display: 'flex', alignItems: 'center', gap: '2px' }
          }, [
            React.createElement('button', {
              key: 'str25',
              onClick: () => addPiece('straight', { length: 25 }),
              style: {
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '0 6px 6px 0',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '12px'
              }
            }, '×')
          ])
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
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
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
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
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
            padding: '8px 16px',
            backgroundColor: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            userSelect: 'none'
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
            padding: '8px 16px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            userSelect: 'none'
          }
        }, '🎯 回中'),

        // 智能赛道输入
        React.createElement('div', {
          key: 'smart-track-input',
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginLeft: '20px'
          }
        }, [
          React.createElement('span', { 
            key: 'label',
            style: { fontSize: '14px', color: '#374151' }
          }, '快速添加:'),
          React.createElement('input', {
            key: 'track-code',
            type: 'text',
            placeholder: '输入赛道代码 (如: L88, R200A90)',
            style: {
              padding: '6px 10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              width: '200px',
              fontSize: '14px'
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
              padding: '6px 12px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }
          }, '添加')
        ]),

        React.createElement('label', {
          key: 'load-label',
          style: {
            padding: '8px 16px',
            backgroundColor: '#0ea5e9',
            color: 'white',
            borderRadius: '6px',
            cursor: 'pointer',
            userSelect: 'none',
            display: 'inline-block'
          }
        }, [
          '📁 导入JSON',
          React.createElement('input', {
            key: 'load-input',
            id: 'file-input',
            type: 'file',
            accept: '.json',
            onChange: loadTrackFromJSON,
            style: { display: 'none' }
          })
        ]),

        React.createElement('button', {
          key: 'export-image',
          onClick: exportAsImage,
          style: {
            padding: '8px 16px',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            userSelect: 'none'
          }
        }, '🖼️ 导出图片'),

        React.createElement('button', {
          key: 'view-bom',
          onClick: () => setShowBomDialog(true),
          style: {
            padding: '8px 16px',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            userSelect: 'none'
          }
        }, '📋 查看BOM'),

        React.createElement('button', {
          key: 'clear',
          onClick: () => { setPieces([]); setSelectedId(null); setSelectedIds([]) },
          style: {
            padding: '8px 16px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            userSelect: 'none'
          }
        }, '清空')
      ])

    ]),

    // 状态栏
    React.createElement('div', {
      key: 'status',
      style: {
        padding: '8px 15px',
        backgroundColor: '#e5e7eb',
        fontSize: '12px',
        color: '#374151'
      }
    }, `元件: ${pieces.length} | 选中: ${selectedIds.length > 0 ? `多选(${selectedIds.length})` : selectedId ? `ID-${selectedId}` : '无'} | Ctrl+滚轮缩放 | 右键拖拽视图 | 框选多选 | Tab旋转15° | 双击输入角度`),

    // 画布区域 - 使用viewBox实现真正的视图缩放
    React.createElement('div', {
      key: 'canvas',
      style: {
        flex: 1,
        backgroundColor: '#fafafa',
        position: 'relative',
        overflow: 'hidden'
      }
    }, [
      React.createElement('svg', {
        key: 'svg',
        ref: svgRef,
        width: '100%',
        height: '100%',
        viewBox: `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
        style: {
          cursor: isDragging ? 'grabbing' : (isRightDragging ? 'move' : 'default')
        },
        onMouseDown: (e) => {
          handleMouseDown(e)
          handleCanvasMouseDown(e)
        },
        onMouseMove: (e) => {
          handleMouseMove(e)
          handleCanvasMouseMove(e)
        },
        onMouseUp: (e) => {
          handleMouseUp()
          handleCanvasMouseUp(e)
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
              stroke: '#e5e7eb',
              strokeWidth: 0.5,
              opacity: 0.3
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
        ...pieces.map(piece => {
          const isSelected = piece.id === selectedId || selectedIds.includes(piece.id)
          
          if (piece.type === 'straight') {
            const length = piece.params.length * 2
            const width = 45 * 2
            
            return React.createElement('g', { 
              key: piece.id,
              transform: `translate(${piece.x}, ${piece.y}) rotate(${piece.rotation || 0})`
            }, [
              React.createElement('rect', {
                key: 'rect',
                x: 0,
                y: -width/2,
                width: length,
                height: width,
                fill: '#1f2937',
                stroke: isSelected ? '#ef4444' : '#6b7280',
                strokeWidth: isSelected ? 3 : 1,
                style: { cursor: 'move' },
                onMouseDown: (e) => handleMouseDown(e, piece),
                onDoubleClick: () => handleDoubleClick(piece)
              }),
              React.createElement('text', {
                key: 'text',
                x: length/2,
                y: 5, // 显示在赛道中心
                textAnchor: 'middle',
                fontSize: '16px',
                fill: '#ffff00', // 黄色文字，与图片一致
                fontWeight: 'bold',
                style: { userSelect: 'none' }
              }, `L${piece.params.length}`),
              // 连接点
              React.createElement('circle', {
                key: 'start',
                cx: 0,
                cy: 0,
                r: 4,
                fill: '#10b981',
                stroke: '#065f46',
                strokeWidth: 1
              }),
              React.createElement('circle', {
                key: 'end',
                cx: length,
                cy: 0,
                r: 4,
                fill: '#dc2626',
                stroke: '#7f1d1d',
                strokeWidth: 1
              })
            ])
          } else if (piece.type === 'curve') {
            // R50-90意味着：赛道中心线到圆心距离50cm，圆心角90°
            const centerRadius = piece.params.radius * 2 // 中心线半径
            const trackWidth = 45 * 2
            const angleRad = (piece.params.angle * Math.PI) / 180
            
            const innerRadius = centerRadius - trackWidth / 2
            const outerRadius = centerRadius + trackWidth / 2
            
            const x1 = innerRadius
            const y1 = 0
            const x2 = outerRadius
            const y2 = 0
            const x3 = outerRadius * Math.cos(angleRad)
            const y3 = outerRadius * Math.sin(angleRad)
            const x4 = innerRadius * Math.cos(angleRad)
            const y4 = innerRadius * Math.sin(angleRad)
            
            // 中心线上的连接点
            const centerX1 = centerRadius
            const centerY1 = 0
            const centerX2 = centerRadius * Math.cos(angleRad)
            const centerY2 = centerRadius * Math.sin(angleRad)
            
            const largeArcFlag = piece.params.angle > 180 ? 1 : 0
            
            return React.createElement('g', { 
              key: piece.id,
              transform: `translate(${piece.x}, ${piece.y}) rotate(${piece.rotation || 0})`
            }, [
              React.createElement('path', {
                key: 'path',
                d: `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}`,
                fill: '#1f2937',
                stroke: isSelected ? '#ef4444' : '#6b7280',
                strokeWidth: isSelected ? 3 : 1,
                style: { cursor: 'move' },
                onMouseDown: (e) => handleMouseDown(e, piece),
                onDoubleClick: () => handleDoubleClick(piece)
              }),
              // 显示圆心
              React.createElement('circle', {
                key: 'center',
                cx: 0,
                cy: 0,
                r: 3,
                fill: '#00ff00',
                stroke: '#000',
                strokeWidth: 1
              }),
              React.createElement('text', {
                key: 'text',
                x: centerRadius * Math.cos(angleRad/2), // 在赛道中心线上
                y: centerRadius * Math.sin(angleRad/2), // 在赛道中心线上
                textAnchor: 'middle',
                fontSize: '16px',
                fill: '#ffff00', // 黄色文字，与图片一致
                fontWeight: 'bold',
                style: { userSelect: 'none' }
              }, `R${piece.params.radius}-${piece.params.angle}`),
              // 连接点在赛道中心线上
              React.createElement('circle', {
                key: 'start',
                cx: centerX1,
                cy: centerY1,
                r: 4,
                fill: '#10b981',
                stroke: '#065f46',
                strokeWidth: 1
              }),
              React.createElement('circle', {
                key: 'end',
                cx: centerX2,
                cy: centerY2,
                r: 4,
                fill: '#dc2626',
                stroke: '#7f1d1d',
                strokeWidth: 1
              })
            ])
          }
          return null
        }),
        
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
          ry: 2
        }) : null
      ].filter(Boolean)),

      pieces.length === 0 ? React.createElement('div', {
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
          backgroundColor: '#1f2937',
          borderTop: '2px solid #374151',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '12px',
          paddingRight: '12px',
          fontSize: '12px',
          color: '#f9fafb',
          zIndex: 1000
        }
      }, [
        // 左侧：项目信息和实验室口号
        React.createElement('div', {
          key: 'left-info',
          style: { display: 'flex', alignItems: 'center', gap: '20px' }
        }, [
          React.createElement('span', { key: 'project-info' }, 
            `项目: ${currentArchiveName} | 元件数: ${pieces.length}`
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
            color: '#d1d5db',
            fontFamily: 'monospace'
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
          backdropFilter: 'blur(4px)'
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
