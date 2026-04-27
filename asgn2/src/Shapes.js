// ============================================================
// Shapes.js — Raw WebGL triangle-list geometry helpers
// Each function mirrors the style of drawCube(M, color):
//   M     : Matrix4 model matrix
//   color : [r, g, b, a]
// ============================================================

// Shared vertex buffer (reused across all draw calls)
var g_shapeVertexBuffer = null;

function _getShapeBuffer() {
  if (!g_shapeVertexBuffer) {
    g_shapeVertexBuffer = gl.createBuffer();
    if (!g_shapeVertexBuffer) {
      console.log('Failed to create shape vertex buffer');
      return null;
    }
  }
  return g_shapeVertexBuffer;
}

function _drawVertices(vertices) {
  var buf = _getShapeBuffer();
  if (!buf) return;

  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
}

function _setUniforms(M, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
}

// ============================================================
// CYLINDER
//   radius  : cross-section radius (default 0.5)
//   height  : total height        (default 1.0)
//   segs    : number of side segments (default 24)
// ============================================================
function drawCylinder(M, color, radius, height, segs) {
  radius = radius !== undefined ? radius : 0.5;
  height = height !== undefined ? height : 1.0;
  segs   = segs   !== undefined ? segs   : 24;

  var verts = [];
  var halfH = height / 2;
  var step  = (2 * Math.PI) / segs;

  for (var i = 0; i < segs; i++) {
    var a0 = i       * step;
    var a1 = (i + 1) * step;

    var x0 = radius * Math.cos(a0), z0 = radius * Math.sin(a0);
    var x1 = radius * Math.cos(a1), z1 = radius * Math.sin(a1);

    // Side quad (two triangles)
    verts.push(x0, -halfH, z0,  x1, -halfH, z1,  x1,  halfH, z1);
    verts.push(x0, -halfH, z0,  x1,  halfH, z1,  x0,  halfH, z0);

    // Top cap
    verts.push(0, halfH, 0,  x0, halfH, z0,  x1, halfH, z1);

    // Bottom cap (winding flipped for outward normal)
    verts.push(0, -halfH, 0,  x1, -halfH, z1,  x0, -halfH, z0);
  }

  _setUniforms(M, color);
  _drawVertices(verts);
}

// ============================================================
// SPHERE  (UV sphere)
//   radius  : sphere radius       (default 0.5)
//   segs    : longitude segments  (default 24)
//   rings   : latitude rings      (default 16)
// ============================================================
function drawSphere(M, color, radius, segs, rings) {
  radius = radius !== undefined ? radius : 0.5;
  segs   = segs   !== undefined ? segs   : 24;
  rings  = rings  !== undefined ? rings  : 16;

  var verts = [];
  var dTheta = Math.PI / rings;         // latitude  step
  var dPhi   = (2 * Math.PI) / segs;   // longitude step

  for (var r = 0; r < rings; r++) {
    var theta0 = r       * dTheta;
    var theta1 = (r + 1) * dTheta;

    var sinT0 = Math.sin(theta0), cosT0 = Math.cos(theta0);
    var sinT1 = Math.sin(theta1), cosT1 = Math.cos(theta1);

    for (var s = 0; s < segs; s++) {
      var phi0 = s       * dPhi;
      var phi1 = (s + 1) * dPhi;

      var sinP0 = Math.sin(phi0), cosP0 = Math.cos(phi0);
      var sinP1 = Math.sin(phi1), cosP1 = Math.cos(phi1);

      // Four corners of the quad on the sphere surface
      var x00 = radius * sinT0 * cosP0, y00 = radius * cosT0, z00 = radius * sinT0 * sinP0;
      var x10 = radius * sinT1 * cosP0, y10 = radius * cosT1, z10 = radius * sinT1 * sinP0;
      var x01 = radius * sinT0 * cosP1, y01 = radius * cosT0, z01 = radius * sinT0 * sinP1;
      var x11 = radius * sinT1 * cosP1, y11 = radius * cosT1, z11 = radius * sinT1 * sinP1;

      verts.push(x00, y00, z00,  x10, y10, z10,  x11, y11, z11);
      verts.push(x00, y00, z00,  x11, y11, z11,  x01, y01, z01);
    }
  }

  _setUniforms(M, color);
  _drawVertices(verts);
}

// ============================================================
// ELLIPSOID — just a sphere with non-uniform scale baked in
//   rx, ry, rz : radii along each axis (default 0.5)
//   segs, rings: same as drawSphere
//
// Usage tip: you can also just pre-scale your Matrix4 M and
// call drawSphere() — this is a convenience wrapper.
// ============================================================
function drawEllipsoid(M, color, rx, ry, rz, segs, rings) {
  rx    = rx    !== undefined ? rx    : 0.5;
  ry    = ry    !== undefined ? ry    : 0.5;
  rz    = rz    !== undefined ? rz    : 0.5;
  segs  = segs  !== undefined ? segs  : 24;
  rings = rings !== undefined ? rings : 16;

  var scaled = new Matrix4(M);
  scaled.scale(rx * 2, ry * 2, rz * 2); // drawSphere uses radius=0.5 base
  drawSphere(scaled, color, 0.5, segs, rings);
}

// ============================================================
// CONE  (with bottom cap)
//   radius  : base radius         (default 0.5)
//   height  : total height        (default 1.0)
//   segs    : side segments       (default 24)
// Tip points up at (0, height, 0); base sits at y=0.
// ============================================================
function drawCone(M, color, radius, height, segs) {
  radius = radius !== undefined ? radius : 0.5;
  height = height !== undefined ? height : 1.0;
  segs   = segs   !== undefined ? segs   : 24;

  var verts = [];
  var step  = (2 * Math.PI) / segs;

  for (var i = 0; i < segs; i++) {
    var a0 = i       * step;
    var a1 = (i + 1) * step;

    var x0 = radius * Math.cos(a0), z0 = radius * Math.sin(a0);
    var x1 = radius * Math.cos(a1), z1 = radius * Math.sin(a1);

    // Side face
    verts.push(x0, 0, z0,  x1, 0, z1,  0, height, 0);

    // Bottom cap (winding flipped)
    verts.push(0, 0, 0,  x1, 0, z1,  x0, 0, z0);
  }

  _setUniforms(M, color);
  _drawVertices(verts);
}

// ============================================================
// PYRAMID  (square base, 4 triangular faces + base)
// Great for: ears, spikes, teeth, horns.
//   base    : side length of the square base (default 1.0)
//   height  : height from base to tip        (default 1.0)
// Base sits at y=0, tip at (0, height, 0).
// ============================================================
function drawPyramid(M, color, base, height) {
  base   = base   !== undefined ? base   : 1.0;
  height = height !== undefined ? height : 1.0;

  var h = base / 2;
  // Base corners (y=0)
  var corners = [
    [-h, 0, -h],
    [ h, 0, -h],
    [ h, 0,  h],
    [-h, 0,  h]
  ];
  var tip = [0, height, 0];

  var verts = [];

  // Four side faces
  for (var i = 0; i < 4; i++) {
    var c0 = corners[i];
    var c1 = corners[(i + 1) % 4];
    verts.push(c0[0], c0[1], c0[2],  c1[0], c1[1], c1[2],  tip[0], tip[1], tip[2]);
  }

  // Square base (two triangles)
  verts.push(corners[0][0], corners[0][1], corners[0][2],
             corners[2][0], corners[2][1], corners[2][2],
             corners[1][0], corners[1][1], corners[1][2]);
  verts.push(corners[0][0], corners[0][1], corners[0][2],
             corners[3][0], corners[3][1], corners[3][2],
             corners[2][0], corners[2][1], corners[2][2]);

  _setUniforms(M, color);
  _drawVertices(verts);
}

// ============================================================
// TORUS
//   R    : distance from tube center to torus center (default 0.5)
//   r    : tube radius                               (default 0.15)
//   segs : segments around the tube                 (default 16)
//   rings: segments around the torus ring           (default 32)
// Great for: collars, rings, decorative loops.
// ============================================================
function drawTorus(M, color, R, r, segs, rings) {
  R     = R     !== undefined ? R     : 0.5;
  r     = r     !== undefined ? r     : 0.15;
  segs  = segs  !== undefined ? segs  : 16;
  rings = rings !== undefined ? rings : 32;

  var verts = [];
  var dU = (2 * Math.PI) / rings;
  var dV = (2 * Math.PI) / segs;

  function torusPoint(u, v) {
    var x = (R + r * Math.cos(v)) * Math.cos(u);
    var y =  r * Math.sin(v);
    var z = (R + r * Math.cos(v)) * Math.sin(u);
    return [x, y, z];
  }

  for (var i = 0; i < rings; i++) {
    var u0 = i       * dU;
    var u1 = (i + 1) * dU;

    for (var j = 0; j < segs; j++) {
      var v0 = j       * dV;
      var v1 = (j + 1) * dV;

      var p00 = torusPoint(u0, v0);
      var p10 = torusPoint(u1, v0);
      var p01 = torusPoint(u0, v1);
      var p11 = torusPoint(u1, v1);

      verts.push(p00[0], p00[1], p00[2],  p10[0], p10[1], p10[2],  p11[0], p11[1], p11[2]);
      verts.push(p00[0], p00[1], p00[2],  p11[0], p11[1], p11[2],  p01[0], p01[1], p01[2]);
    }
  }

  _setUniforms(M, color);
  _drawVertices(verts);
}

// ============================================================
// FRUSTUM (truncated cone — cone with the top chopped off)
//   rBottom : radius at base (y=0)          (default 0.5)
//   rTop    : radius at top  (y=height)     (default 0.25)
//   height  : total height                  (default 1.0)
//   segs    : side segments                 (default 24)
// Great for: beak, neck, legs, tapered body sections.
// ============================================================
function drawFrustum(M, color, rBottom, rTop, height, segs) {
  rBottom = rBottom !== undefined ? rBottom : 0.5;
  rTop    = rTop    !== undefined ? rTop    : 0.25;
  height  = height  !== undefined ? height  : 1.0;
  segs    = segs    !== undefined ? segs    : 24;

  var verts = [];
  var step  = (2 * Math.PI) / segs;

  for (var i = 0; i < segs; i++) {
    var a0 = i       * step;
    var a1 = (i + 1) * step;

    var bx0 = rBottom * Math.cos(a0), bz0 = rBottom * Math.sin(a0);
    var bx1 = rBottom * Math.cos(a1), bz1 = rBottom * Math.sin(a1);
    var tx0 = rTop    * Math.cos(a0), tz0 = rTop    * Math.sin(a0);
    var tx1 = rTop    * Math.cos(a1), tz1 = rTop    * Math.sin(a1);

    // Side quad (two triangles)
    verts.push(bx0, 0, bz0,  bx1, 0, bz1,  tx1, height, tz1);
    verts.push(bx0, 0, bz0,  tx1, height, tz1,  tx0, height, tz0);

    // Bottom cap
    verts.push(0, 0, 0,  bx1, 0, bz1,  bx0, 0, bz0);

    // Top cap
    verts.push(0, height, 0,  tx0, height, tz0,  tx1, height, tz1);
  }

  _setUniforms(M, color);
  _drawVertices(verts);
}

// ============================================================
// TRUNCATED PYRAMID (pyramid with the top chopped off)
//   baseW, baseD : width & depth of bottom face (default 1.0)
//   topW,  topD  : width & depth of top face    (default 0.5)
//   height       : total height                  (default 1.0)
// Base at y=0, top at y=height. Centered on X and Z.
// Great for: head shape, torso tapering, blocky beak.
// ============================================================
function drawTruncatedPyramid(M, color, baseW, baseD, topW, topD, height) {
  baseW  = baseW  !== undefined ? baseW  : 1.0;
  baseD  = baseD  !== undefined ? baseD  : 1.0;
  topW   = topW   !== undefined ? topW   : 0.5;
  topD   = topD   !== undefined ? topD   : 0.5;
  height = height !== undefined ? height : 1.0;

  var bw = baseW / 2, bd = baseD / 2;
  var tw = topW  / 2, td = topD  / 2;

  // 8 corners: bottom 4, top 4
  var b = [
    [-bw, 0, -bd],  // 0: back-left
    [ bw, 0, -bd],  // 1: back-right
    [ bw, 0,  bd],  // 2: front-right
    [-bw, 0,  bd],  // 3: front-left
  ];
  var t = [
    [-tw, height, -td],  // 4: back-left
    [ tw, height, -td],  // 5: back-right
    [ tw, height,  td],  // 6: front-right
    [-tw, height,  td],  // 7: front-left
  ];

  var verts = [];

  function pushTri(a, c2, c3) {
    verts.push(a[0],a[1],a[2], c2[0],c2[1],c2[2], c3[0],c3[1],c3[2]);
  }

  // 4 side faces (each is a quad = 2 triangles)
  var sides = [[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
  for (var i = 0; i < 4; i++) {
    var s = sides[i];
    pushTri(b[s[0]], b[s[1]], t[s[2]]);
    pushTri(b[s[0]], t[s[2]], t[s[3]]);
  }

  // Bottom face
  pushTri(b[0], b[2], b[1]);
  pushTri(b[0], b[3], b[2]);

  // Top face
  pushTri(t[0], t[1], t[2]);
  pushTri(t[0], t[2], t[3]);

  _setUniforms(M, color);
  _drawVertices(verts);
}
