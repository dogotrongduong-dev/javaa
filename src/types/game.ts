/**
 * Types for Bolac J2ME Game Editor
 */

export interface JarFileEntry {
  path: string;
  name: string;
  size: number;
  originalSize: number;
  data: Uint8Array;
  isModified: boolean;
  isDir: boolean;
  date?: Date;
}

export interface MapData {
  filePath: string;
  headerOffset: number;
  width: number;
  height: number;
  bytesPerTile: 1 | 2;
  tiles: number[]; // Flat array of width * height
  headerBytes: Uint8Array;
  extraBytes?: Uint8Array; // Any trailing bytes
}

export interface ExtractedSprite {
  id: number;
  offset: number;
  size: number;
  width: number;
  height: number;
  data: Uint8Array;
  blobUrl: string;
  name: string;
}

export interface SpritePack {
  filePath: string;
  sprites: ExtractedSprite[];
  rawBytes: Uint8Array;
}

export interface TextEntry {
  id: number;
  index: number;
  offset: number;
  length: number;
  originalText: string;
  text: string;
  format: 'utf-length-prefixed' | 'null-terminated' | 'plain-line';
}

export interface TextPack {
  filePath: string;
  entries: TextEntry[];
  format: 'utf-length-prefixed' | 'null-terminated' | 'plain-line';
  rawBytes: Uint8Array;
}

export interface ConfigFieldSchema {
  id: string;
  name: string;
  offsetInRecord: number;
  type: 'u8' | 'i8' | 'u16be' | 'u16le' | 'u32be' | 'string';
  description?: string;
  color?: string;
}

export interface ConfigPreset {
  id: string;
  name: string;
  recordSize: number;
  fields: ConfigFieldSchema[];
}
