import { ExtractedSprite, MapData, TextEntry } from '../types/game';

/**
 * Binary Utilities for Bolac J2ME Resources
 */

// ================= MAP PARSING & PACKING =================

/**
 * Tries to auto-detect map dimensions and header from raw bytes of /ma
 */
export function parseMapBinary(bytes: Uint8Array, filePath: string): MapData {
  const len = bytes.length;
  if (len === 0) {
    return {
      filePath,
      headerOffset: 0,
      width: 16,
      height: 16,
      bytesPerTile: 1,
      tiles: new Array(256).fill(0),
      headerBytes: new Uint8Array(0),
    };
  }

  // Common J2ME Map Header formats:
  // Pattern 1: [w (1 byte), h (1 byte), ...tiles (w*h bytes)]
  if (len > 2) {
    const w1 = bytes[0];
    const h1 = bytes[1];
    if (w1 > 0 && h1 > 0 && w1 * h1 <= len - 2 && Math.abs(w1 * h1 - (len - 2)) < 64) {
      const tiles: number[] = [];
      for (let i = 0; i < w1 * h1; i++) {
        tiles.push(bytes[2 + i] || 0);
      }
      return {
        filePath,
        headerOffset: 2,
        width: w1,
        height: h1,
        bytesPerTile: 1,
        tiles,
        headerBytes: bytes.slice(0, 2),
        extraBytes: bytes.length > 2 + w1 * h1 ? bytes.slice(2 + w1 * h1) : undefined,
      };
    }
  }

  // Pattern 2: [w (2 bytes BE), h (2 bytes BE), ...tiles]
  if (len > 4) {
    const w2 = (bytes[0] << 8) | bytes[1];
    const h2 = (bytes[2] << 8) | bytes[3];
    if (w2 > 0 && h2 > 0 && w2 < 500 && h2 < 500 && w2 * h2 <= len - 4) {
      const tiles: number[] = [];
      for (let i = 0; i < w2 * h2; i++) {
        tiles.push(bytes[4 + i] || 0);
      }
      return {
        filePath,
        headerOffset: 4,
        width: w2,
        height: h2,
        bytesPerTile: 1,
        tiles,
        headerBytes: bytes.slice(0, 4),
        extraBytes: bytes.length > 4 + w2 * h2 ? bytes.slice(4 + w2 * h2) : undefined,
      };
    }
  }

  // Fallback: Default reasonable dimensions (e.g. standard J2ME screen / map tile sizes)
  // Check common square/rectangular dimensions
  const candidates = [32, 24, 20, 16, 12, 10, 8, 40, 48, 50, 64];
  let bestW = 20;
  for (const c of candidates) {
    if (len % c === 0 && len / c >= 4 && len / c <= 128) {
      bestW = c;
      break;
    }
  }
  const calculatedHeight = Math.max(1, Math.floor(len / bestW));
  const tiles: number[] = [];
  for (let i = 0; i < bestW * calculatedHeight; i++) {
    tiles.push(bytes[i] || 0);
  }

  return {
    filePath,
    headerOffset: 0,
    width: bestW,
    height: calculatedHeight,
    bytesPerTile: 1,
    tiles,
    headerBytes: new Uint8Array(0),
    extraBytes: bytes.length > bestW * calculatedHeight ? bytes.slice(bestW * calculatedHeight) : undefined,
  };
}

/**
 * Serializes MapData back to binary format
 */
export function serializeMapBinary(map: MapData): Uint8Array {
  const tileCount = map.width * map.height;
  const tileBytesLength = tileCount * map.bytesPerTile;
  const extraLen = map.extraBytes ? map.extraBytes.length : 0;
  const totalLength = map.headerOffset + tileBytesLength + extraLen;

  const result = new Uint8Array(totalLength);

  // Copy or generate header
  if (map.headerOffset === 2) {
    result[0] = map.width & 0xff;
    result[1] = map.height & 0xff;
  } else if (map.headerOffset === 4) {
    result[0] = (map.width >> 8) & 0xff;
    result[1] = map.width & 0xff;
    result[2] = (map.height >> 8) & 0xff;
    result[3] = map.height & 0xff;
  } else if (map.headerBytes.length > 0) {
    result.set(map.headerBytes.slice(0, map.headerOffset), 0);
  }

  // Write tiles
  for (let i = 0; i < tileCount; i++) {
    const tileVal = map.tiles[i] || 0;
    if (map.bytesPerTile === 1) {
      result[map.headerOffset + i] = tileVal & 0xff;
    } else {
      result[map.headerOffset + i * 2] = (tileVal >> 8) & 0xff;
      result[map.headerOffset + i * 2 + 1] = tileVal & 0xff;
    }
  }

  // Copy extra bytes
  if (map.extraBytes && map.extraBytes.length > 0) {
    result.set(map.extraBytes, map.headerOffset + tileBytesLength);
  }

  return result;
}

// ================= SPRITE / PNG PACK PARSING & RE-PACKING =================

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const IEND_BYTES = [0x49, 0x45, 0x4e, 0x44]; // 'IEND'

/**
 * Extracts all embedded PNGs from a byte array (such as /pi0, /pi8, /pi9)
 */
export function extractSpritesFromPack(bytes: Uint8Array, fileName: string): ExtractedSprite[] {
  const sprites: ExtractedSprite[] = [];
  const len = bytes.length;

  for (let i = 0; i < len - 8; i++) {
    // Check for PNG Magic signature
    let match = true;
    for (let m = 0; m < 8; m++) {
      if (bytes[i + m] !== PNG_MAGIC[m]) {
        match = false;
        break;
      }
    }

    if (match) {
      const pngStart = i;
      let pngEnd = -1;
      let imgWidth = 0;
      let imgHeight = 0;

      // Extract IHDR width and height if available (offset 16-24 from PNG start)
      if (pngStart + 24 <= len) {
        // IHDR chunk: 4 bytes length, 4 bytes 'IHDR', 4 bytes width, 4 bytes height
        imgWidth =
          (bytes[pngStart + 16] << 24) |
          (bytes[pngStart + 17] << 16) |
          (bytes[pngStart + 18] << 8) |
          bytes[pngStart + 19];
        imgHeight =
          (bytes[pngStart + 20] << 24) |
          (bytes[pngStart + 21] << 16) |
          (bytes[pngStart + 22] << 8) |
          bytes[pngStart + 23];
      }

      // Search for IEND
      for (let j = pngStart + 8; j < len - 4; j++) {
        if (
          bytes[j] === IEND_BYTES[0] &&
          bytes[j + 1] === IEND_BYTES[1] &&
          bytes[j + 2] === IEND_BYTES[2] &&
          bytes[j + 3] === IEND_BYTES[3]
        ) {
          // PNG ends 4 bytes after IEND (CRC bytes)
          pngEnd = j + 4 + 4;
          break;
        }
      }

      if (pngEnd > pngStart && pngEnd <= len) {
        const spriteData = bytes.slice(pngStart, pngEnd);
        const blob = new Blob([spriteData], { type: 'image/png' });
        const blobUrl = URL.createObjectURL(blob);

        sprites.push({
          id: sprites.length,
          offset: pngStart,
          size: spriteData.length,
          width: imgWidth > 0 && imgWidth < 4096 ? imgWidth : 16,
          height: imgHeight > 0 && imgHeight < 4096 ? imgHeight : 16,
          data: spriteData,
          blobUrl,
          name: `${fileName}_sprite_${sprites.length}.png`,
        });

        // Fast forward search cursor
        i = pngEnd - 1;
      }
    }
  }

  return sprites;
}

/**
 * Re-packs sprites back into the original pack structure
 */
export function rebuildSpritePack(
  originalBytes: Uint8Array,
  sprites: ExtractedSprite[]
): Uint8Array {
  if (sprites.length === 0) return originalBytes;

  // Case A: Pure concatenated PNGs or leading header before first sprite
  const firstOffset = sprites[0].offset;
  const header = originalBytes.slice(0, firstOffset);

  // Combine all sprite data
  let totalSpritesSize = 0;
  for (const s of sprites) {
    totalSpritesSize += s.data.length;
  }

  const result = new Uint8Array(header.length + totalSpritesSize);
  result.set(header, 0);

  let currentOffset = header.length;
  for (const s of sprites) {
    result.set(s.data, currentOffset);
    currentOffset += s.data.length;
  }

  return result;
}

// ================= TEXT / LANGUAGE RESOURCE PARSING & PACKING =================

/**
 * Parses text strings from files like /0, /1, /2, /3, /4
 */
export function parseTextPack(bytes: Uint8Array): {
  entries: TextEntry[];
  format: 'utf-length-prefixed' | 'null-terminated' | 'plain-line';
} {
  const utfEntries = tryParseLengthPrefixedUTF(bytes);
  if (utfEntries.length >= 2) {
    return { entries: utfEntries, format: 'utf-length-prefixed' };
  }

  const nullEntries = tryParseNullTerminated(bytes);
  if (nullEntries.length >= 2) {
    return { entries: nullEntries, format: 'null-terminated' };
  }

  const lineEntries = tryParseLines(bytes);
  return { entries: lineEntries, format: 'plain-line' };
}

function tryParseLengthPrefixedUTF(bytes: Uint8Array): TextEntry[] {
  const entries: TextEntry[] = [];
  const len = bytes.length;
  let offset = 0;
  const decoder = new TextDecoder('utf-8', { fatal: false });

  // Optional: check if first 2 bytes are count of strings
  let startOffset = 0;
  if (len >= 2) {
    const potentialCount = (bytes[0] << 8) | bytes[1];
    if (potentialCount > 0 && potentialCount < 5000 && len > 4) {
      startOffset = 2;
    }
  }

  offset = startOffset;
  let index = 0;

  while (offset + 2 <= len) {
    const strLen = (bytes[offset] << 8) | bytes[offset + 1];
    if (strLen === 0) {
      entries.push({
        id: index,
        index,
        offset,
        length: 2,
        originalText: '',
        text: '',
        format: 'utf-length-prefixed',
      });
      offset += 2;
      index++;
      continue;
    }

    if (offset + 2 + strLen <= len) {
      const strSlice = bytes.slice(offset + 2, offset + 2 + strLen);
      // Check if it's printable text (rough validation)
      const decoded = decoder.decode(strSlice);
      const isReasonable = decoded.length > 0 && !/[\x00-\x08\x0E-\x1F]/.test(decoded);

      if (isReasonable) {
        entries.push({
          id: index,
          index,
          offset,
          length: 2 + strLen,
          originalText: decoded,
          text: decoded,
          format: 'utf-length-prefixed',
        });
        offset += 2 + strLen;
        index++;
        continue;
      }
    }
    // If not matching, stop
    break;
  }

  return entries;
}

function tryParseNullTerminated(bytes: Uint8Array): TextEntry[] {
  const entries: TextEntry[] = [];
  const decoder = new TextDecoder('utf-8', { fatal: false });
  let start = 0;
  let index = 0;

  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) {
      if (i > start) {
        const text = decoder.decode(bytes.slice(start, i));
        if (text.length > 0 && !/[\x01-\x08\x0E-\x1F]/.test(text)) {
          entries.push({
            id: index,
            index,
            offset: start,
            length: i - start + 1,
            originalText: text,
            text,
            format: 'null-terminated',
          });
          index++;
        }
      }
      start = i + 1;
    }
  }

  return entries;
}

function tryParseLines(bytes: Uint8Array): TextEntry[] {
  const entries: TextEntry[] = [];
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const lines = text.split(/\r?\n/);

  let curOffset = 0;
  lines.forEach((line, idx) => {
    entries.push({
      id: idx,
      index: idx,
      offset: curOffset,
      length: line.length,
      originalText: line,
      text: line,
      format: 'plain-line',
    });
    curOffset += line.length + 1;
  });

  return entries;
}

/**
 * Re-encodes text entries back to binary format
 */
export function serializeTextPack(
  originalBytes: Uint8Array,
  entries: TextEntry[],
  format: 'utf-length-prefixed' | 'null-terminated' | 'plain-line'
): Uint8Array {
  const encoder = new TextEncoder();

  if (format === 'utf-length-prefixed') {
    const chunks: Uint8Array[] = [];
    let totalLen = 0;

    // Preserve first 2 bytes if original had count header
    let hasCountHeader = false;
    if (originalBytes.length >= 2) {
      const firstShort = (originalBytes[0] << 8) | originalBytes[1];
      if (firstShort === entries.length || (firstShort > 0 && firstShort < 5000)) {
        hasCountHeader = true;
      }
    }

    if (hasCountHeader) {
      const countHeader = new Uint8Array([
        (entries.length >> 8) & 0xff,
        entries.length & 0xff,
      ]);
      chunks.push(countHeader);
      totalLen += 2;
    }

    for (const item of entries) {
      const encoded = encoder.encode(item.text);
      const header = new Uint8Array([
        (encoded.length >> 8) & 0xff,
        encoded.length & 0xff,
      ]);
      chunks.push(header, encoded);
      totalLen += 2 + encoded.length;
    }

    const out = new Uint8Array(totalLen);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.length;
    }
    return out;
  }

  if (format === 'null-terminated') {
    const chunks: Uint8Array[] = [];
    let totalLen = 0;
    for (const item of entries) {
      const encoded = encoder.encode(item.text);
      chunks.push(encoded, new Uint8Array([0]));
      totalLen += encoded.length + 1;
    }
    const out = new Uint8Array(totalLen);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.length;
    }
    return out;
  }

  // Plain lines
  const combined = entries.map(e => e.text).join('\n');
  return encoder.encode(combined);
}

// ================= HEX & BINARY CONFIG UTILITIES =================

export function formatHexByte(val: number): string {
  return (val & 0xff).toString(16).padStart(2, '0').toUpperCase();
}

export function formatHexOffset(offset: number): string {
  return '0x' + offset.toString(16).padStart(4, '0').toUpperCase();
}

export function getAsciiChar(byte: number): string {
  return byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
}

export function readValue(
  bytes: Uint8Array,
  offset: number,
  type: 'u8' | 'i8' | 'u16be' | 'u16le' | 'u32be' | 'string'
): number | string {
  if (offset >= bytes.length) return 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  switch (type) {
    case 'u8':
      return bytes[offset];
    case 'i8':
      return view.getInt8(offset);
    case 'u16be':
      return offset + 1 < bytes.length ? view.getUint16(offset, false) : 0;
    case 'u16le':
      return offset + 1 < bytes.length ? view.getUint16(offset, true) : 0;
    case 'u32be':
      return offset + 3 < bytes.length ? view.getUint32(offset, false) : 0;
    case 'string': {
      let end = offset;
      while (end < bytes.length && bytes[end] !== 0 && end - offset < 32) {
        end++;
      }
      return new TextDecoder().decode(bytes.slice(offset, end));
    }
    default:
      return bytes[offset];
  }
}

export function writeValue(
  bytes: Uint8Array,
  offset: number,
  type: 'u8' | 'i8' | 'u16be' | 'u16le' | 'u32be' | 'string',
  value: number | string
): Uint8Array {
  const result = new Uint8Array(bytes);
  const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
  const num = typeof value === 'number' ? value : parseInt(value, 10) || 0;

  switch (type) {
    case 'u8':
      if (offset < result.length) result[offset] = num & 0xff;
      break;
    case 'i8':
      if (offset < result.length) view.setInt8(offset, num);
      break;
    case 'u16be':
      if (offset + 1 < result.length) view.setUint16(offset, num, false);
      break;
    case 'u16le':
      if (offset + 1 < result.length) view.setUint16(offset, num, true);
      break;
    case 'u32be':
      if (offset + 3 < result.length) view.setUint32(offset, num, false);
      break;
    case 'string': {
      const strVal = String(value);
      const encoded = new TextEncoder().encode(strVal);
      for (let i = 0; i < encoded.length && offset + i < result.length; i++) {
        result[offset + i] = encoded[i];
      }
      break;
    }
  }

  return result;
}
