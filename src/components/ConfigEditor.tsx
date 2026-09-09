import React, { useState, useEffect, useMemo } from 'react';
import { ConfigPreset, ConfigFieldSchema } from '../types/game';
import {
  formatHexByte,
  formatHexOffset,
  getAsciiChar,
  readValue,
  writeValue
} from '../utils/j2meBinary';
import {
  Settings,
  Table,
  Binary,
  Save,
  Check,
  RotateCcw,
  Sliders,
  Shield,
  Swords,
  Coins,
  Heart,
  Plus,
  Info,
  Download,
  Upload
} from 'lucide-react';

interface ConfigEditorProps {
  initialBytes: Uint8Array;
  filePath: string;
  onSaveToJar: (filePath: string, data: Uint8Array) => void;
  availableConfigFiles: string[];
  onSelectConfigFile: (filePath: string) => void;
}

// Built-in preset schemas for J2ME Bolac
const DEFAULT_PRESETS: ConfigPreset[] = [
  {
    id: 'bolac-units-16b',
    name: 'Binh chủng & Công trình (16 bytes/record)',
    recordSize: 16,
    fields: [
      { id: 'id', name: 'Unit ID', offsetInRecord: 0, type: 'u8', description: 'Mã định danh đơn vị' },
      { id: 'type', name: 'Loại', offsetInRecord: 1, type: 'u8', description: '0=Bộ binh, 1=Cung, 2=Kỵ, 3=Pháp sư, 4=Công trình' },
      { id: 'hp', name: 'Máu (HP)', offsetInRecord: 2, type: 'u16be', description: 'Lượng máu khởi đầu' },
      { id: 'atk', name: 'Sát thương (Atk)', offsetInRecord: 4, type: 'u16be', description: 'Sức tấn công cơ bản' },
      { id: 'def', name: 'Giáp (Def)', offsetInRecord: 6, type: 'u16be', description: 'Chỉ số giảm sát thương' },
      { id: 'cost', name: 'Giá vàng (Cost)', offsetInRecord: 8, type: 'u16be', description: 'Chi phí chiêu mộ / xây dựng' },
      { id: 'spd', name: 'Tốc độ (Speed)', offsetInRecord: 10, type: 'u8', description: 'Tốc độ di chuyển / tầm nhìn' },
      { id: 'aspd', name: 'Tốc đánh (AtkSpd)', offsetInRecord: 11, type: 'u8', description: 'Thời gian trễ giữa mỗi đòn' },
      { id: 'flags', name: 'Reserved/Flags', offsetInRecord: 12, type: 'u32be', description: 'Thuộc tính đặc biệt / kinh nghiệm' },
    ],
  },
  {
    id: 'generic-8b',
    name: 'Bảng tổng quát 8 bytes/mục',
    recordSize: 8,
    fields: [
      { id: 'f0', name: 'ID / Type', offsetInRecord: 0, type: 'u8' },
      { id: 'f1', name: 'Level / Rank', offsetInRecord: 1, type: 'u8' },
      { id: 'f2', name: 'Value A (16-bit)', offsetInRecord: 2, type: 'u16be' },
      { id: 'f3', name: 'Value B (16-bit)', offsetInRecord: 4, type: 'u16be' },
      { id: 'f4', name: 'Extra 1', offsetInRecord: 6, type: 'u8' },
      { id: 'f5', name: 'Extra 2', offsetInRecord: 7, type: 'u8' },
    ],
  },
  {
    id: 'raw-bytes',
    name: 'Toàn bộ Byte thô (1 byte/ô)',
    recordSize: 16,
    fields: Array.from({ length: 16 }, (_, i) => ({
      id: `b${i}`,
      name: `+${i.toString(16).toUpperCase()}`,
      offsetInRecord: i,
      type: 'u8' as const,
    })),
  },
];

export const ConfigEditor: React.FC<ConfigEditorProps> = ({
  initialBytes,
  filePath,
  onSaveToJar,
  availableConfigFiles,
  onSelectConfigFile,
}) => {
  const [bytes, setBytes] = useState<Uint8Array>(initialBytes);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('bolac-units-16b');
  const [viewMode, setViewMode] = useState<'table' | 'hex'>('table');
  const [isModified, setIsModified] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Custom record size control
  const [customRecordSize, setCustomRecordSize] = useState<number>(16);

  // Selected cell for editing in table or hex
  const [editingCell, setEditingCell] = useState<{
    recordIndex: number;
    fieldId: string;
    offset: number;
    type: 'u8' | 'i8' | 'u16be' | 'u16le' | 'u32be' | 'string';
    currentVal: number | string;
  } | null>(null);

  const [inputVal, setInputVal] = useState<string>('');
  const [inputFormat, setInputFormat] = useState<'dec' | 'hex'>('dec');

  // Sync bytes when initialBytes changes
  useEffect(() => {
    setBytes(new Uint8Array(initialBytes));
    setIsModified(false);
  }, [initialBytes, filePath]);

  const activePreset = useMemo(() => {
    return DEFAULT_PRESETS.find((p) => p.id === selectedPresetId) || DEFAULT_PRESETS[0];
  }, [selectedPresetId]);

  const recordSize = activePreset.recordSize || customRecordSize;
  const totalRecords = Math.max(1, Math.floor(bytes.length / recordSize));

  // Handle cell click in Table view
  const handleCellClick = (recordIdx: number, field: ConfigFieldSchema) => {
    const absOffset = recordIdx * recordSize + field.offsetInRecord;
    const val = readValue(bytes, absOffset, field.type);
    setEditingCell({
      recordIndex: recordIdx,
      fieldId: field.id,
      offset: absOffset,
      type: field.type,
      currentVal: val,
    });
    setInputVal(val.toString());
  };

  // Submit edit value
  const handleSubmitEdit = () => {
    if (!editingCell) return;
    let parsed: number | string = inputVal;
    if (editingCell.type !== 'string') {
      if (inputFormat === 'hex') {
        parsed = parseInt(inputVal.replace(/^0x/i, ''), 16) || 0;
      } else {
        parsed = parseInt(inputVal, 10) || 0;
      }
    }

    const updated = writeValue(bytes, editingCell.offset, editingCell.type, parsed);
    setBytes(updated);
    setIsModified(true);
    setEditingCell(null);
  };

  // Save changes directly back into the JAR
  const handleSaveToJar = () => {
    onSaveToJar(filePath, bytes);
    setIsModified(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Hex editor rows (16 bytes per line)
  const hexRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < bytes.length; i += 16) {
      rows.push({
        offset: i,
        bytes: bytes.slice(i, Math.min(i + 16, bytes.length)),
      });
    }
    return rows;
  }, [bytes]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-neutral-950 overflow-hidden">
      
      {/* Top Toolbar */}
      <div className="h-14 bg-neutral-900 border-b border-neutral-800 px-4 flex items-center justify-between gap-4 shrink-0">
        
        {/* Left: Config File Selector & Presets */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-neutral-400">File Config:</span>
            <select
              id="config-file-select"
              value={filePath}
              onChange={(e) => onSelectConfigFile(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-purple-500 font-mono"
            >
              {availableConfigFiles.map((f) => (
                <option key={f} value={f}>
                  {f} {f === 'a' || f === '/a' ? '(Game Database /a)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Switch: Table vs Hex */}
          <div className="flex items-center space-x-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                viewMode === 'table'
                  ? 'bg-neutral-800 text-purple-400 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Bảng thông số</span>
            </button>
            <button
              onClick={() => setViewMode('hex')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                viewMode === 'hex'
                  ? 'bg-neutral-800 text-purple-400 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Binary className="w-3.5 h-3.5" />
              <span>Hex Dump</span>
            </button>
          </div>

          {/* Preset Selector */}
          {viewMode === 'table' && (
            <div className="hidden lg:flex items-center space-x-2">
              <span className="text-xs text-neutral-400">Preset:</span>
              <select
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded px-2.5 py-1"
              >
                {DEFAULT_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded-md border border-neutral-800">
            <span>{bytes.length} bytes</span>
            <span>•</span>
            <span>{totalRecords} records</span>
          </div>

          <button
            id="btn-save-config"
            onClick={handleSaveToJar}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              isModified
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-purple-300" />
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

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Center: Table View or Hex View */}
        <div className="flex-1 overflow-auto p-4 bg-neutral-950">
          
          {viewMode === 'table' ? (
            <div className="border border-neutral-800 rounded-xl overflow-hidden shadow-xl bg-neutral-900/60">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900 border-b border-neutral-800 text-neutral-400 font-mono">
                    <th className="p-3 border-r border-neutral-800 w-16 text-center"># Record</th>
                    <th className="p-3 border-r border-neutral-800 w-20 text-center">Offset</th>
                    {activePreset.fields.map((f) => (
                      <th key={f.id} className="p-3 border-r border-neutral-800 min-w-[100px]">
                        <div className="font-semibold text-neutral-200">{f.name}</div>
                        <div className="text-[10px] text-neutral-500 font-normal">
                          +{f.offsetInRecord} ({f.type})
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-mono">
                  {Array.from({ length: totalRecords }, (_, recordIdx) => {
                    const rowOffset = recordIdx * recordSize;
                    return (
                      <tr key={recordIdx} className="hover:bg-neutral-800/40 transition">
                        <td className="p-2.5 text-center text-neutral-500 bg-neutral-900/30 border-r border-neutral-800">
                          {recordIdx}
                        </td>
                        <td className="p-2.5 text-center text-neutral-500 bg-neutral-900/30 border-r border-neutral-800">
                          {formatHexOffset(rowOffset)}
                        </td>

                        {activePreset.fields.map((field) => {
                          const absOffset = rowOffset + field.offsetInRecord;
                          const val = readValue(bytes, absOffset, field.type);
                          const isEditingThis =
                            editingCell?.recordIndex === recordIdx && editingCell?.fieldId === field.id;

                          return (
                            <td
                              key={field.id}
                              onClick={() => handleCellClick(recordIdx, field)}
                              className={`p-2.5 border-r border-neutral-800 cursor-pointer transition ${
                                isEditingThis
                                  ? 'bg-purple-900/40 text-purple-300 ring-2 ring-purple-500'
                                  : 'hover:bg-neutral-800 text-neutral-200'
                              }`}
                            >
                              <div className="flex items-center justify-between space-x-2">
                                <span className="font-semibold text-neutral-100">{val}</span>
                                {typeof val === 'number' && (
                                  <span className="text-[10px] text-neutral-500">
                                    0x{val.toString(16).toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Hex View */
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 font-mono text-xs overflow-x-auto shadow-xl">
              <div className="text-neutral-500 pb-2 border-b border-neutral-800 flex space-x-6">
                <span className="w-20">Offset</span>
                <span className="flex space-x-2">
                  {Array.from({ length: 16 }, (_, i) => (
                    <span key={i} className="w-6 text-center">
                      {i.toString(16).toUpperCase()}
                    </span>
                  ))}
                </span>
                <span className="w-36 text-center">Decoded Text</span>
              </div>

              <div className="divide-y divide-neutral-800/40 pt-2">
                {hexRows.map((row) => (
                  <div key={row.offset} className="flex space-x-6 py-1 hover:bg-neutral-800/30">
                    <span className="w-20 text-neutral-500">{formatHexOffset(row.offset)}</span>
                    
                    {/* Hex Bytes */}
                    <span className="flex space-x-2">
                      {Array.from({ length: 16 }, (_, i) => {
                        const byteVal = row.bytes[i];
                        const absOff = row.offset + i;
                        const hasVal = byteVal !== undefined;
                        return (
                          <button
                            key={i}
                            disabled={!hasVal}
                            onClick={() => {
                              if (hasVal) {
                                setEditingCell({
                                  recordIndex: Math.floor(absOff / 16),
                                  fieldId: `b${i}`,
                                  offset: absOff,
                                  type: 'u8',
                                  currentVal: byteVal,
                                });
                                setInputVal(byteVal.toString());
                              }
                            }}
                            className={`w-6 text-center rounded hover:bg-purple-600 hover:text-white transition ${
                              hasVal ? 'text-neutral-200' : 'text-neutral-700'
                            }`}
                          >
                            {hasVal ? formatHexByte(byteVal) : '..'}
                          </button>
                        );
                      })}
                    </span>

                    {/* ASCII column */}
                    <span className="w-36 text-neutral-400 tracking-widest pl-2">
                      {Array.from(row.bytes)
                        .map((b: number) => getAsciiChar(b))
                        .join('')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Sidebar: Quick Cell Edit & Field Inspector */}
        <div className="w-80 bg-neutral-900 border-l border-neutral-800 flex flex-col p-4 shrink-0 overflow-y-auto">
          
          <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-200 pb-3 border-b border-neutral-800">
            <Sliders className="w-4 h-4 text-purple-400" />
            <span>Chỉnh sửa thông số ô</span>
          </div>

          {editingCell ? (
            <div className="mt-4 space-y-4">
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Record:</span>
                  <span className="text-neutral-200">#{editingCell.recordIndex}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Offset:</span>
                  <span className="text-neutral-200">{formatHexOffset(editingCell.offset)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Kiểu dữ liệu:</span>
                  <span className="text-purple-400 uppercase">{editingCell.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Giá trị hiện tại:</span>
                  <span className="text-neutral-100 font-bold">{editingCell.currentVal}</span>
                </div>
              </div>

              {/* Format toggle: Dec vs Hex */}
              <div className="flex rounded-lg bg-neutral-950 p-1 border border-neutral-800">
                <button
                  onClick={() => {
                    setInputFormat('dec');
                    setInputVal(editingCell.currentVal.toString());
                  }}
                  className={`flex-1 py-1 text-xs font-medium rounded ${
                    inputFormat === 'dec' ? 'bg-neutral-800 text-purple-300' : 'text-neutral-400'
                  }`}
                >
                  Thập phân (DEC)
                </button>
                <button
                  onClick={() => {
                    setInputFormat('hex');
                    setInputVal(
                      typeof editingCell.currentVal === 'number'
                        ? '0x' + editingCell.currentVal.toString(16).toUpperCase()
                        : editingCell.currentVal
                    );
                  }}
                  className={`flex-1 py-1 text-xs font-medium rounded ${
                    inputFormat === 'hex' ? 'bg-neutral-800 text-purple-300' : 'text-neutral-400'
                  }`}
                >
                  Thập lục phân (HEX)
                </button>
              </div>

              {/* Input field */}
              <div>
                <label className="text-xs text-neutral-400 block mb-1">
                  Nhập giá trị mới:
                </label>
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmitEdit();
                  }}
                  autoFocus
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={handleSubmitEdit}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition shadow-sm"
                >
                  Áp dụng giá trị
                </button>
                <button
                  onClick={() => setEditingCell(null)}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 text-xs rounded-lg"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-neutral-500">
              Nhấp vào bất kỳ ô nào trên bảng hoặc Hex dump để thay đổi giá trị.
            </div>
          )}

          {/* Preset Customization Info */}
          <div className="mt-auto pt-4 border-t border-neutral-800 space-y-2 text-xs text-neutral-400">
            <div className="flex items-center space-x-1.5 text-neutral-300 font-medium">
              <Info className="w-3.5 h-3.5 text-purple-400" />
              <span>Ghi chú cấu trúc</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              File <code className="text-purple-400 font-mono">/a</code> chứa toàn bộ cơ sở dữ liệu game: chỉ số máu, sát thương, giá vàng binh chủng. Thay đổi sẽ lập tức đồng bộ khi nhấn "Lưu vào game".
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
