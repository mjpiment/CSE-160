// Texture indices
const TEX_GRASS  = 0;
const TEX_BRICK  = 1;
const TEX_STONE  = 2;
const TEX_WOOD   = 3;
const TEX_GOLD   = 4;
const TEX_FUR    = 5;

// 32x32 map — values are wall height (0 = open floor)
const MAP = [
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,3,3,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,0,0,0,2],
  [2,0,0,3,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,3,0,0,0,2],
  [2,0,0,3,0,4,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,4,0,3,0,0,0,2],
  [2,0,0,3,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,3,0,0,0,2],
  [2,0,0,3,3,3,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,3,3,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,2,0,0,2,0,0,2,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,2,0,0,2,0,0,2,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,2,0,0,2,0,0,2,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,2,0,0,2,0,0,2,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,3,3,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,0,0,0,2],
  [2,0,0,3,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,3,0,0,0,2],
  [2,0,0,3,0,4,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,4,0,3,0,0,0,2],
  [2,0,0,3,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,3,0,0,0,2],
  [2,0,0,3,3,3,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,3,3,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
];

// Pick a texture index based on map cell position (just cycle through wall textures)
function wallTexForCell(row, col, height) {
  if (height >= 3) return TEX_STONE;
  if ((row + col) % 3 === 0) return TEX_WOOD;
  return TEX_BRICK;
}

// Gold collectible positions [row, col]
const GOLD_POSITIONS = [
  [5,5],[10,20],[16,16],[22,10],[26,25],[8,28],[3,18],[19,3],[14,12],[28,18]
];

class World {
  constructor(gl) {
    this.gl = gl;
    this.map = MAP.map(row => [...row]); // mutable copy

    // Static wall batch
    this.wallBuf = gl.createBuffer();
    this.wallGroups = []; // {start, count, tex}

    // Gold collectibles (separate small buffer, rebuilt on collect)
    this.goldBuf = gl.createBuffer();
    this.goldVerts = 0;
    this.goldSet = new Set(GOLD_POSITIONS.map(p => p[0]+','+p[1]));
    this.collected = 0;
    this.total = GOLD_POSITIONS.length;

    // Single-draw cubes
    this.unitCube = new SingleCube(gl);

    this.buildWallBuffer();
    this.buildGoldBuffer();
    this.loadTextures();
  }

  buildWallBuffer() {
    const gl = this.gl;
    // Group verts by texture type
    const buckets = { [TEX_BRICK]:[], [TEX_STONE]:[], [TEX_WOOD]:[] };

    for (let row = 0; row < 32; row++) {
      for (let col = 0; col < 32; col++) {
        const h = this.map[row][col];
        if (h === 0) continue;
        const tex = wallTexForCell(row, col, h);
        const bucket = buckets[tex] || buckets[TEX_BRICK];
        for (let y = 0; y < h; y++) {
          const data = makeCubeData(col, y, row);
          for (let i = 0; i < data.length; i++) bucket.push(data[i]);
        }
      }
    }

    // Concatenate buckets, record start/count per texture
    const all = [];
    this.wallGroups = [];
    for (const tex of [TEX_BRICK, TEX_STONE, TEX_WOOD]) {
      const b = buckets[tex];
      if (b.length === 0) continue;
      const startVert = all.length / 5;
      const count = b.length / 5;
      this.wallGroups.push({ start: startVert, count, tex });
      for (let i = 0; i < b.length; i++) all.push(b[i]);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(all), gl.DYNAMIC_DRAW);
  }

  buildGoldBuffer() {
    const gl = this.gl;
    const verts = [];
    for (const key of this.goldSet) {
      const [rs, cs] = key.split(',');
      const row = parseInt(rs), col = parseInt(cs);
      const data = makeCubeData(col + 0.1, 0.1, row + 0.1);
      // Scale the gold cube down a bit: rebuild manually at 0.8 scale centered in cell
      const cx = col + 0.5, cy = 0.5, cz = row + 0.5;
      const s = 0.4;
      const gd = makeCubeDataScaled(cx, cy, cz, s);
      for (let i = 0; i < gd.length; i++) verts.push(gd[i]);
    }
    this.goldVerts = verts.length / 5;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.goldBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW);
  }

  // Try to collect gold at camera world position
  tryCollect(ex, ez) {
    const col = Math.floor(ex);
    const row = Math.floor(ez);
    const key = row+','+col;
    if (this.goldSet.has(key)) {
      this.goldSet.delete(key);
      this.collected++;
      this.buildGoldBuffer();
      return true;
    }
    return false;
  }

  // Add a block in front of the camera
  addBlock(ex, ez, fwdX, fwdZ) {
    const col = Math.floor(ex + fwdX * 1.5);
    const row = Math.floor(ez + fwdZ * 1.5);
    if (row < 0 || row >= 32 || col < 0 || col >= 32) return;
    if (this.map[row][col] < 4) {
      this.map[row][col]++;
      this.buildWallBuffer();
    }
  }

  // Remove the top block from the cell in front of the camera
  removeBlock(ex, ez, fwdX, fwdZ) {
    const col = Math.floor(ex + fwdX * 1.5);
    const row = Math.floor(ez + fwdZ * 1.5);
    if (row < 0 || row >= 32 || col < 0 || col >= 32) return;
    if (this.map[row][col] > 0) {
      this.map[row][col]--;
      this.buildWallBuffer();
    }
  }

  // Returns true if position (ex, ez) would be inside a wall
  isBlocked(ex, ez) {
    const margin = 0.3;
    const checks = [
      [ex - margin, ez - margin], [ex + margin, ez - margin],
      [ex - margin, ez + margin], [ex + margin, ez + margin],
    ];
    for (const [x, z] of checks) {
      const col = Math.floor(x), row = Math.floor(z);
      if (row < 0 || row >= 32 || col < 0 || col >= 32) return true;
      if (this.map[row][col] > 0) return true;
    }
    return false;
  }

  loadTextures() {
    const gl = this.gl;
    this.textures = [];
    const defs = [
      { name:'grass', fn: makeGrassTex   },
      { name:'brick', fn: makeBrickTex   },
      { name:'stone', fn: makeStoneTex   },
      { name:'wood',  fn: makeWoodTex    },
      { name:'gold',  fn: makeGoldTex    },
      { name:'fur',   fn: makeFurTex     },
    ];
    for (let i = 0; i < defs.length; i++) {
      const tex = gl.createTexture();
      const img = defs[i].fn();
      const unit = [gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2, gl.TEXTURE3, gl.TEXTURE4, gl.TEXTURE5][i];
      gl.activeTexture(unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      this.textures.push(tex);
    }
  }

  bindWallBuffer(a_Position, a_UV) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallBuf);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(a_UV,       2, gl.FLOAT, false, 20, 12);
    gl.enableVertexAttribArray(a_Position);
    gl.enableVertexAttribArray(a_UV);
  }

  bindGoldBuffer(a_Position, a_UV) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.goldBuf);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(a_UV,       2, gl.FLOAT, false, 20, 12);
    gl.enableVertexAttribArray(a_Position);
    gl.enableVertexAttribArray(a_UV);
  }
}

// Scaled cube centered at (cx,cy,cz) with half-size s
function makeCubeDataScaled(cx, cy, cz, s) {
  return makeCubeData(cx-s, cy-s, cz-s);
  // Actually rewrite so it's truly scaled:
}

// Override the above with a proper version
function makeCubeDataScaled(cx, cy, cz, s) {
  const x0=cx-s, x1=cx+s, y0=cy-s, y1=cy+s, z0=cz-s, z1=cz+s;
  // prettier-ignore
  return new Float32Array([
    x0,y0,z1,0,0, x1,y0,z1,1,0, x1,y1,z1,1,1, x0,y0,z1,0,0, x1,y1,z1,1,1, x0,y1,z1,0,1,
    x1,y0,z0,0,0, x0,y0,z0,1,0, x0,y1,z0,1,1, x1,y0,z0,0,0, x0,y1,z0,1,1, x1,y1,z0,0,1,
    x0,y0,z0,0,0, x0,y0,z1,1,0, x0,y1,z1,1,1, x0,y0,z0,0,0, x0,y1,z1,1,1, x0,y1,z0,0,1,
    x1,y0,z1,0,0, x1,y0,z0,1,0, x1,y1,z0,1,1, x1,y0,z1,0,0, x1,y1,z0,1,1, x1,y1,z1,0,1,
    x0,y1,z0,0,0, x0,y1,z1,0,1, x1,y1,z1,1,1, x0,y1,z0,0,0, x1,y1,z1,1,1, x1,y1,z0,1,0,
    x0,y0,z1,0,0, x0,y0,z0,0,1, x1,y0,z0,1,1, x0,y0,z1,0,0, x1,y0,z0,1,1, x1,y0,z1,1,0,
  ]);
}

// ---- Procedural textures via Canvas 2D ----

function makeGrassTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4a8c2a';
  ctx.fillRect(0,0,64,64);
  for (let i = 0; i < 400; i++) {
    const x = Math.random()*64, y = Math.random()*64;
    ctx.fillStyle = `hsl(${100+Math.random()*30},${50+Math.random()*20}%,${25+Math.random()*15}%)`;
    ctx.fillRect(x, y, 2, 2);
  }
  return c;
}

function makeBrickTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#b55a30';
  ctx.fillRect(0,0,64,64);
  ctx.strokeStyle = '#8a3a18';
  ctx.lineWidth = 2;
  const bw = 16, bh = 8;
  for (let row = 0; row < 8; row++) {
    const offset = (row % 2) * (bw/2);
    for (let col = -1; col < 5; col++) {
      const x = col*bw + offset, y = row*bh;
      ctx.strokeRect(x+1, y+1, bw-2, bh-2);
      const shade = 0.85 + Math.random()*0.15;
      ctx.fillStyle = `rgba(${Math.floor(180*shade)},${Math.floor(80*shade)},${Math.floor(40*shade)},1)`;
      ctx.fillRect(x+2, y+2, bw-4, bh-4);
    }
  }
  return c;
}

function makeStoneTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#888';
  ctx.fillRect(0,0,64,64);
  for (let i = 0; i < 300; i++) {
    const x = Math.random()*64, y = Math.random()*64;
    const g = Math.floor(100 + Math.random()*80);
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(x, y, 3, 3);
  }
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random()*64, Math.random()*64);
    ctx.lineTo(Math.random()*64, Math.random()*64);
    ctx.stroke();
  }
  return c;
}

function makeWoodTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8B5E3C';
  ctx.fillRect(0,0,64,64);
  ctx.strokeStyle = '#6b3e1c';
  ctx.lineWidth = 1;
  for (let y = 0; y < 64; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(y*0.3)*1.5);
    ctx.lineTo(64, y + Math.sin(y*0.3+2)*1.5);
    ctx.stroke();
  }
  return c;
}

function makeFurTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  // Base warm brown coat
  ctx.fillStyle = '#7a4f1e';
  ctx.fillRect(0, 0, 64, 64);
  // Lighter belly patch
  ctx.fillStyle = '#c49a55';
  ctx.beginPath();
  ctx.ellipse(32, 44, 14, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Individual fur strokes
  for (let i = 0; i < 350; i++) {
    const x = Math.random() * 64;
    const y = Math.random() * 64;
    const len = 3 + Math.random() * 5;
    const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.9;
    const t = Math.random();
    const r = Math.floor(80 + t * 80);
    const g = Math.floor(45 + t * 60);
    const b = Math.floor(10 + t * 20);
    ctx.strokeStyle = `rgb(${r},${g},${b})`;
    ctx.lineWidth = 0.7 + Math.random() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  // Dark saddle marking on upper back
  ctx.fillStyle = 'rgba(40,20,5,0.35)';
  ctx.beginPath();
  ctx.ellipse(32, 18, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

function makeGoldTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32,32,4,32,32,32);
  grad.addColorStop(0, '#ffe066');
  grad.addColorStop(0.5, '#ffc200');
  grad.addColorStop(1, '#cc8800');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,64,64);
  ctx.fillStyle = 'rgba(255,255,200,0.5)';
  for (let i = 0; i < 20; i++) {
    ctx.fillRect(Math.random()*64, Math.random()*64, 4, 4);
  }
  return c;
}
