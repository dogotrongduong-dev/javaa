import React, { useState, useEffect, useMemo } from 'react';
import { TextEntry } from '../types/game';
import { parseTextPack, serializeTextPack } from '../utils/j2meBinary';
import {
  FileText,
  Search,
  Save,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  SlidersHorizontal,
  Info,
  Download
} from 'lucide-react';

interface TextEditorProps {
  initialBytes: Uint8Array;
  filePath: string;
  onSaveToJar: (filePath: string, data: Uint8Array) => void;
  availableTextFiles: string[];
  onSelectTextFile: (filePath: string) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  initialBytes,
  filePath,
  onSaveToJar,
  availableTextFiles,
  onSelectTextFile,
}) => {
  const [entries, setEntries] = useState<TextEntry[]>([]);
  const [format, setFormat] = useState<'utf-length-prefixed' | 'null-terminated' | 'plain-line'>('utf-length-prefixed');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [isModified, setIsModified] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Parse when file or bytes change
  useEffect(() => {
    const parsed = parseTextPack(initialBytes);
    setEntries(parsed.entries);
    setFormat(parsed.format);
    setSelectedEntryId(parsed.entries.length > 0 ? parsed.entries[0].id : null);
    setIsModified(false);
  }, [initialBytes, filePath]);

  // Filtered entries based on search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.text.toLowerCase().includes(q) ||
        e.originalText.toLowerCase().includes(q) ||
        e.id.toString() === q
    );
  }, [entries, searchQuery]);

  const selectedEntry = entries.find((e) => e.id === selectedEntryId);

  // Update text for an entry
  const handleUpdateText = (id: number, newText: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, text: newText } : e))
    );
    setIsModified(true);
  };

  // Add new string entry
  const handleAddEntry = () => {
    const newId = entries.length > 0 ? Math.max(...entries.map((e) => e.id)) + 1 : 0;
    const newEntry: TextEntry = {
      id: newId,
      index: newId,
      offset: 0,
      length: 0,
      originalText: '',
      text: 'Chuỗi văn bản mới...',
      format,
    };
    setEntries((prev) => [...prev, newEntry]);
    setSelectedEntryId(newId);
    setIsModified(true);
  };

  // Delete an entry
  const handleDeleteEntry = (id: number) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (selectedEntryId === id) {
      setSelectedEntryId(entries.length > 1 ? entries[0].id : null);
    }
    setIsModified(true);
  };

  // Revert all to original
  const handleRevert = () => {
    const parsed = parseTextPack(initialBytes);
    setEntries(parsed.entries);
    setIsModified(false);
  };

  // Save changes directly back into the JAR
  const handleSaveToJar = () => {
    const binary = serializeTextPack(initialBytes, entries, format);
    onSaveToJar(filePath, binary);
    setIsModified(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Export as .txt
  const handleExportTxt = () => {
    const textContent = entries.map((e, idx) => `[${idx}] ${e.text}`).join('\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filePath.replace(/\//g, '_')}_strings.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-neutral-950 overflow-hidden">
      
      {/* Top Toolbar */}
      <div className="h-12 sm:h-14 bg-neutral-900 border-b border-neutral-800 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4 shrink-0">
        
        {/* Left: Text File Selector & Format */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <span className="text-xs font-semibold text-neutral-400">File:</span>
            <select
              id="text-file-select"
              value={filePath}
              onChange={(e) => onSelectTextFile(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500 font-mono h-8"
            >
              {availableTextFiles.map((f) => (
                <option key={f} value={f}>
                  {f} {f === '0' || f === '/0' ? '(Ngôn ngữ chính/0)' : ''}
                  {f === '1' || f === '/1' ? '(Ngôn ngữ phụ/1)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:flex items-center space-x-2 shrink-0">
            <span className="text-xs text-neutral-400">Định dạng:</span>
            <select
              value={format}
              onChange={(e) => {
                setFormat(e.target.value as any);
                setIsModified(true);
              }}
              className="bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-2 py-1 font-mono h-8"
            >
              <option value="utf-length-prefixed">J2ME UTF (2-byte length prefix)</option>
              <option value="null-terminated">Null-terminated UTF-8 (\0)</option>
              <option value="plain-line">Plain Text (Lines)</option>
            </select>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleAddEntry}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-lg border border-neutral-700 transition h-8"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Thêm chuỗi</span>
          </button>

          <button
            onClick={handleExportTxt}
            title="Xuất danh sách text ra file .txt"
            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg border border-neutral-700 transition h-8 flex items-center justify-center"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-save-text"
            onClick={handleSaveToJar}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition h-8 ${
              isModified
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-amber-300" />
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
      <div className="flex-1 min-h-0 min-w-0 flex overflow-hidden">
        
        {/* Left: String List with Search */}
        <div className="w-80 lg:w-96 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0 min-h-0">
          
          {/* Search box */}
          <div className="p-3 border-b border-neutral-800 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm nội dung chuỗi..."
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500 h-8"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2 px-1">
              <span>Hiển thị {filteredEntries.length} / {entries.length} chuỗi</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-amber-400 hover:underline text-[10px]"
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </div>

          {/* List of Strings */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-10 text-xs text-neutral-500">
                Không tìm thấy chuỗi nào phù hợp.
              </div>
            ) : (
              filteredEntries.map((entry, idx) => {
                const isSelected = selectedEntryId === entry.id;
                const isItemEdited = entry.text !== entry.originalText;
                return (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedEntryId(entry.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition ${
                      isSelected
                        ? 'bg-neutral-800 border-amber-500/70 shadow-sm'
                        : 'border-neutral-800/80 hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-neutral-400">
                        #{entry.id} {entry.offset > 0 ? `(0x${entry.offset.toString(16).toUpperCase()})` : ''}
                      </span>
                      {isItemEdited && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-medium">
                          Đã sửa
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-200 line-clamp-2 leading-relaxed">
                      {entry.text || <span className="text-neutral-500 italic">(Chuỗi rỗng)</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected String Editor */}
        <div className="flex-1 flex flex-col bg-neutral-950 overflow-y-auto p-6">
          {selectedEntry ? (
            <div className="max-w-2xl mx-auto w-full space-y-6">
              
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <div>
                  <h2 className="text-lg font-bold text-neutral-100 flex items-center space-x-2">
                    <span>Chuỗi #{selectedEntry.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono">
                      {new TextEncoder().encode(selectedEntry.text).length} bytes
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1 font-mono">
                    Offset gốc: 0x{selectedEntry.offset.toString(16).toUpperCase()} • Định dạng: {format}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteEntry(selectedEntry.id)}
                  className="p-2 text-neutral-500 hover:text-red-400 rounded-lg border border-neutral-800 hover:border-red-500/30 transition"
                  title="Xoá chuỗi này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Editable Text Area */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block">
                  Nội dung hiển thị trong game (UTF-8)
                </label>
                <textarea
                  rows={5}
                  value={selectedEntry.text}
                  onChange={(e) => handleUpdateText(selectedEntry.id, e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition leading-relaxed"
                  placeholder="Nhập nội dung mới cho chuỗi này..."
                />
              </div>

              {/* Original text comparison */}
              {selectedEntry.originalText !== selectedEntry.text && (
                <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-neutral-400">
                      Nội dung ban đầu trong file JAR:
                    </span>
                    <button
                      onClick={() => handleUpdateText(selectedEntry.id, selectedEntry.originalText)}
                      className="text-[11px] text-amber-400 hover:underline flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Khôi phục ban đầu</span>
                    </button>
                  </div>
                  <p className="text-xs text-neutral-400 font-mono italic bg-neutral-950 p-2 rounded border border-neutral-800/80">
                    {selectedEntry.originalText || '(Chuỗi rỗng)'}
                  </p>
                </div>
              )}

              {/* Byte representation */}
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                <span className="text-xs font-semibold text-neutral-400 block">
                  Mã hóa nhị phân UTF-8 (Hex dump)
                </span>
                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 font-mono text-xs text-neutral-400 break-all leading-relaxed">
                  {Array.from(new TextEncoder().encode(selectedEntry.text))
                    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
                    .join(' ') || '00'}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-neutral-900/30 border border-neutral-800 text-xs text-neutral-400 flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Game J2ME Bolac hỗ trợ đầy đủ font Unicode/UTF-8. Nhấn <strong>"Lưu vào game"</strong> trên thanh công cụ để cập nhật chuỗi trực tiếp vào file.
                </span>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-500 text-xs">
              Chọn một chuỗi từ danh sách bên trái để chỉnh sửa
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
