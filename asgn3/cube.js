// Interleaved [x,y,z, u,v] per vertex. 36 verts per cube = 180 floats.
// For baked world cubes: positions are in absolute world space.
// For single-draw cubes (sky, ground, animal): use identity baked at [-0.5,0.5]^3
//   and apply a ModelMatrix transform.

// Unit cube centered at origin, verts in [-0.5, 0.5]
const UNIT_CUBE = (function() {
  return makeCubeData(-0.5, -0.5, -0.5);
})();

// Cube at (cx,cy,cz) to (cx+1,cy+1,cz+1) – for baking into world buffer
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

// Single-draw cube helper. Holds its own VBO so we don't re-upload each frame.
class SingleCube {
  constructor(gl) {
    this.gl = gl;
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, UNIT_CUBE, gl.STATIC_DRAW);
  }

  // Bind the buffer and set up attrib pointers (caller then sets uniforms + draws)
  bind(a_Position, a_UV) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(a_UV,       2, gl.FLOAT, false, 20, 12);
    gl.enableVertexAttribArray(a_Position);
    gl.enableVertexAttribArray(a_UV);
  }

  draw() {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 36);
  }
}
