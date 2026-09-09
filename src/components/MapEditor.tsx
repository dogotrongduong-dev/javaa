import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapData } from '../types/game';
import { parseMapBinary, serializeMapBinary, formatHexByte } from '../utils/j2meBinary';
import {
  Paintbrush,
  PaintBucket,
  Eraser,
  Pipette,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Save,
  Grid,
  Hash,
  Download,
  Upload,
  Layers,
  Settings2,
  Check,
  AlertCircle
} from 'lucide-react';

interface MapEditorProps {
  initialBytes: Uint8Array;
  filePath: string;
  onSaveToJar: (filePath: string, data: Uint8Array) => void;
  availableMapFiles: string[];
  onSelectMapFile: (filePath: string) => void;
}

type ToolType = 'pencil' | 'bucket' | 'eraser' | 'picker' | 'rect';

// Standard 16 retro tile palette colors with default labels
const DEFAULT_TILE_METAS: { color: string; label: string }[] = [
  { color: '#22c55e', label: 'Cỏ (Grass)' },          // 0
  { color: '#0ea5e9', label: 'Nước (Water)' },         // 1
  { color: '#15803d', label: 'Cây rừng (Forest)' },    // 2
  { color: '#78716c', label: 'Núi đá (Mountain)' },    // 3
  { color: '#d97706', label: 'Đường đất (Road)' },     // 4
  { color: '#ef4444', label: 'Lâu đài (Base)' },       // 5
  { color: '#a855f7', label: 'Vùng cấm (Forbidden)' }, // 6
  { color: '#eab308', label: 'Bãi cát (Sand)' },       // 7
  { color: '#06b6d4', label: 'Cầu gỗ (Bridge)' },      // 8
  { color: '#64748b', label: 'Tường thành (Wall)' },   // 9
  { color: '#f97316', label: 'Dung nham (Lava)' },     // 10
  { color: '#ec4899', label: 'Kho báu (Spawn)' },      // 11
  { color: '#84cc16', label: 'Đồng ruộng (Farm)' },    // 12
  { color: '#6366f1', label: 'Tháp canh (Tower)' },    // 13
  { color: '#14b8a6', label: 'Đầm lầy (Swamp)' },      // 14
  { color: '#334155', label: 'Vực sâu (Abyss)' },      // 15
];

export const MapEditor: React.FC<MapEditorProps> = ({
  initialBytes,
  filePath,
  onSaveToJar,
  availableMapFiles,
  onSelectMapFile,
}) => {
  // Parsed map state
  const [mapData, setMapData] = useState<MapData>(() => parseMapBinary(initialBytes, filePath));
  const [activeTool, setActiveTool] = useState<ToolType>('pencil');
  const [selectedTileId, setSelectedTileId] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(200); // 100%, 200%, 300%
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showTileIds, setShowTileIds] = useState<boolean>(false);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number; tile: number } | null>(null);

  // Settings state
  const [headerOffset, setHeaderOffset] = useState<number>(mapData.headerOffset);
  const [customWidth, setCustomWidth] = useState<number>(mapData.width);
  const [customHeight, setCustomHeight] = useState<number>(mapData.height);
  const [isModified, setIsModified] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // History for undo
  const [history, setHistory] = useState<number[][]>([]);

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMouseDownRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Re-parse when initialBytes or filePath changes
  useEffect(() => {
    const parsed = parseMapBinary(initialBytes, filePath);
    setMapData(parsed);
    setHeaderOffset(parsed.headerOffset);
    setCustomWidth(parsed.width);
    setCustomHeight(parsed.height);
    setIsModified(false);
    setHistory([]);
  }, [initialBytes, filePath]);

  // Color generator for any tile ID
  const getTileColor = useCallback((id: number): string => {
    if (id < DEFAULT_TILE_METAS.length) {
      return DEFAULT_TILE_METAS[id].color;
    }
    // Deterministic HSL color for any tile index 0-255
    const hue = (id * 137.5) % 360;
    return `hsl(${hue}, 65%, 45%)`;
  }, []);

  const getTileLabel = useCallback((id: number): string => {
    if (id < DEFAULT_TILE_METAS.length) {
      return DEFAULT_TILE_METAS[id].label;
    }
    return `Tile #${id}`;
  }, []);

  // Compute unique tiles in the current map
  const uniqueTiles = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const t of mapData.tiles) {
      counts[t] = (counts[t] || 0) + 1;
    }
    const ids = Object.keys(counts).map(Number).sort((a, b) => a - b);
    return ids.map((id) => ({
      id,
      count: counts[id],
      color: getTileColor(id),
      label: getTileLabel(id),
    }));
  }, [mapData.tiles, getTileColor, getTileLabel]);

  // Render map to canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tileSize = Math.max(8, Math.floor(16 * (zoom / 100)));
    canvas.width = mapData.width * tileSize;
    canvas.height = mapData.height * tileSize;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw tiles
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        const tile = mapData.tiles[y * mapData.width + x] ?? 0;
        ctx.fillStyle = getTileColor(tile);
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);

        // Tile ID text if enabled and zoomed enough
        if (showTileIds && tileSize >= 16) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `${Math.max(9, Math.floor(tileSize * 0.4))}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 2;
          ctx.fillText(
            tile.toString(),
            x * tileSize + tileSize / 2,
            y * tileSize + tileSize / 2
          );
          ctx.shadowBlur = 0;
        }

        // Grid border
        if (showGrid) {
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
    }
  }, [mapData, zoom, showGrid, showTileIds, getTileColor]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Tile placement helper
  const setTileAt = (x: number, y: number, tileId: number) => {
    if (x < 0 || x >= mapData.width || y < 0 || y >= mapData.height) return;
    const idx = y * mapData.width + x;
    if (mapData.tiles[idx] === tileId) return;

    // Push to history
    setHistory((prev) => [...prev.slice(-20), [...mapData.tiles]]);

    setMapData((prev) => {
      const newTiles = [...prev.tiles];
      newTiles[idx] = tileId;
      return { ...prev, tiles: newTiles };
    });
    setIsModified(true);
  };

  // Flood fill (bucket tool)
  const floodFill = (startX: number, startY: number, targetTile: number) => {
    if (startX < 0 || startX >= mapData.width || startY < 0 || startY >= mapData.height) return;
    const startIdx = startY * mapData.width + startX;
    const sourceTile = mapData.tiles[startIdx];
    if (sourceTile === targetTile) return;

    setHistory((prev) => [...prev.slice(-20), [...mapData.tiles]]);

    const newTiles = [...mapData.tiles];
    const queue: [number, number][] = [[startX, startY]];
    const visited = new Uint8Array(mapData.width * mapData.height);
    visited[startIdx] = 1;

    while (queue.length > 0) {
      const [cx, cy] = queue.pop()!;
      const idx = cy * mapData.width + cx;
      newTiles[idx] = targetTile;

      const neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < mapData.width && ny >= 0 && ny < mapData.height) {
          const nIdx = ny * mapData.width + nx;
          if (!visited[nIdx] && newTiles[nIdx] === sourceTile) {
            visited[nIdx] = 1;
            queue.push([nx, ny]);
          }
        }
      }
    }

    setMapData((prev) => ({ ...prev, tiles: newTiles }));
    setIsModified(true);
  };

  // Canvas Mouse events
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const tileSize = Math.max(8, Math.floor(16 * (zoom / 100)));
    const x = Math.floor(clientX / tileSize);
    const y = Math.floor(clientY / tileSize);
    return { x: Math.max(0, Math.min(mapData.width - 1, x)), y: Math.max(0, Math.min(mapData.height - 1, y)) };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isMouseDownRef.current = true;
    const { x, y } = getCanvasCoords(e);
    dragStartRef.current = { x, y };

    if (activeTool === 'pencil') {
      setTileAt(x, y, selectedTileId);
    } else if (activeTool === 'eraser') {
      setTileAt(x, y, 0);
    } else if (activeTool === 'bucket') {
      floodFill(x, y, selectedTileId);
    } else if (activeTool === 'picker') {
      const idx = y * mapData.width + x;
      setSelectedTileId(mapData.tiles[idx] ?? 0);
      setActiveTool('pencil');
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    const idx = y * mapData.width + x;
    setHoverCoord({ x, y, tile: mapData.tiles[idx] ?? 0 });

    if (!isMouseDownRef.current) return;

    if (activeTool === 'pencil') {
      setTileAt(x, y, selectedTileId);
    } else if (activeTool === 'eraser') {
      setTileAt(x, y, 0);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'rect' && isMouseDownRef.current && dragStartRef.current) {
      const { x: endX, y: endY } = getCanvasCoords(e);
      const startX = Math.min(dragStartRef.current.x, endX);
      const startY = Math.min(dragStartRef.current.y, endY);
      const maxX = Math.max(dragStartRef.current.x, endX);
      const maxY = Math.max(dragStartRef.current.y, endY);

      setHistory((prev) => [...prev.slice(-20), [...mapData.tiles]]);
      setMapData((prev) => {
        const newTiles = [...prev.tiles];
        for (let py = startY; py <= maxY; py++) {
          for (let px = startX; px <= maxX; px++) {
            newTiles[py * prev.width + px] = selectedTileId;
          }
        }
        return { ...prev, tiles: newTiles };
      });
      setIsModified(true);
    }

    isMouseDownRef.current = false;
    dragStartRef.current = null;
  };

  const handleMouseLeave = () => {
    isMouseDownRef.current = false;
    setHoverCoord(null);
  };

  // Undo
  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setMapData((prev) => ({ ...prev, tiles: last }));
    setIsModified(true);
  };

  // Apply Dimension changes
  const handleApplyDimensions = () => {
    const w = Math.max(1, Math.min(256, customWidth));
    const h = Math.max(1, Math.min(256, customHeight));
    const newTiles = new Array(w * h).fill(0);

    // Copy existing tiles
    for (let y = 0; y < Math.min(h, mapData.height); y++) {
      for (let x = 0; x < Math.min(w, mapData.width); x++) {
        newTiles[y * w + x] = mapData.tiles[y * mapData.width + x] ?? 0;
      }
    }

    setMapData((prev) => ({
      ...prev,
      width: w,
      height: h,
      headerOffset,
      tiles: newTiles,
    }));
    setIsModified(true);
  };

  // Save changes directly back into the JAR
  const handleSaveMap = () => {
    const binary = serializeMapBinary(mapData);
    onSaveToJar(mapData.filePath, binary);
    setIsModified(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Export raw binary file
  const handleExportRawMap = () => {
    const binary = serializeMapBinary(mapData);
    const blob = new Blob([binary], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filePath.replace(/\//g, '_')}_dump.bin`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import raw binary file
  const handleImportRawMap = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          const raw = new Uint8Array(reader.result);
          const parsed = parseMapBinary(raw, filePath);
          setMapData(parsed);
          setHeaderOffset(parsed.headerOffset);
          setCustomWidth(parsed.width);
          setCustomHeight(parsed.height);
          setIsModified(true);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden bg-neutral-950">
      
      {/* Top Toolbar */}
      <div className="h-12 sm:h-14 bg-neutral-900 border-b border-neutral-800 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4 shrink-0">
        
        {/* Left: Map file selector & status */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <span className="text-xs font-semibold text-neutral-400">File:</span>
            <select
              id="map-file-select"
              value={filePath}
              onChange={(e) => onSelectMapFile(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500 font-mono h-8"
            >
              {availableMapFiles.map((f) => (
                <option key={f} value={f}>
                  {f} {f === 'ma' || f === '/ma' ? '(Map chính)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded-md border border-neutral-800 shrink-0">
            <span>{mapData.width} × {mapData.height}</span>
            <span>•</span>
            <span>{mapData.tiles.length} tiles</span>
            <span>•</span>
            <span>Header: {mapData.headerOffset}B</span>
          </div>
        </div>

        {/* Center: Tools */}
        <div className="flex items-center space-x-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 shrink-0">
          <button
            id="tool-pencil"
            onClick={() => setActiveTool('pencil')}
            title="Bút vẽ (Pencil)"
            className={`p-1.5 rounded-md transition ${
              activeTool === 'pencil' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Paintbrush className="w-4 h-4" />
          </button>
          <button
            id="tool-bucket"
            onClick={() => setActiveTool('bucket')}
            title="Đổ thùng sơn (Flood Fill)"
            className={`p-1.5 rounded-md transition ${
              activeTool === 'bucket' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <PaintBucket className="w-4 h-4" />
          </button>
          <button
            id="tool-eraser"
            onClick={() => setActiveTool('eraser')}
            title="Tẩy về tile 0 (Eraser)"
            className={`p-1.5 rounded-md transition ${
              activeTool === 'eraser' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Eraser className="w-4 h-4" />
          </button>
          <button
            id="tool-picker"
            onClick={() => setActiveTool('picker')}
            title="Hút mã tile (Eyedropper)"
            className={`p-1.5 rounded-md transition ${
              activeTool === 'picker' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Pipette className="w-4 h-4" />
          </button>
          <button
            id="tool-undo"
            onClick={handleUndo}
            disabled={history.length === 0}
            title="Hoàn tác (Undo)"
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 disabled:opacity-30"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Right: View toggles & Save */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Zoom controls */}
          <div className="flex items-center space-x-1 bg-neutral-950 px-1 py-0.5 rounded-lg border border-neutral-800 h-8">
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 50))}
              className="p-1 text-neutral-400 hover:text-neutral-200"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-neutral-300 w-10 text-center">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(400, z + 50))}
              className="p-1 text-neutral-400 hover:text-neutral-200"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setShowGrid(!showGrid)}
            title="Bật/tắt lưới"
            className={`p-1.5 rounded-lg border text-xs h-8 ${
              showGrid ? 'bg-neutral-800 border-neutral-700 text-emerald-400' : 'border-neutral-800 text-neutral-500'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowTileIds(!showTileIds)}
            title="Hiển thị số Tile ID"
            className={`p-1.5 rounded-lg border text-xs h-8 ${
              showTileIds ? 'bg-neutral-800 border-neutral-700 text-emerald-400' : 'border-neutral-800 text-neutral-500'
            }`}
          >
            <Hash className="w-4 h-4" />
          </button>

          {/* Save directly to Game JAR */}
          <button
            id="btn-save-map"
            onClick={handleSaveMap}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition h-8 ${
              isModified
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Đã ghi vào JAR!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Lưu vào game</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex-1 min-h-0 min-w-0 flex overflow-hidden">
        
        {/* Left Side: Palette & Properties */}
        <div className="w-64 lg:w-72 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0 min-h-0">
          
          {/* Selected Tile Indicator */}
          <div className="p-3 sm:p-3.5 border-b border-neutral-800 bg-neutral-900/50 shrink-0">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">
              Tile đang chọn
            </span>
            <div className="flex items-center space-x-2.5 bg-neutral-950 p-2 rounded-xl border border-neutral-800">
              <div
                className="w-9 h-9 rounded-lg border border-neutral-700 shadow-inner flex items-center justify-center font-bold text-white text-xs drop-shadow shrink-0"
                style={{ backgroundColor: getTileColor(selectedTileId) }}
              >
                {selectedTileId}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-neutral-200 truncate">
                  {getTileLabel(selectedTileId)}
                </div>
                <div className="text-[11px] font-mono text-neutral-500">
                  ID: {selectedTileId} ({formatHexByte(selectedTileId)})
                </div>
              </div>
            </div>
          </div>

          {/* Tile Palette Swatches */}
          <div className="p-3 flex-1 min-h-0 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Bảng Tile ({uniqueTiles.length})
              </span>
              <span className="text-[10px] text-neutral-500">Chọn để vẽ</span>
            </div>

            <div className="space-y-1">
              {uniqueTiles.map((item) => {
                const isSelected = selectedTileId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedTileId(item.id);
                      if (activeTool === 'eraser') setActiveTool('pencil');
                    }}
                    className={`w-full flex items-center justify-between p-1.5 sm:p-2 rounded-lg border text-xs transition ${
                      isSelected
                        ? 'bg-neutral-800 border-emerald-500/70 text-emerald-400 shadow-sm'
                        : 'border-neutral-800/80 hover:bg-neutral-800/40 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <div
                        className="w-4 h-4 rounded border border-neutral-700/80 shrink-0 shadow-inner"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate font-medium text-xs">{item.label}</span>
                    </div>
                    <div className="flex items-center space-x-2 font-mono text-[10px] text-neutral-500 shrink-0">
                      <span>x{item.count}</span>
                      <span className="w-5 text-right text-neutral-400">#{item.id}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Tile ID input */}
            <div className="mt-3 pt-3 border-t border-neutral-800">
              <label className="text-[10px] font-medium text-neutral-400 block mb-1">
                Nhập Tile ID tuỳ ý (0 - 255):
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={selectedTileId}
                  onChange={(e) => setSelectedTileId(Math.max(0, Math.min(255, parseInt(e.target.value) || 0)))}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-neutral-200 font-mono focus:border-emerald-500 focus:outline-none h-7"
                />
              </div>
            </div>
          </div>

          {/* Map Structure Settings Accordion */}
          <div className="p-3 border-t border-neutral-800 bg-neutral-950/60 shrink-0">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-neutral-300 mb-2">
              <Settings2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cấu trúc nhị phân</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-neutral-400 text-[10px] block mb-0.5">Header Offset:</label>
                <select
                  value={headerOffset}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setHeaderOffset(val);
                    setMapData((prev) => ({ ...prev, headerOffset: val }));
                    setIsModified(true);
                  }}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-neutral-200 font-mono text-xs h-7"
                >
                  <option value={2}>2B [W (u8), H (u8)]</option>
                  <option value={4}>4B [W (u16be), H (u16be)]</option>
                  <option value={0}>0B (Headerless raw)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-neutral-400 text-[10px] block mb-0.5">Rộng (W):</label>
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-0.5 text-neutral-200 font-mono text-xs h-7"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 text-[10px] block mb-0.5">Cao (H):</label>
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(parseInt(e.target.value) || 1)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-0.5 text-neutral-200 font-mono text-xs h-7"
                  />
                </div>
              </div>

              <button
                onClick={handleApplyDimensions}
                className="w-full py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 transition"
              >
                Cập nhật kích thước
              </button>

              <div className="pt-1.5 border-t border-neutral-800 flex gap-1.5">
                <button
                  onClick={handleExportRawMap}
                  title="Xuất file nhị phân thô"
                  className="flex-1 py-1 bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-400 hover:text-neutral-200 rounded border border-neutral-800 flex items-center justify-center space-x-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Dump .bin</span>
                </button>
                <label className="flex-1 py-1 bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-400 hover:text-neutral-200 rounded border border-neutral-800 flex items-center justify-center space-x-1 cursor-pointer">
                  <Upload className="w-3 h-3" />
                  <span>Nạp .bin</span>
                  <input type="file" onChange={handleImportRawMap} className="hidden" />
                </label>
              </div>
            </div>
          </div>

        </div>

        {/* Center: Canvas Viewport */}
        <div className="flex-1 min-w-0 min-h-0 relative overflow-auto p-4 sm:p-8 bg-neutral-950/90 flex">
          <div className="m-auto relative border border-neutral-800 shadow-2xl rounded-sm overflow-hidden bg-black/40 shrink-0">
            <canvas
              ref={canvasRef}
              id="map-canvas"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              className="cursor-crosshair block"
            />
          </div>

          {/* Coordinate Overlay HUD */}
          <div className="pointer-events-none absolute bottom-4 left-4 bg-neutral-900/90 backdrop-blur border border-neutral-800 px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-300 shadow-lg flex items-center space-x-3 z-10">
            {hoverCoord ? (
              <>
                <span>X: <span className="text-emerald-400 font-semibold">{hoverCoord.x}</span></span>
                <span>Y: <span className="text-emerald-400 font-semibold">{hoverCoord.y}</span></span>
                <span>Tile: <span className="text-amber-400 font-semibold">{hoverCoord.tile} ({formatHexByte(hoverCoord.tile)})</span></span>
                <span className="text-neutral-400 font-sans hidden sm:inline">{getTileLabel(hoverCoord.tile)}</span>
              </>
            ) : (
              <span className="text-neutral-500">Rê chuột lên bản đồ để soi toạ độ</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
