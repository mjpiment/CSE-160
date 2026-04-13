 
function drawTriangle(vertices, color) {
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
 
function drawPicture() {
  gl.clear(gl.COLOR_BUFFER_BIT);
 
  // ---- Background: night sky (2 triangles) ----
  var navy = [0.05, 0.05, 0.22, 1.0];
  drawTriangle([-1.0, -1.0,  1.0, -1.0,  1.0,  1.0], navy);
  drawTriangle([-1.0, -1.0,  1.0,  1.0, -1.0,  1.0], navy);
 
  // ---- Ground hill (1 triangle) ----
  var green = [0.12, 0.42, 0.12, 1.0];
  drawTriangle([-1.0, -1.0,  1.0, -1.0,  0.0, -0.25], green);
 
  
  // ---- Stars ----
  var star = [1.0, 1.0, 0.75, 1.0];
  drawTriangle([-0.88,  0.82,  -0.84,  0.74,  -0.80,  0.82], star);
  drawTriangle([ 0.05,  0.88,   0.09,  0.80,   0.13,  0.88], star);
  drawTriangle([ 0.55,  0.75,   0.59,  0.67,   0.63,  0.75], star);
 
  // ====================================================
  // M Temple (gold) - converted from grid coords (0-9 x, 0-5 y)
  // Left leg
  var gold = [1.0, 0.80, 0.1, 1.0];
  drawTriangle(
    [-1.000, -1.000,  -1.000,  0.200,  -0.778,  0.200], gold); // T1 left leg
  // Center V stroke
  drawTriangle(
    [-0.778,  0.200,  -0.667, -1.000,  -0.556,  0.200], gold); // T2 center notch
  // Right leg
  drawTriangle(
    [-0.556,  0.200,  -0.333,  0.200,  -0.333, -1.000], gold); // T3 right leg
  // Roof/cap triangle (the top of the M temple)
  var lightGold = [1.0, 0.92, 0.45, 1.0];
  drawTriangle(
    [-1.000,  0.200,  -0.333,  0.200,  -0.667,  0.600], lightGold); // T4 roof
 
  // ====================================================
  // Flag pole (gray/white) + flag (red)
  var poleColor = [0.75, 0.75, 0.75, 1.0];
  // Pole itself (thin tall triangle)
  drawTriangle(
    [ 0.111, -1.000,   0.333, -1.000,   0.222,  1.000], poleColor); // pole
 
  // Flag banner (bright red)
  var flagRed = [0.85, 0.15, 0.1, 1.0];
  drawTriangle(
    [ 0.222,  1.000,   0.222,  0.200,   0.889,  0.600], flagRed); // flag main
 
  // Flag bottom edge fill (slightly darker red)
  var flagDark = [0.65, 0.1, 0.07, 1.0];
  drawTriangle(
    [ 0.333,  0.468,   0.333,  0.736,   0.556,  0.600], flagDark); // flag detail
}
