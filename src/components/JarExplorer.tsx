import React, { useState } from 'react';
import { JarFileEntry } from '../types/game';
import {
  Package,
  FileCode,
  Image,
  Map,
  FileText,
  Settings,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  FileCheck
} from 'lucide-react';

interface JarExplorerProps {
  files: Record<string, JarFileEntry>;
  jarName: string;
  onExportJar: () => void;
  onReplaceRawFile: (path: string, newBytes: Uint8Array) => void;
  isExporting: boolean;
}

export const JarExplorer: React.FC<JarExplorerProps> = ({
  files,
  jarName,
  onExportJar,
  onReplaceRawFile,
  isExporting,
}) => {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const fileList = Object.values(files) as JarFileEntry[];
  const modifiedFiles = fileList.filter((f) => f.isModified);

  const filteredList = fileList.filter((f) =>
    f.path.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const selectedFile = selectedPath ? files[selectedPath] : null;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileCategoryIcon = (path: string) => {
    if (path.includes('ma')) return <Map className="w-4 h-4 text-emerald-400" />;
    if (path.includes('pi') || path.endsWith('.png')) return <Image className="w-4 h-4 text-sky-400" />;
    if (['0', '1', '2', '3', '4'].some((p) => path.endsWith(p))) return <FileText className="w-4 h-4 text-amber-400" />;
    if (path === 'a' || path.endsWith('/a')) return <Settings className="w-4 h-4 text-purple-400" />;
    if (path.endsWith('.class')) return <FileCode className="w-4 h-4 text-neutral-400" />;
    return <Package className="w-4 h-4 text-neutral-500" />;
  };

  // Download single raw file
  const handleDownloadFile = (entry: JarFileEntry) => {
    const blob = new Blob([entry.data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = entry.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Replace single file via file input
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, path: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          onReplaceRawFile(path, new Uint8Array(reader.result));
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-neutral-950 overflow-hidden">
      
      {/* Top Banner / Summary */}
      <div className="bg-neutral-900 border-b border-neutral-800 p-4 sm:p-5 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-100 flex items-center space-x-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <span>JAR Builder & Cấu trúc File</span>
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700 font-mono">
                {jarName}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              Toàn bộ các file trong JAR được bảo toàn nguyên vẹn. Chỉ những tài nguyên bạn đã chỉnh sửa (Map, Sprite, Text, Config) được cập nhật dữ liệu mới khi xuất file.
            </p>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto shrink-0">
            <button
              id="btn-export-jar-builder"
              onClick={onExportJar}
              disabled={isExporting}
              className="w-full md:w-auto flex items-center justify-center space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-emerald-950/50 transition shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Đang đóng gói JAR...' : 'Export JAR Hoàn chỉnh'}</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-3 sm:mt-4">
          <div className="p-2.5 sm:p-3 bg-neutral-950/60 rounded-xl border border-neutral-800">
            <div className="text-[11px] sm:text-xs text-neutral-400">Tổng số file</div>
            <div className="text-base sm:text-lg font-bold text-neutral-100 font-mono">{fileList.length}</div>
          </div>

          <div className="p-2.5 sm:p-3 bg-neutral-950/60 rounded-xl border border-neutral-800">
            <div className="text-[11px] sm:text-xs text-neutral-400">Đã chỉnh sửa</div>
            <div className={`text-base sm:text-lg font-bold font-mono ${modifiedFiles.length > 0 ? 'text-amber-400' : 'text-neutral-500'}`}>
              {modifiedFiles.length} file
            </div>
          </div>

          <div className="p-2.5 sm:p-3 bg-neutral-950/60 rounded-xl border border-neutral-800">
            <div className="text-[11px] sm:text-xs text-neutral-400">Tài nguyên cốt lõi</div>
            <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono">
              {fileList.filter((f) => ['ma', 'a', 'pi0', 'pi8', 'pi9', '0', '1'].includes(f.name)).length} mục
            </div>
          </div>

          <div className="p-2.5 sm:p-3 bg-neutral-950/60 rounded-xl border border-neutral-800">
            <div className="text-[11px] sm:text-xs text-neutral-400">Trạng thái đóng gói</div>
            <div className="text-base sm:text-lg font-bold text-sky-400 flex items-center space-x-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Sẵn sàng</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Files Table */}
      <div className="flex-1 min-h-0 min-w-0 overflow-auto p-4 sm:p-6 max-w-6xl mx-auto w-full">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
          
          {/* Table Header Filter */}
          <div className="p-3 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
            <input
              type="text"
              placeholder="Tìm kiếm file theo tên (vd: ma, pi, .class)..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-neutral-950 border border-neutral-700 text-xs text-neutral-200 px-3 py-1.5 rounded-lg w-72 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-xs text-neutral-500 font-mono">
              Hiển thị {filteredList.length} file
            </span>
          </div>

          {/* Files List */}
          <div className="divide-y divide-neutral-800/60">
            {filteredList.map((entry) => {
              return (
                <div
                  key={entry.path}
                  className="p-3.5 flex items-center justify-between hover:bg-neutral-800/40 transition gap-4"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 shrink-0">
                      {getFileCategoryIcon(entry.path)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-neutral-200 font-mono truncate">
                          {entry.path}
                        </span>
                        {entry.isModified && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">
                            Đã sửa đổi
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 font-mono mt-0.5">
                        Dung lượng: {formatBytes(entry.size)}
                        {entry.originalSize !== entry.size && (
                          <span className="text-neutral-400"> (Gốc: {formatBytes(entry.originalSize)})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleDownloadFile(entry)}
                      title="Tải riêng file này"
                      className="p-2 text-neutral-400 hover:text-neutral-200 bg-neutral-800/60 hover:bg-neutral-800 rounded-lg border border-neutral-700/60 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <label
                      title="Nạp đè file từ máy tính"
                      className="p-2 text-neutral-400 hover:text-neutral-200 bg-neutral-800/60 hover:bg-neutral-800 rounded-lg border border-neutral-700/60 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        onChange={(e) => handleFileInput(e, entry.path)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

    </div>
  );
};
