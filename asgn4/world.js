// Texture indices
const TEX_GRASS    = 0;
const TEX_BRICK    = 1;
const TEX_STONE    = 2;
const TEX_WOOD     = 3;
const TEX_GOLD     = 4;
const TEX_FUR      = 5;
const TEX_MONSTER  = 6;

// 64x64 procedurally generated map — values are wall height (0 = open floor)
const MAP_SIZE = 64;
const MAP = (function () {
  const S = MAP_SIZE;
  const m = Array.from({ length: S }, () => new Array(S).fill(0));
  function set(r, c, h) { if (r >= 0 && r < S && c >= 0 && c < S) m[r][c] = h; }
  function rw(r, c0, c1, h) { for (let c = c0; c <= c1; c++) set(r, c, h); }
  function cw(r0, r1, c, h) { for (let r = r0; r <= r1; r++) set(r, c, h); }

  // Perimeter (height 3)
  rw(0,0,S-1,3); rw(S-1,0,S-1,3); cw(0,S-1,0,3); cw(0,S-1,S-1,3);

  // Monster's lair — top-left ruins (rows 3-14, cols 3-18)
  rw(3,3,18,2); rw(14,3,18,2); cw(3,14,3,2); cw(3,14,18,2);
  m[8][3]=0; m[9][3]=0;   // entrance gap (west)
  m[3][10]=0;              // top gap
  cw(5,12,11,1);           // interior dividing wall
  m[8][11]=0;              // passage between chambers

  // East wing — top-right (rows 5-16, cols 46-58)
  rw(5,46,58,2); rw(16,46,58,2); cw(5,16,46,2); cw(5,16,58,2);
  m[10][46]=0; m[11][46]=0;  // entrance (west)
  m[5][52]=0;                // top gap

  // Dividing wall across middle (row 28) — gap left open at cols 25–39
  rw(28,5,24,2); rw(28,40,58,2);

  // Central pillars
  for (const [r,c] of [[24,28],[24,36],[32,28],[32,36],[28,32]]) set(r,c,2);

  // Southern courtyard (rows 42-52, cols 8-22)
  rw(42,8,22,2); rw(52,8,22,2); cw(42,52,8,2); cw(42,52,22,2);
  m[47][8]=0; m[48][8]=0; m[47][22]=0; m[48][22]=0; // two doorways

  // Scattered cover pairs
  for (const [r,c] of [
    [20,30],[20,31],[22,40],[22,41],
    [36,10],[36,11],[38,50],[38,51],
    [45,35],[45,36],[55,25],[55,26],
    [50,45],[50,46],[15,32],[15,33],
    [10,28],[10,29],
  ]) set(r,c,2);

  // Crumbled south wall with gap
  rw(56,30,50,1); m[56][38]=0; m[56][39]=0;

  return m;
})();

function wallTexForCell(row, col, height) {
  if (height >= 3) return TEX_STONE;
  if ((row + col) % 3 === 0) return TEX_WOOD;
  return TEX_BRICK;
}

const GOLD_POSITIONS = [
  [8,12],[10,7],           // inside the monster's lair
  [10,52],[14,50],         // east wing
  [22,32],[26,22],[26,42], // central open area
  [30,30],[30,45],         // near the dividing wall
  [40,35],[40,15],         // mid-south
  [54,20],[54,45],         // south open field
  [60,15],[60,48],         // near player spawn
];

class World {
  constructor(gl) {
    this.gl = gl;
    this.map = MAP.map(row => [...row]);

    // Static wall batch
    this.wallBuf     = gl.createBuffer();
    this.wallNormBuf = gl.createBuffer();
    this.wallGroups  = [];

    // Gold collectibles
    this.goldBuf     = gl.createBuffer();
    this.goldNormBuf = gl.createBuffer();
    this.goldVerts   = 0;
    this.goldSet     = new Set(GOLD_POSITIONS.map(p => p[0]+','+p[1]));
    this.collected   = 0;
    this.total       = GOLD_POSITIONS.length;

    this.unitCube = new SingleCube(gl);

    this.buildWallBuffer();
    this.buildGoldBuffer();
    this.loadTextures();
  }

  buildWallBuffer() {
    const gl = this.gl;
    const buckets     = { [TEX_BRICK]:[], [TEX_STONE]:[], [TEX_WOOD]:[] };
    const normBuckets = { [TEX_BRICK]:[], [TEX_STONE]:[], [TEX_WOOD]:[] };

    for (let row = 0; row < this.map.length; row++) {
      for (let col = 0; col < this.map[row].length; col++) {
        const h = this.map[row][col];
        if (h === 0) continue;
        const tex = wallTexForCell(row, col, h);
        const bucket     = buckets[tex]     || buckets[TEX_BRICK];
        const normBucket = normBuckets[tex] || normBuckets[TEX_BRICK];
        for (let y = 0; y < h; y++) {
          const data  = makeCubeData(col, y, row);
          const ndata = makeCubeNormalsData();
          for (let i = 0; i < data.length;  i++) bucket.push(data[i]);
          for (let i = 0; i < ndata.length; i++) normBucket.push(ndata[i]);
        }
      }
    }

    const all  = [];
    const norm = [];
    this.wallGroups = [];
    for (const tex of [TEX_BRICK, TEX_STONE, TEX_WOOD]) {
      const b  = buckets[tex];
      const nb = normBuckets[tex];
      if (b.length === 0) continue;
      const startVert = all.length / 5;
      const count     = b.length / 5;
      this.wallGroups.push({ start: startVert, count, tex });
      for (let i = 0; i < b.length;  i++) all.push(b[i]);
      for (let i = 0; i < nb.length; i++) norm.push(nb[i]);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(all),  gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallNormBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(norm), gl.DYNAMIC_DRAW);
  }

  buildGoldBuffer() {
    const gl = this.gl;
    const verts = [];
    const norms = [];
    for (const key of this.goldSet) {
      const [rs, cs] = key.split(',');
      const row = parseInt(rs), col = parseInt(cs);
      const cx = col + 0.5, cy = 0.5, cz = row + 0.5;
      const gd = makeCubeDataScaled(cx, cy, cz, 0.4);
      const gn = makeCubeNormalsData();
      for (let i = 0; i < gd.length; i++) verts.push(gd[i]);
      for (let i = 0; i < gn.length; i++) norms.push(gn[i]);
    }
    this.goldVerts = verts.length / 5;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.goldBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.goldNormBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(norms), gl.DYNAMIC_DRAW);
  }

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

  addBlock(ex, ez, fwdX, fwdZ) {
    const col = Math.floor(ex + fwdX * 1.5);
    const row = Math.floor(ez + fwdZ * 1.5);
    if (row < 0 || row >= this.map.length || col < 0 || col >= this.map[0].length) return;
    if (this.map[row][col] < 4) {
      this.map[row][col]++;
      this.buildWallBuffer();
    }
  }

  removeBlock(ex, ez, fwdX, fwdZ) {
    const col = Math.floor(ex + fwdX * 1.5);
    const row = Math.floor(ez + fwdZ * 1.5);
    if (row < 0 || row >= this.map.length || col < 0 || col >= this.map[0].length) return;
    if (this.map[row][col] > 0) {
      this.map[row][col]--;
      this.buildWallBuffer();
    }
  }

  isBlocked(ex, ez) {
    const margin = 0.3;
    const checks = [
      [ex - margin, ez - margin], [ex + margin, ez - margin],
      [ex - margin, ez + margin], [ex + margin, ez + margin],
    ];
    for (const [x, z] of checks) {
      const col = Math.floor(x), row = Math.floor(z);
      if (row < 0 || row >= this.map.length || col < 0 || col >= this.map[0].length) return true;
      if (this.map[row][col] > 0) return true;
    }
    return false;
  }

  loadTextures() {
    const gl = this.gl;
    this.textures = [];
    const defs = [
      { name:'grass',   fn: makeGrassTex   },
      { name:'brick',   fn: makeBrickTex   },
      { name:'stone',   fn: makeStoneTex   },
      { name:'wood',    fn: makeWoodTex    },
      { name:'gold',    fn: makeGoldTex    },
      { name:'fur',     fn: makeFurTex     },
      { name:'monster', fn: makeMonsterTex },
    ];
    for (let i = 0; i < defs.length; i++) {
      const tex  = gl.createTexture();
      const img  = defs[i].fn();
      const unit = [gl.TEXTURE0,gl.TEXTURE1,gl.TEXTURE2,gl.TEXTURE3,gl.TEXTURE4,gl.TEXTURE5,gl.TEXTURE6][i];
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

  bindWallBuffer(a_Position, a_UV, a_Normal) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallBuf);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(a_UV,       2, gl.FLOAT, false, 20, 12);
    gl.enableVertexAttribArray(a_Position);
    gl.enableVertexAttribArray(a_UV);
    if (a_Normal >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.wallNormBuf);
      gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 12, 0);
      gl.enableVertexAttribArray(a_Normal);
    }
  }

  bindGoldBuffer(a_Position, a_UV, a_Normal) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.goldBuf);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(a_UV,       2, gl.FLOAT, false, 20, 12);
    gl.enableVertexAttribArray(a_Position);
    gl.enableVertexAttribArray(a_UV);
    if (a_Normal >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.goldNormBuf);
      gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 12, 0);
      gl.enableVertexAttribArray(a_Normal);
    }
  }
}

// Scaled cube centered at (cx,cy,cz) with half-size s
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
  ctx.fillStyle = '#7a4f1e';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#c49a55';
  ctx.beginPath();
  ctx.ellipse(32, 44, 14, 18, 0, 0, Math.PI * 2);
  ctx.fill();
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

// Pale off-white monster skin with red around eye and mouth areas
function makeMonsterTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');

  // Off-white pale base
  ctx.fillStyle = '#ede8df';
  ctx.fillRect(0, 0, 128, 128);

  // Subtle skin variation — faint warm/cool patches to avoid flat look
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 128, y = Math.random() * 128;
    const r = 6 + Math.random() * 16;
    const warm = Math.random() > 0.5;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    if (warm) {
      grad.addColorStop(0, 'rgba(220,190,165,0.35)');
    } else {
      grad.addColorStop(0, 'rgba(200,205,215,0.25)');
    }
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + Math.random() * 0.6), Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Red inflamed rings — eye-socket area (upper center/left of UV)
  const eyeSpots = [[38, 30], [70, 30], [54, 28]];
  for (const [ex, ey] of eyeSpots) {
    const eg = ctx.createRadialGradient(ex, ey, 2, ex, ey, 14);
    eg.addColorStop(0,   'rgba(180,20,20,0.75)');
    eg.addColorStop(0.4, 'rgba(160,30,30,0.45)');
    eg.addColorStop(1,   'rgba(140,40,40,0)');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.ellipse(ex, ey, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Red inflamed area — mouth region (lower center of UV)
  const mouthSpots = [[54, 80], [42, 82], [66, 82], [54, 90]];
  for (const [mx, my] of mouthSpots) {
    const mg = ctx.createRadialGradient(mx, my, 1, mx, my, 12);
    mg.addColorStop(0,   'rgba(190,15,15,0.70)');
    mg.addColorStop(0.5, 'rgba(160,25,25,0.40)');
    mg.addColorStop(1,   'rgba(140,35,35,0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.ellipse(mx, my, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine surface texture — faint wrinkle/pore lines
  ctx.strokeStyle = 'rgba(160,140,125,0.25)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    let lx = Math.random() * 128, ly = Math.random() * 128;
    ctx.moveTo(lx, ly);
    for (let s = 0; s < 3; s++) {
      lx += (Math.random() - 0.5) * 18;
      ly += (Math.random() - 0.5) * 10;
      ctx.lineTo(lx, ly);
    }
    ctx.stroke();
  }

  // Subtle dark pores
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 128, y = Math.random() * 128;
    ctx.fillStyle = `rgba(140,120,105,${0.08 + Math.random() * 0.12})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  return c;
}
