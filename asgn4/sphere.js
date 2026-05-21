// UV-sphere centered at origin.
// Buffer format mirrors SingleCube exactly:
//   - interleaved [x,y,z, u,v], stride 20, position at offset 0, UV at offset 12
//   - separate parallel normal buffer [nx,ny,nz], stride 12
// For a sphere centered at the origin, outward normal == normalize(position),
// so the normal buffer is just each vertex's position divided by radius.

class Sphere {
  constructor(gl, latBands = 16, lonSegs = 24, radius = 1.0) {
    this.gl = gl;

    const posUV = []; // interleaved [x, y, z, u, v]
    const norm  = []; // parallel    [nx, ny, nz]

    for (let lat = 0; lat < latBands; lat++) {
      // theta: -PI/2 (south pole) → +PI/2 (north pole)
      const t0 = (lat     / latBands) * Math.PI - Math.PI / 2;
      const t1 = ((lat+1) / latBands) * Math.PI - Math.PI / 2;
      const v0 =  lat     / latBands; // UV v: 0 = south, 1 = north
      const v1 = (lat+1)  / latBands;

      for (let lon = 0; lon < lonSegs; lon++) {
        // phi: 0 → 2*PI around the equator
        const p0 = (lon     / lonSegs) * 2 * Math.PI;
        const p1 = ((lon+1) / lonSegs) * 2 * Math.PI;
        const u0 =  lon     / lonSegs;
        const u1 = (lon+1)  / lonSegs;

        // 4 corners of this lat/lon quad
        const c00 = _sphXYZ(t0, p0, radius);
        const c10 = _sphXYZ(t1, p0, radius);
        const c01 = _sphXYZ(t0, p1, radius);
        const c11 = _sphXYZ(t1, p1, radius);

        // Triangle 1: c00, c10, c11
        _pushSphVert(posUV, norm, c00, u0, v0, radius);
        _pushSphVert(posUV, norm, c10, u0, v1, radius);
        _pushSphVert(posUV, norm, c11, u1, v1, radius);

        // Triangle 2: c00, c11, c01
        _pushSphVert(posUV, norm, c00, u0, v0, radius);
        _pushSphVert(posUV, norm, c11, u1, v1, radius);
        _pushSphVert(posUV, norm, c01, u1, v0, radius);
      }
    }

    this.vertCount = posUV.length / 5;

    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posUV), gl.STATIC_DRAW);

    this.normBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(norm), gl.STATIC_DRAW);
  }

  // Identical signature to SingleCube.bind()
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
    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertCount);
  }
}

function _sphXYZ(theta, phi, r) {
  return [
    r * Math.cos(theta) * Math.cos(phi),
    r * Math.sin(theta),
    r * Math.cos(theta) * Math.sin(phi),
  ];
}

function _pushSphVert(posUV, norm, [x, y, z], u, v, radius) {
  posUV.push(x, y, z, u, v);
  norm.push(x / radius, y / radius, z / radius);
}
