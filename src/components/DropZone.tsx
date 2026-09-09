import React, { useRef, useState } from 'react';
import { Upload, FileArchive, Sparkles, ShieldAlert, CheckCircle2, FileCode } from 'lucide-react';

interface DropZoneProps {
  onFileLoaded: (file: File) => void;
  onLoadSample: () => void;
  isLoading: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFileLoaded,
  onLoadSample,
  isLoading,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.jar') || file.name.endsWith('.zip')) {
        onFileLoaded(file);
      } else {
        alert('Vui lòng chọn file định dạng .jar hoặc .zip');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileLoaded(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-4xl w-full mx-auto px-4 py-4 sm:py-6 select-none">
      <div className="text-center mb-5 sm:mb-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium mb-2 sm:mb-3">
          <FileArchive className="w-3.5 h-3.5" />
          <span>Java J2ME MIDP 2.0 Binary Editor</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-neutral-100 tracking-tight">
          Bolac JAR Game Studio
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto leading-relaxed">
          Web panel chỉnh sửa trực tiếp tài nguyên nhị phân bên trong file JAR game Bolac:
          Map (/ma), Sprite pack (/pi0, /pi8, /pi9), Text hội thoại (/0..4) và Game Config (/a).
        </p>
      </div>

      {/* Main Drop Area */}
      <div
        id="jar-drop-area"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-950/50'
            : 'border-neutral-700 hover:border-neutral-500 bg-neutral-900/60 hover:bg-neutral-900/90'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jar,.zip"
          onChange={handleFileInputChange}
          className="hidden"
          id="jar-file-input"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-emerald-400 shadow-inner group-hover:scale-105 transition-transform">
            <Upload className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>

          <div>
            <p className="text-sm sm:text-base font-semibold text-neutral-200">
              Kéo thả file <span className="text-emerald-400 font-mono">bolac.jar</span> vào đây, hoặc{' '}
              <span className="text-emerald-400 underline underline-offset-4">chọn từ máy tính</span>
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Hỗ trợ đầy đủ định dạng JAR (Java Archive) chuẩn J2ME MIDP 2.0
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-1">
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-neutral-800/80 border border-neutral-700/80 text-[11px] font-mono text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>/ma (Map grid)</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-neutral-800/80 border border-neutral-700/80 text-[11px] font-mono text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              <span>/pi0, /pi8, /pi9 (Sprites)</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-neutral-800/80 border border-neutral-700/80 text-[11px] font-mono text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>/0..4 (Text thoại)</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-neutral-800/80 border border-neutral-700/80 text-[11px] font-mono text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              <span>/a (Config DB)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Alternative: Load Sample Bolac Archive */}
      <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-neutral-900/40 border border-neutral-800">
        <div className="flex items-center space-x-3 text-left">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-neutral-200">
              Chưa có file bolac.jar ngay trên máy?
            </h3>
            <p className="text-[11px] sm:text-xs text-neutral-400">
              Mở ngay cấu trúc mẫu giả lập Bolac J2ME với đầy đủ Map 24x18, Sprite Pack PNG, Text Tiếng Việt và Config table.
            </p>
          </div>
        </div>
        <button
          id="btn-load-sample-jar"
          onClick={onLoadSample}
          disabled={isLoading}
          className="w-full sm:w-auto px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-semibold rounded-lg border border-neutral-700 transition flex items-center justify-center space-x-2 whitespace-nowrap shadow-sm shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Khởi tạo Bolac mẫu</span>
        </button>
      </div>

      {/* Resource Spec Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4 sm:mt-6">
        <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800">
          <div className="text-xs font-mono font-bold text-emerald-400 mb-0.5">/ma</div>
          <div className="text-xs sm:text-sm font-semibold text-neutral-200">Map Editor</div>
          <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
            Đọc tilemap nhị phân, vẽ tile trực tiếp bằng bút vẽ, đổ thùng sơn, tự động tính header dimensions.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800">
          <div className="text-xs font-mono font-bold text-sky-400 mb-0.5">/pi0, /pi8, /pi9</div>
          <div className="text-xs sm:text-sm font-semibold text-neutral-200">Sprite Pack</div>
          <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
            Quét mã ký hiệu PNG, tách ảnh lẻ, xem chi tiết pixel zoom và đóng gói lại đúng chuẩn nén.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800">
          <div className="text-xs font-mono font-bold text-amber-400 mb-0.5">/0, /1, /2, /3, /4</div>
          <div className="text-xs sm:text-sm font-semibold text-neutral-200">Text & Tutorial</div>
          <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
            Đọc chuỗi ký tự UTF-8 (2-byte length-prefix hoặc null-term), tìm kiếm nhanh và lưu chuẩn encode.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800">
          <div className="text-xs font-mono font-bold text-purple-400 mb-0.5">/a</div>
          <div className="text-xs sm:text-sm font-semibold text-neutral-200">Game Database</div>
          <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
            Xem bảng nhị phân dạng Hex/Dec, cấu trúc theo record HP, Damage, Armor, Cost cho binh chủng.
          </p>
        </div>
      </div>
    </div>
  );
};
