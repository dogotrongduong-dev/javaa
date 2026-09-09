import JSZip from 'jszip';

/**
 * Creates a valid 16x16 PNG binary buffer using an HTML5 offscreen canvas
 */
async function createSamplePng(color: string, label: string): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;

  // Fill background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 16, 16);

  // Border
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.strokeRect(0, 0, 16, 16);

  // Inner detail
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 8, 8);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  );

  if (!blob) return new Uint8Array(0);
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Generates an authentic sample Bolac J2ME JAR archive for demonstration and testing
 */
export async function generateSampleBolacJar(): Promise<Uint8Array> {
  const zip = new JSZip();

  // 1. META-INF/MANIFEST.MF
  const manifest = [
    'Manifest-Version: 1.0',
    'MIDlet-1: Bolac, /icon.png, BolacMIDlet',
    'MIDlet-Name: Bolac',
    'MIDlet-Vendor: Bolac Studio J2ME',
    'MIDlet-Version: 1.2.0',
    'MicroEdition-Configuration: CLDC-1.1',
    'MicroEdition-Profile: MIDP-2.0',
    'MIDlet-Description: Chiến thuật thời gian thực trên J2ME Bolac',
    '',
  ].join('\r\n');
  zip.file('META-INF/MANIFEST.MF', manifest);

  // 2. Map file: /ma (24 columns x 18 rows)
  // Header: 2 bytes [w=24, h=18]
  const mapW = 24;
  const mapH = 18;
  const mapBuffer = new Uint8Array(2 + mapW * mapH);
  mapBuffer[0] = mapW;
  mapBuffer[1] = mapH;

  // Generate nice terrain tile grid
  // 0 = Cỏ (Grass), 1 = Nước (Water), 2 = Cây (Forest), 3 = Núi (Mountain), 4 = Đường đất (Road), 5 = Thành trì/Nhà (Base)
  for (let y = 0; y < mapH; y++) {
    for (let x = 0; x < mapW; x++) {
      let tile = 0; // Grass default
      // River running through
      if (Math.abs(x - (y + 3)) <= 1 || (x === 12 && y > 6)) {
        tile = 1; // Water
      } else if (y === 0 || y === mapH - 1 || x === 0 || x === mapW - 1) {
        tile = 3; // Mountain border
      } else if ((x === 4 && y === 4) || (x === 19 && y === 13)) {
        tile = 5; // Base / Fortress
      } else if ((x > 14 && x < 18 && y > 2 && y < 6) || (x > 3 && x < 8 && y > 10 && y < 14)) {
        tile = 2; // Forest
      } else if ((x >= 4 && x <= 19 && y === 9) || (x === 9 && y >= 4 && y <= 14)) {
        tile = 4; // Road
      }
      mapBuffer[2 + y * mapW + x] = tile;
    }
  }
  zip.file('ma', mapBuffer);

  // 3. Sprite packs: /pi0, /pi8, /pi9
  // Create sample sprites and concatenate them
  const colors = [
    { color: '#4ade80', label: 'T0' }, // Tile 0: Grass
    { color: '#38bdf8', label: 'T1' }, // Tile 1: Water
    { color: '#15803d', label: 'T2' }, // Tile 2: Forest
    { color: '#78716c', label: 'T3' }, // Tile 3: Rock
    { color: '#d97706', label: 'T4' }, // Tile 4: Path
    { color: '#ef4444', label: 'T5' }, // Tile 5: Castle
  ];

  const pngBuffers: Uint8Array[] = [];
  for (const c of colors) {
    pngBuffers.push(await createSamplePng(c.color, c.label));
  }

  // Concatenate for /pi0
  const totalLen0 = pngBuffers.reduce((acc, b) => acc + b.length, 0);
  const pi0Buffer = new Uint8Array(totalLen0);
  let curOffset = 0;
  for (const b of pngBuffers) {
    pi0Buffer.set(b, curOffset);
    curOffset += b.length;
  }
  zip.file('pi0', pi0Buffer);

  // /pi8 (Unit sprites: Warrior, Archer, Knight, Mage)
  const unitColors = [
    { color: '#dc2626', label: 'W' },
    { color: '#2563eb', label: 'A' },
    { color: '#ca8a04', label: 'K' },
    { color: '#7c3aed', label: 'M' },
  ];
  const unitPngs: Uint8Array[] = [];
  for (const u of unitColors) {
    unitPngs.push(await createSamplePng(u.color, u.label));
  }
  const totalLen8 = unitPngs.reduce((acc, b) => acc + b.length, 0);
  const pi8Buffer = new Uint8Array(totalLen8);
  curOffset = 0;
  for (const b of unitPngs) {
    pi8Buffer.set(b, curOffset);
    curOffset += b.length;
  }
  zip.file('pi8', pi8Buffer);

  // /pi9 (Icons & UI sprites)
  const iconColors = [
    { color: '#eab308', label: '$' },
    { color: '#06b6d4', label: 'HP' },
    { color: '#ec4899', label: 'LV' },
  ];
  const iconPngs: Uint8Array[] = [];
  for (const ic of iconColors) {
    iconPngs.push(await createSamplePng(ic.color, ic.label));
  }
  const totalLen9 = iconPngs.reduce((acc, b) => acc + b.length, 0);
  const pi9Buffer = new Uint8Array(totalLen9);
  curOffset = 0;
  for (const b of iconPngs) {
    pi9Buffer.set(b, curOffset);
    curOffset += b.length;
  }
  zip.file('pi9', pi9Buffer);

  // 4. Text / Language files: /0 (Tiếng Việt) & /1 (English)
  // Length-prefixed UTF format (count header: 2 bytes, then for each string: 2 bytes length + UTF-8 bytes)
  const viStrings = [
    'Bolac - Chiến Vương Vùng Bolac',
    'Nhiệm vụ 1: Chiếm lĩnh tiền đồn phía Đông',
    'Binh sĩ: Chiến binh rực lửa',
    'Cung thủ: Thiện xạ ngắm bắn xa',
    'Kỵ binh: Tốc độ cơ động cao',
    'Pháp sư: Sát thương phép diện rộng',
    'Lâu đài: Nơi chiêu mộ quân lực và phòng thủ',
    'Đã tiêu diệt toàn bộ quân địch! Chiến thắng vẻ vang.',
    'Cảnh báo: Lâu đài chính đang bị tấn công!',
    'Vàng tích luỹ không đủ để chiêu mộ.',
  ];

  const enStrings = [
    'Bolac - King of Battle',
    'Mission 1: Capture the Eastern Outpost',
    'Unit: Flame Warrior',
    'Archer: Long range sniper',
    'Cavalry: Fast assault mobile unit',
    'Mage: Area of effect magic damage',
    'Castle: Headquarters for recruit and defense',
    'All enemy units eliminated! Victory!',
    'Warning: Main castle is under attack!',
    'Not enough gold to recruit unit.',
  ];

  function encodeUTFStrings(strings: string[]): Uint8Array {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    let total = 2; // Count header
    chunks.push(new Uint8Array([(strings.length >> 8) & 0xff, strings.length & 0xff]));

    for (const s of strings) {
      const b = encoder.encode(s);
      chunks.push(new Uint8Array([(b.length >> 8) & 0xff, b.length & 0xff]));
      chunks.push(b);
      total += 2 + b.length;
    }

    const res = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      res.set(c, off);
      off += c.length;
    }
    return res;
  }

  zip.file('0', encodeUTFStrings(viStrings));
  zip.file('1', encodeUTFStrings(enStrings));

  // 5. Config/Database file: /a
  // 12 records, each 16 bytes:
  // Offset +0: Unit/Entity ID (u8)
  // Offset +1: Entity Type (0=Infantry, 1=Ranged, 2=Cavalry, 3=Mage, 4=Building) (u8)
  // Offset +2..3: Base HP (u16be)
  // Offset +4..5: Base Attack / Damage (u16be)
  // Offset +6..7: Base Defense / Armor (u16be)
  // Offset +8..9: Gold Cost (u16be)
  // Offset +10: Move Speed / Range (u8)
  // Offset +11: Attack Speed (u8)
  // Offset +12..15: Reserved flags / Exp reward (u32be)
  const recordCount = 10;
  const recordSize = 16;
  const configBuffer = new Uint8Array(recordCount * recordSize);
  const configView = new DataView(configBuffer.buffer);

  const unitsData = [
    { id: 1, type: 0, hp: 450, atk: 48, def: 25, cost: 80, spd: 3, asp: 20 },
    { id: 2, type: 1, hp: 320, atk: 62, def: 14, cost: 110, spd: 3, asp: 25 },
    { id: 3, type: 2, hp: 600, atk: 55, def: 35, cost: 175, spd: 5, asp: 18 },
    { id: 4, type: 3, hp: 280, atk: 88, def: 10, cost: 220, spd: 2, asp: 15 },
    { id: 5, type: 4, hp: 2500, atk: 0, def: 80, cost: 500, spd: 0, asp: 0 },
    { id: 6, type: 4, hp: 1200, atk: 40, def: 45, cost: 300, spd: 0, asp: 30 },
    { id: 7, type: 0, hp: 700, atk: 75, def: 40, cost: 200, spd: 3, asp: 22 },
    { id: 8, type: 1, hp: 450, atk: 95, def: 20, cost: 250, spd: 4, asp: 28 },
    { id: 9, type: 2, hp: 950, atk: 85, def: 50, cost: 350, spd: 6, asp: 20 },
    { id: 10, type: 3, hp: 400, atk: 140, def: 18, cost: 420, spd: 2, asp: 16 },
  ];

  unitsData.forEach((u, i) => {
    const base = i * recordSize;
    configBuffer[base + 0] = u.id;
    configBuffer[base + 1] = u.type;
    configView.setUint16(base + 2, u.hp, false);
    configView.setUint16(base + 4, u.atk, false);
    configView.setUint16(base + 6, u.def, false);
    configView.setUint16(base + 8, u.cost, false);
    configBuffer[base + 10] = u.spd;
    configBuffer[base + 11] = u.asp;
    configView.setUint32(base + 12, 0x00010000 + i * 50, false);
  });

  zip.file('a', configBuffer);

  // 6. Fake obfuscated class files & icon
  zip.file('BolacMIDlet.class', new Uint8Array([0xca, 0xfe, 0xba, 0xbe, 0x00, 0x00, 0x00, 0x32]));
  zip.file('a.class', new Uint8Array([0xca, 0xfe, 0xba, 0xbe, 0x00, 0x00, 0x00, 0x32]));
  zip.file('b.class', new Uint8Array([0xca, 0xfe, 0xba, 0xbe, 0x00, 0x00, 0x00, 0x32]));
  zip.file('icon.png', pngBuffers[0]);

  const output = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  return output;
}
