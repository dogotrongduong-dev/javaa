/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { JarFileEntry } from './types/game';
import { generateSampleBolacJar } from './utils/sampleBolac';
import { Navbar, TabType } from './components/Navbar';
import { DropZone } from './components/DropZone';
import { MapEditor } from './components/MapEditor';
import { SpriteEditor } from './components/SpriteEditor';
import { TextEditor } from './components/TextEditor';
import { ConfigEditor } from './components/ConfigEditor';
import { JarExplorer } from './components/JarExplorer';
import { CheckCircle, AlertCircle, Info, Sparkles } from 'lucide-react';

export default function App() {
  const [jarFileName, setJarFileName] = useState<string | null>(null);
  const [jarFileSize, setJarFileSize] = useState<number>(0);
  const [jarEntries, setJarEntries] = useState<Record<string, JarFileEntry>>({});
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Active resource file paths for each editor
  const [selectedMapPath, setSelectedMapPath] = useState<string>('');
  const [selectedSpritePath, setSelectedSpritePath] = useState<string>('');
  const [selectedTextPath, setSelectedTextPath] = useState<string>('');
  const [selectedConfigPath, setSelectedConfigPath] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Process a raw buffer and extract all JAR entries
  const loadJarBuffer = async (name: string, buffer: Uint8Array) => {
    setIsLoading(true);
    try {
      const zip = await JSZip.loadAsync(buffer);
      const entries: Record<string, JarFileEntry> = {};

      const filePromises: Promise<void>[] = [];
      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          const p = zipEntry.async('uint8array').then((data) => {
            // Clean path
            const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
            entries[cleanPath] = {
              path: cleanPath,
              name: cleanPath.split('/').pop() || cleanPath,
              size: data.length,
              originalSize: data.length,
              data,
              isModified: false,
              isDir: false,
              date: zipEntry.date,
            };
          });
          filePromises.push(p);
        }
      });

      await Promise.all(filePromises);

      const allPaths = Object.keys(entries);

      // Auto-detect resources for Bolac
      // 1. Map: /ma or ma or contains 'ma'
      const mapCandidate =
        allPaths.find((p) => p === 'ma' || p === '/ma' || p.endsWith('/ma')) ||
        allPaths.find((p) => p.toLowerCase().includes('map')) ||
        allPaths[0] ||
        '';
      setSelectedMapPath(mapCandidate);

      // 2. Sprites: /pi0, /pi8, /pi9, or png
      const spriteCandidate =
        allPaths.find((p) => ['pi0', 'pi8', 'pi9'].includes(p)) ||
        allPaths.find((p) => p.includes('pi')) ||
        allPaths.find((p) => p.endsWith('.png')) ||
        allPaths[0] ||
        '';
      setSelectedSpritePath(spriteCandidate);

      // 3. Text: /0..4/
      const textCandidate =
        allPaths.find((p) => ['0', '1', '2', '3', '4'].includes(p)) ||
        allPaths.find((p) => p.includes('text') || p.includes('lang')) ||
        allPaths[0] ||
        '';
      setSelectedTextPath(textCandidate);

      // 4. Config: /a
      const configCandidate =
        allPaths.find((p) => p === 'a' || p === '/a' || p.endsWith('/a')) ||
        allPaths.find((p) => p.includes('config')) ||
        allPaths[0] ||
        '';
      setSelectedConfigPath(configCandidate);

      setJarFileName(name);
      setJarFileSize(buffer.length);
      setJarEntries(entries);
      setActiveTab('map');
      showToast(`Đã mở thành công file JAR "${name}" (${allPaths.length} files)`);
    } catch (err: any) {
      console.error('Lỗi khi đọc file JAR:', err);
      showToast(`Lỗi giải nén file JAR: ${err?.message || 'File không hợp lệ'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Upload user's JAR file
  const handleFileLoaded = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    await loadJarBuffer(file.name, new Uint8Array(arrayBuffer));
  };

  // Load sample Bolac JAR directly
  const handleLoadSample = async () => {
    setIsLoading(true);
    try {
      const sampleBuffer = await generateSampleBolacJar();
      await loadJarBuffer('bolac_sample.jar', sampleBuffer);
    } catch (err: any) {
      console.error(err);
      showToast('Không thể tạo file Bolac mẫu', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Save modified resource back into in-memory JAR state
  const handleSaveToJar = (path: string, newBytes: Uint8Array) => {
    setJarEntries((prev) => {
      const existing = prev[path];
      const updatedEntry: JarFileEntry = {
        path,
        name: existing ? existing.name : path.split('/').pop() || path,
        size: newBytes.length,
        originalSize: existing ? existing.originalSize : newBytes.length,
        data: newBytes,
        isModified: true,
        isDir: false,
      };
      return {
        ...prev,
        [path]: updatedEntry,
      };
    });
    showToast(`Đã lưu thay đổi vào file "${path}"`);
  };

  // Export updated JAR
  const handleExportJar = async () => {
    if (!jarFileName || Object.keys(jarEntries).length === 0) return;
    setIsExporting(true);
    try {
      const zip = new JSZip();

      // Add all entries (preserves all original and replaces modified ones)
      for (const [path, entry] of Object.entries(jarEntries) as [string, JarFileEntry][]) {
        zip.file(path, entry.data, {
          date: entry.date || new Date(),
        });
      }

      // Generate JAR archive
      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/java-archive',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      });

      // Trigger browser download
      const exportName = jarFileName.endsWith('.jar')
        ? jarFileName.replace('.jar', '_mod.jar')
        : `${jarFileName}_mod.jar`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`Đã xuất file ${exportName} thành công!`);
    } catch (err: any) {
      console.error('Lỗi khi xuất JAR:', err);
      showToast('Lỗi khi xuất file JAR', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Lists of available files for dropdowns
  const allFilePaths = Object.keys(jarEntries);

  const availableMapFiles = allFilePaths.filter(
    (p) => p === 'ma' || p.includes('ma') || p.includes('map')
  );
  if (availableMapFiles.length === 0 && allFilePaths.length > 0) {
    availableMapFiles.push(allFilePaths[0]);
  }

  const availableSpriteFiles = allFilePaths.filter(
    (p) =>
      ['pi0', 'pi8', 'pi9'].includes(p) ||
      p.includes('pi') ||
      p.endsWith('.png') ||
      p.endsWith('.jpg')
  );
  if (availableSpriteFiles.length === 0 && allFilePaths.length > 0) {
    availableSpriteFiles.push(allFilePaths[0]);
  }

  const availableTextFiles = allFilePaths.filter(
    (p) =>
      ['0', '1', '2', '3', '4'].includes(p) ||
      p.includes('text') ||
      p.includes('lang') ||
      p.endsWith('.txt')
  );
  if (availableTextFiles.length === 0 && allFilePaths.length > 0) {
    availableTextFiles.push(allFilePaths[0]);
  }

  const availableConfigFiles = allFilePaths.filter(
    (p) => p === 'a' || p.endsWith('/a') || p.includes('config') || p.includes('data')
  );
  if (availableConfigFiles.length === 0 && allFilePaths.length > 0) {
    availableConfigFiles.push(allFilePaths[0]);
  }

  const modifiedCount = (Object.values(jarEntries) as JarFileEntry[]).filter((e) => e.isModified).length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* Hidden file input for switching JAR */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jar,.zip"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileLoaded(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fileName={jarFileName}
        fileSize={jarFileSize}
        modifiedCount={modifiedCount}
        onExportJar={handleExportJar}
        onUploadClick={() => fileInputRef.current?.click()}
        onLoadSample={handleLoadSample}
        isExporting={isExporting}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-medium backdrop-blur-md ${
              toastMessage.type === 'error'
                ? 'bg-red-950/90 border-red-800 text-red-200'
                : 'bg-emerald-950/90 border-emerald-700/80 text-emerald-200 shadow-emerald-950/50'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {!jarFileName ? (
          /* Empty / Upload State */
          <div className="flex-1 flex items-center justify-center p-4">
            <DropZone
              onFileLoaded={handleFileLoaded}
              onLoadSample={handleLoadSample}
              isLoading={isLoading}
            />
          </div>
        ) : (
          /* Editor Tabs */
          <div className="flex-1 flex flex-col">
            {activeTab === 'map' && (
              <MapEditor
                key={selectedMapPath}
                initialBytes={jarEntries[selectedMapPath]?.data || new Uint8Array(0)}
                filePath={selectedMapPath}
                onSaveToJar={handleSaveToJar}
                availableMapFiles={availableMapFiles}
                onSelectMapFile={setSelectedMapPath}
              />
            )}

            {activeTab === 'sprite' && (
              <SpriteEditor
                key={selectedSpritePath}
                initialBytes={jarEntries[selectedSpritePath]?.data || new Uint8Array(0)}
                filePath={selectedSpritePath}
                onSaveToJar={handleSaveToJar}
                availableSpriteFiles={availableSpriteFiles}
                onSelectSpriteFile={setSelectedSpritePath}
              />
            )}

            {activeTab === 'text' && (
              <TextEditor
                key={selectedTextPath}
                initialBytes={jarEntries[selectedTextPath]?.data || new Uint8Array(0)}
                filePath={selectedTextPath}
                onSaveToJar={handleSaveToJar}
                availableTextFiles={availableTextFiles}
                onSelectTextFile={setSelectedTextPath}
              />
            )}

            {activeTab === 'config' && (
              <ConfigEditor
                key={selectedConfigPath}
                initialBytes={jarEntries[selectedConfigPath]?.data || new Uint8Array(0)}
                filePath={selectedConfigPath}
                onSaveToJar={handleSaveToJar}
                availableConfigFiles={availableConfigFiles}
                onSelectConfigFile={setSelectedConfigPath}
              />
            )}

            {activeTab === 'explorer' && (
              <JarExplorer
                files={jarEntries}
                jarName={jarFileName}
                onExportJar={handleExportJar}
                onReplaceRawFile={handleSaveToJar}
                isExporting={isExporting}
              />
            )}
          </div>
        )}
      </main>

    </div>
  );
}
