// Interleaved [x,y,z, u,v] per vertex. 36 verts per cube = 180 floats.
// Normal buffer is a separate parallel [nx,ny,nz] VBO with 36 * 3 floats.
//
// For baked world cubes: positions are in absolute world space.
// For single-draw cubes (sky, ground, animal): use identity baked at [-0.5,0.5]^3
//   and apply a ModelMatrix transform.

// Unit cube centered at origin, verts in [-0.5, 0.5]
const UNIT_CUBE = (function() {
  return makeCubeData(-0.5, -0.5, -0.5);
})();

// Phase 1: all normals hardcoded to (1,1,0). Phase 2 will replace with per-face.
const UNIT_CUBE_NORMS = makeCubeNormals_perFace();

function makeCubeData(cx, cy, cz) {
  const x0=cx, x1=cx+1, y0=cy, y1=cy+1, z0=cz, z1=cz+1;
  // prettier-ignore
  return new Float32Array([
    // Front  (+Z)
    x0,y0,z1, 0,0,  x1,y0,z1, 1,0,  x1,y1,z1, 1,1,
    x0,y0,z1, 0,0,  x1,y1,z1, 1,1,  x0,y1,z1, 0,1,
    // Back   (-Z)
    x1,y0,z0, 0,0,  x0,y0,z0, 1,0,  x0,y1,z0, 1,1,
    x1,y0,z0, 0,0,  x0,y1,z0, 1,1,  x1,y1,z0, 0,1,
    // Left   (-X)
    x0,y0,z0, 0,0,  x0,y0,z1, 1,0,  x0,y1,z1, 1,1,
    x0,y0,z0, 0,0,  x0,y1,z1, 1,1,  x0,y1,z0, 0,1,
    // Right  (+X)
    x1,y0,z1, 0,0,  x1,y0,z0, 1,0,  x1,y1,z0, 1,1,
    x1,y0,z1, 0,0,  x1,y1,z0, 1,1,  x1,y1,z1, 0,1,
    // Top    (+Y)
    x0,y1,z0, 0,0,  x0,y1,z1, 0,1,  x1,y1,z1, 1,1,
    x0,y1,z0, 0,0,  x1,y1,z1, 1,1,  x1,y1,z0, 1,0,
    // Bottom (-Y)
    x0,y0,z1, 0,0,  x0,y0,z0, 0,1,  x1,y0,z0, 1,1,
    x0,y0,z1, 0,0,  x1,y0,z0, 1,1,  x1,y0,z1, 1,0,
  ]);
}

// Phase 1: all 36 normals = (1,1,0). Phase 2 replaces with per-face directions.
function makeCubeNormals_flat() {
  const n = new Float32Array(36 * 3);
  for (let i = 0; i < 36; i++) { n[i*3]=1; n[i*3+1]=1; n[i*3+2]=0; }
  return n;
}

// Phase 2: per-face normals matching the vertex order in makeCubeData
function makeCubeNormals_perFace() {
  // 6 faces × 6 verts each, order matches makeCubeData
  const faces = [
    [ 0, 0, 1],  // Front  (+Z)
    [ 0, 0,-1],  // Back   (-Z)
    [-1, 0, 0],  // Left   (-X)
    [ 1, 0, 0],  // Right  (+X)
    [ 0, 1, 0],  // Top    (+Y)
    [ 0,-1, 0],  // Bottom (-Y)
  ];
  const n = new Float32Array(36 * 3);
  let idx = 0;
  for (const [nx,ny,nz] of faces) {
    for (let v = 0; v < 6; v++) { n[idx++]=nx; n[idx++]=ny; n[idx++]=nz; }
  }
  return n;
}

// Generate normals for a baked world-space cube (normals don't depend on position).
// Positions are baked in world space with identity model matrix, so per-face
// object-space normals == world-space normals directly.
function makeCubeNormalsData() {
  return makeCubeNormals_perFace();
}

// Single-draw cube helper. Holds its own VBO + normal VBO.
class SingleCube {
  constructor(gl) {
    this.gl = gl;

    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, UNIT_CUBE, gl.STATIC_DRAW);

    this.normBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuf);
    gl.bufferData(gl.ARRAY_BUFFER, UNIT_CUBE_NORMS, gl.STATIC_DRAW);
  }

  // Bind geometry + UV buffer, then normal buffer if a_Normal is a valid location.
  bind(a_Position, a_UV, a_Normal) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(a_UV,       2, gl.FLOAT, false, 20, 12);
    gl.enableVertexAttribArray(a_Position);
    gl.enableVertexAttribArray(a_UV);

    if (a_Normal >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuf);
      gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 12, 0);
      gl.enableVertexAttribArray(a_Normal);
    }
  }

  // Update the normal data (used in Phase 2 when switching to per-face normals)
  updateNormals(data) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  }

  draw() {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 36);
  }
}
