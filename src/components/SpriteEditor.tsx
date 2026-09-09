import React, { useState, useEffect } from 'react';
import { ExtractedSprite } from '../types/game';
import { extractSpritesFromPack, rebuildSpritePack } from '../utils/j2meBinary';
import {
  Image,
  Upload,
  Download,
  Save,
  Check,
  ZoomIn,
  ZoomOut,
  Layers,
  Sparkles,
  Info,
  RefreshCw
} from 'lucide-react';

interface SpriteEditorProps {
  initialBytes: Uint8Array;
  filePath: string;
  onSaveToJar: (filePath: string, data: Uint8Array) => void;
  availableSpriteFiles: string[];
  onSelectSpriteFile: (filePath: string) => void;
}

export const SpriteEditor: React.FC<SpriteEditorProps> = ({
  initialBytes,
  filePath,
  onSaveToJar,
  availableSpriteFiles,
  onSelectSpriteFile,
}) => {
  const [sprites, setSprites] = useState<ExtractedSprite[]>([]);
  const [selectedSpriteIndex, setSelectedSpriteIndex] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(400); // Zoom for sprite preview (e.g. 100%, 200%, 400%, 800%)
  const [isModified, setIsModified] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Extract sprites whenever initialBytes or filePath changes
  useEffect(() => {
    const extracted = extractSpritesFromPack(initialBytes, filePath.replace(/\//g, '_'));
    setSprites(extracted);
    setSelectedSpriteIndex(0);
    setIsModified(false);
  }, [initialBytes, filePath]);

  const currentSprite = sprites[selectedSpriteIndex];

  // Handle uploading a replacement PNG for the selected sprite
  const handleReplaceSprite = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && currentSprite) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          const newData = new Uint8Array(reader.result);
          const newBlob = new Blob([newData], { type: 'image/png' });
          const newBlobUrl = URL.createObjectURL(newBlob);

          // Read width and height from uploaded image
          const img = new window.Image();
          img.onload = () => {
            setSprites((prev) => {
              const updated = [...prev];
              updated[selectedSpriteIndex] = {
                ...updated[selectedSpriteIndex],
                data: newData,
                size: newData.length,
                width: img.naturalWidth || updated[selectedSpriteIndex].width,
                height: img.naturalHeight || updated[selectedSpriteIndex].height,
                blobUrl: newBlobUrl,
              };
              return updated;
            });
            setIsModified(true);
          };
          img.src = newBlobUrl;
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Save modified sprite pack back to the JAR
  const handleSaveSprites = () => {
    const rebuilt = rebuildSpritePack(initialBytes, sprites);
    onSaveToJar(filePath, rebuilt);
    setIsModified(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Export current selected sprite as PNG
  const handleExportSingle = () => {
    if (!currentSprite) return;
    const a = document.createElement('a');
    a.href = currentSprite.blobUrl;
    a.download = currentSprite.name;
    a.click();
  };

  // Export all sprites as zip or separate downloads
  const handleExportAll = () => {
    sprites.forEach((s) => {
      const a = document.createElement('a');
      a.href = s.blobUrl;
      a.download = s.name;
      a.click();
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-neutral-950 overflow-hidden">
      
      {/* Top Toolbar */}
      <div className="h-14 bg-neutral-900 border-b border-neutral-800 px-4 flex items-center justify-between gap-4 shrink-0">
        
        {/* Left: Pack selector & status */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-neutral-400">File Pack:</span>
            <select
              id="sprite-pack-select"
              value={filePath}
              onChange={(e) => onSelectSpriteFile(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-sky-500 font-mono"
            >
              {availableSpriteFiles.map((f) => (
                <option key={f} value={f}>
                  {f} {f === 'pi0' || f === '/pi0' ? '(Terrain Tiles)' : ''}
                  {f === 'pi8' || f === '/pi8' ? '(Unit Sprites)' : ''}
                  {f === 'pi9' || f === '/pi9' ? '(UI & Icons)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded-md border border-neutral-800">
            <span>Tìm thấy {sprites.length} sprite PNG</span>
            <span>•</span>
            <span>Kích thước file: {initialBytes.length}B</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {sprites.length > 0 && (
            <button
              onClick={handleExportAll}
              title="Tải toàn bộ sprites dạng PNG"
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-lg border border-neutral-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải tất cả PNG</span>
            </button>
          )}

          <button
            id="btn-save-sprites"
            onClick={handleSaveSprites}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              isModified
                ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-sky-300" />
                <span>Đã đóng gói vào JAR!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Đóng gói & Lưu</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Gallery: List of extracted sprites */}
        <div className="w-80 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0">
          <div className="p-3 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Danh sách Sprite ({sprites.length})
            </span>
            <span className="text-[10px] text-neutral-500">Chuẩn PNG MIDP</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sprites.length === 0 ? (
              <div className="text-center py-12 text-xs text-neutral-500">
                Không tìm thấy cấu trúc PNG hợp lệ trong file này.
              </div>
            ) : (
              sprites.map((sprite, idx) => {
                const isSelected = selectedSpriteIndex === idx;
                return (
                  <button
                    key={sprite.id}
                    onClick={() => setSelectedSpriteIndex(idx)}
                    className={`w-full flex items-center space-x-3 p-2.5 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-neutral-800 border-sky-500/70 shadow-sm'
                        : 'border-neutral-800/80 hover:bg-neutral-800/40'
                    }`}
                  >
                    {/* Checkerboard thumbnail container */}
                    <div className="w-12 h-12 rounded-lg border border-neutral-700/80 bg-[linear-gradient(45deg,#1e1e1e_25%,transparent_25%),linear-gradient(-45deg,#1e1e1e_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e1e1e_75%),linear-gradient(-45deg,transparent_75%,#1e1e1e_75%)] bg-[size:10px_10px] bg-[#121212] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      <img
                        src={sprite.blobUrl}
                        alt={`Sprite ${idx}`}
                        className="max-w-full max-h-full image-rendering-pixelated object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold truncate ${isSelected ? 'text-sky-400' : 'text-neutral-200'}`}>
                          Sprite #{idx}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {sprite.size} B
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                        {sprite.width} × {sprite.height} px
                      </div>
                      <div className="text-[10px] font-mono text-neutral-500 truncate">
                        Offset: 0x{sprite.offset.toString(16).toUpperCase()}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail / Replacement Canvas */}
        <div className="flex-1 flex flex-col bg-neutral-950 overflow-y-auto p-6">
          {currentSprite ? (
            <div className="max-w-2xl mx-auto w-full space-y-6">
              
              {/* Header Info */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <div>
                  <h2 className="text-lg font-bold text-neutral-100 flex items-center space-x-2">
                    <span>Sprite #{selectedSpriteIndex}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono">
                      PNG Chunk
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1 font-mono">
                    Offset trong pack: 0x{currentSprite.offset.toString(16).toUpperCase()} • Kích thước: {currentSprite.width} × {currentSprite.height} px • Dung lượng: {currentSprite.size} bytes
                  </p>
                </div>

                {/* Zoom controls */}
                <div className="flex items-center space-x-1 bg-neutral-900 px-2 py-1 rounded-lg border border-neutral-800">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(100, z - 100))}
                    className="p-1 text-neutral-400 hover:text-neutral-200"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono text-neutral-300 w-12 text-center">
                    {zoomLevel}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(800, z + 100))}
                    className="p-1 text-neutral-400 hover:text-neutral-200"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Pixel Preview Stage */}
              <div className="p-8 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-center min-h-[280px]">
                <div
                  className="rounded-xl border border-neutral-700/80 p-4 shadow-2xl bg-[linear-gradient(45deg,#262626_25%,transparent_25%),linear-gradient(-45deg,#262626_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#262626_75%),linear-gradient(-45deg,transparent_75%,#262626_75%)] bg-[size:16px_16px] bg-[#171717] flex items-center justify-center transition-all"
                  style={{ minWidth: '120px', minHeight: '120px' }}
                >
                  <img
                    src={currentSprite.blobUrl}
                    alt={currentSprite.name}
                    className="image-rendering-pixelated shadow-lg"
                    style={{
                      imageRendering: 'pixelated',
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: 'center center',
                    }}
                  />
                </div>
              </div>

              {/* Actions: Replace PNG, Export single */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Upload replacement */}
                <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-200 mb-2">
                    <Upload className="w-4 h-4 text-sky-400" />
                    <span>Thay thế Sprite này</span>
                  </div>
                  <p className="text-xs text-neutral-400 mb-3">
                    Tải lên file PNG mới từ máy tính để thay thế sprite #{selectedSpriteIndex}.
                  </p>
                  <label className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 cursor-pointer transition shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Chọn file PNG thay thế</span>
                    <input
                      type="file"
                      accept="image/png"
                      onChange={handleReplaceSprite}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Export single */}
                <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-200 mb-2">
                    <Download className="w-4 h-4 text-neutral-400" />
                    <span>Xuất ảnh lẻ</span>
                  </div>
                  <p className="text-xs text-neutral-400 mb-3">
                    Lưu sprite #{selectedSpriteIndex} về máy tính dưới định dạng file .png độc lập.
                  </p>
                  <button
                    onClick={handleExportSingle}
                    className="w-full py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg border border-neutral-700 flex items-center justify-center space-x-2 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải ảnh này (.png)</span>
                  </button>
                </div>

              </div>

              {/* Notice */}
              <div className="p-3 rounded-lg bg-neutral-900/40 border border-neutral-800 text-xs text-neutral-400 flex items-start space-x-2">
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  Sau khi thay thế sprite bằng ảnh mới, hãy ấn nút <strong>"Đóng gói & Lưu"</strong> ở thanh công cụ trên cùng để cập nhật ngay vào cấu trúc file JAR game.
                </span>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-500 text-xs">
              Chọn một sprite từ danh sách bên trái để xem và thay thế
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
