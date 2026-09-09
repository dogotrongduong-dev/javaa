import React from 'react';
import { 
  Map, 
  Image, 
  FileText, 
  Settings, 
  Package, 
  Download, 
  Upload, 
  Sparkles,
  Save
} from 'lucide-react';

export type TabType = 'map' | 'sprite' | 'text' | 'config' | 'explorer';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  fileName: string | null;
  fileSize: number;
  modifiedCount: number;
  onExportJar: () => void;
  onUploadClick: () => void;
  onLoadSample: () => void;
  isExporting: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  fileName,
  fileSize,
  modifiedCount,
  onExportJar,
  onUploadClick,
  onLoadSample,
  isExporting,
}) => {
  const tabs = [
    { id: 'map' as TabType, label: 'Map Editor', resource: '/ma', icon: Map },
    { id: 'sprite' as TabType, label: 'Sprite Editor', resource: '/pi0, /pi8, /pi9', icon: Image },
    { id: 'text' as TabType, label: 'Text Editor', resource: '/0..4', icon: FileText },
    { id: 'config' as TabType, label: 'Game Config', resource: '/a', icon: Settings },
    { id: 'explorer' as TabType, label: 'JAR Builder', resource: 'Files & Export', icon: Package },
  ];

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <header className="bg-neutral-900 border-b border-neutral-800 shrink-0 z-30 shadow-md select-none">
      <div className="w-full px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3 sm:gap-4">
          
          {/* Logo & Game Info */}
          <div className="flex items-center space-x-3 min-w-0 max-w-[260px] sm:max-w-xs md:max-w-sm shrink">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xs sm:text-sm tracking-wider shadow-inner shrink-0">
              J2ME
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-neutral-100 text-sm sm:text-base tracking-tight truncate">
                  Bolac Studio
                </span>
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.2 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 font-mono shrink-0">
                  MIDP 2.0
                </span>
              </div>
              {fileName ? (
                <div className="flex items-center space-x-1.5 text-xs text-neutral-400 truncate">
                  <span className="truncate text-neutral-300 font-medium">{fileName}</span>
                  <span>•</span>
                  <span className="shrink-0">{formatBytes(fileSize)}</span>
                  {modifiedCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-amber-400 font-medium shrink-0">
                        {modifiedCount} đã sửa
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <span className="text-xs text-neutral-500">Chưa mở file JAR</span>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          {fileName && (
            <nav className="hidden md:flex items-center space-x-1 bg-neutral-950/80 p-1 rounded-xl border border-neutral-800 shrink-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`nav-tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-1.5 lg:space-x-2 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-neutral-800 text-emerald-400 shadow-sm border border-neutral-700/60'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-neutral-400'}`} />
                    <span>{tab.label}</span>
                    <span className="text-[10px] font-mono opacity-50 hidden xl:inline">
                      {tab.resource.split(',')[0]}
                    </span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-2 shrink-0">
            {!fileName ? (
              <button
                id="btn-load-sample-nav"
                onClick={onLoadSample}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Mở Bolac mẫu</span>
              </button>
            ) : (
              <>
                <button
                  id="btn-switch-jar"
                  onClick={onUploadClick}
                  title="Tải lên file JAR khác"
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-lg border border-neutral-700 transition whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đổi JAR</span>
                </button>

                <button
                  id="btn-export-jar"
                  onClick={onExportJar}
                  disabled={isExporting}
                  className={`flex items-center space-x-2 px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition shadow-sm whitespace-nowrap ${
                    modifiedCount > 0
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40 ring-1 ring-emerald-400/50'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                  }`}
                >
                  {isExporting ? (
                    <Save className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Export JAR</span>
                  {modifiedCount > 0 && (
                    <span className="bg-emerald-950 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded-full border border-emerald-700">
                      {modifiedCount}
                    </span>
                  )}
                </button>
              </>
            )}
          </div>

        </div>

        {/* Mobile Sub-Navigation Bar */}
        {fileName && (
          <div className="md:hidden flex items-center space-x-1 overflow-x-auto py-2 border-t border-neutral-800/80 no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
