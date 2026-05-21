// OBJ model loader. Buffer layout matches SingleCube/Sphere exactly:
//   this.buf     — interleaved [x,y,z, u,v], stride 20
//   this.normBuf — parallel    [nx,ny,nz],   stride 12
// bind(a_Position, a_UV, a_Normal) and draw() have the same signatures.
//
// Supports face formats: v  v/vt  v/vt/vn  v//vn
// Triangulates quads (and n-gons) via a simple fan.
// If the file has vn normals, they are used. If not, per-face normals are
// computed as edge1 × edge2.
// UV is set to (0,0) for any vertex that has no vt entry.

class Model {
  constructor(gl) {
    this.gl       = gl;
    this.buf      = null;
    this.normBuf  = null;
    this.vertCount = 0;
    this.loaded   = false;
  }

  // url is relative to the HTML page. Fails gracefully — logs warning, never crashes.
  load(url) {
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(text => this._parse(text))
      .catch(e => console.warn(`Model: could not load "${url}": ${e.message}`));
  }

  _parse(text) {
    const gl = this.gl;

    const vPos = [];  // raw positions  [[x,y,z], ...]
    const vNrm = [];  // raw normals     [[nx,ny,nz], ...]
    const vUV  = [];  // raw tex coords  [[u,v], ...]
    const tris = [];  // [{vi,ti,ni}×3, ...]  — triangulated face list

    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (!line || line[0] === '#') continue;
      const tok = line.split(/\s+/);

      if (tok[0] === 'v') {
        vPos.push([+tok[1], +tok[2], +tok[3]]);
      } else if (tok[0] === 'vn') {
        vNrm.push([+tok[1], +tok[2], +tok[3]]);
      } else if (tok[0] === 'vt') {
        vUV.push([+tok[1], +(tok[2] !== undefined ? tok[2] : 0)]);
      } else if (tok[0] === 'f') {
        const verts = tok.slice(1).map(s => {
          const p = s.split('/');
          return {
            vi: (+p[0]) - 1,
            ti: (p[1] && p[1] !== '') ? (+p[1]) - 1 : -1,
            ni: (p[2] && p[2] !== '') ? (+p[2]) - 1 : -1,
          };
        });
        // Fan triangulation: v0, v1, v2 / v0, v2, v3 / ...
        for (let i = 1; i < verts.length - 1; i++) {
          tris.push([verts[0], verts[i], verts[i + 1]]);
        }
      }
      // 'o', 's', 'g', 'usemtl', 'mtllib' etc. are ignored
    }

    const hasNormals = vNrm.length > 0;
    const posUV = [];
    const nrm   = [];

    for (const [a, b, c] of tris) {
      const pa = vPos[a.vi], pb = vPos[b.vi], pc = vPos[c.vi];
      if (!pa || !pb || !pc) continue;  // skip degenerate refs

      const ua = a.ti >= 0 && vUV[a.ti] ? vUV[a.ti] : [0, 0];
      const ub = b.ti >= 0 && vUV[b.ti] ? vUV[b.ti] : [0, 0];
      const uc = c.ti >= 0 && vUV[c.ti] ? vUV[c.ti] : [0, 0];

      posUV.push(
        pa[0], pa[1], pa[2], ua[0], ua[1],
        pb[0], pb[1], pb[2], ub[0], ub[1],
        pc[0], pc[1], pc[2], uc[0], uc[1]
      );

      if (hasNormals && a.ni >= 0 && vNrm[a.ni]) {
        const na = vNrm[a.ni], nb = vNrm[b.ni] || na, nc = vNrm[c.ni] || na;
        nrm.push(na[0],na[1],na[2], nb[0],nb[1],nb[2], nc[0],nc[1],nc[2]);
      } else {
        // Per-face normal: edge1 × edge2
        const e1 = [pb[0]-pa[0], pb[1]-pa[1], pb[2]-pa[2]];
        const e2 = [pc[0]-pa[0], pc[1]-pa[1], pc[2]-pa[2]];
        const cx = e1[1]*e2[2] - e1[2]*e2[1];
        const cy = e1[2]*e2[0] - e1[0]*e2[2];
        const cz = e1[0]*e2[1] - e1[1]*e2[0];
        const len = Math.sqrt(cx*cx + cy*cy + cz*cz);
        const nx = len > 0 ? cx/len : 0;
        const ny = len > 0 ? cy/len : 1;
        const nz = len > 0 ? cz/len : 0;
        nrm.push(nx,ny,nz, nx,ny,nz, nx,ny,nz);
      }
    }

    this.vertCount = posUV.length / 5;

    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posUV), gl.STATIC_DRAW);

    this.normBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nrm), gl.STATIC_DRAW);

    this.loaded = true;
    console.log(`Model loaded: ${this.vertCount} vertices (${tris.length} triangles)`);
  }

  // Identical signature to SingleCube.bind() and Sphere.bind()
  bind(a_Position, a_UV, a_Normal) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 20,  0);
    gl.vertexAttribPointer(a_UV,       2, gl.FLOAT, false, 20, 12);
    gl.enableVertexAttribArray(a_Position);
    gl.enableVertexAttribArray(a_UV);
    if (a_Normal >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuf);
      gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 12, 0);
      gl.enableVertexAttribArray(a_Normal);
    }
  }

  draw() {
    if (!this.loaded) return;  // silently skip until the fetch completes
    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertCount);
  }
}
