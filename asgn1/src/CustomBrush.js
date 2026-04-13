// CustomBrush.js
// The brush designer uses the same shape/color/size controls as the main canvas.
// Each element placed in the designer stores its type, color, size, and local position.
// When stamping on the main canvas the stored colors are preserved and positions scale
// with the size slider.

var brushSetupDone = false;
var brushGl, brushAPosition, brushUFragColor, brushUSize;

// Each entry: { type, localX, localY, color, size, segments }
var g_brushElements = [];

const BRUSH_VSHADER = `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_Size;
  }
`;

const BRUSH_FSHADER = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }
`;

function setupBrushCanvas() {
  if (brushSetupDone) return;
  brushSetupDone = true;

  var brushCanvas = document.getElementById('brush_canvas');
  brushGl = brushCanvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!brushGl) { console.log('Failed to get brush WebGL context'); return; }

  if (!initShaders(brushGl, BRUSH_VSHADER, BRUSH_FSHADER)) {
    console.log('Failed to init brush shaders'); return;
  }

  brushAPosition = brushGl.getAttribLocation(brushGl.program, 'a_Position');
  brushUFragColor = brushGl.getUniformLocation(brushGl.program, 'u_FragColor');
  brushUSize = brushGl.getUniformLocation(brushGl.program, 'u_Size');

  brushGl.clearColor(0.1, 0.1, 0.1, 1.0);
  renderBrushCanvas();

  brushCanvas.onmousedown = function(ev) { onBrushClick(ev, brushCanvas); };
  brushCanvas.onmousemove = function(ev) { if (ev.buttons == 1) onBrushClick(ev, brushCanvas); };
}

function onBrushClick(ev, brushCanvas) {
  var rect = brushCanvas.getBoundingClientRect();
  var x = ((ev.clientX - rect.left) - brushCanvas.width / 2) / (brushCanvas.width / 2);
  var y = (brushCanvas.height / 2 - (ev.clientY - rect.top)) / (brushCanvas.height / 2);

  // Use whatever the main canvas controls are currently set to
  g_brushElements.push({
    type:     g_selectedType,
    localX:   x,
    localY:   y,
    color:    g_selectedColor.slice(),
    size:     g_selectedSize,
    segments: g_selectedSegments
  });
  renderBrushCanvas();
}

// ── Brush canvas rendering (uses brushGl) ──────────────────────────────────

function renderBrushCanvas() {
  brushGl.clear(brushGl.COLOR_BUFFER_BIT);
  for (var i = 0; i < g_brushElements.length; i++) {
    var el = g_brushElements[i];
    var c = el.color;
    brushGl.uniform4f(brushUFragColor, c[0], c[1], c[2], c[3]);

    if (el.type === SQUARE) {
      brushRenderPoint(el.localX, el.localY, el.size);
    } else if (el.type === TRIANGLE) {
      brushRenderTriangle(el.localX, el.localY, el.size / 200);
    } else if (el.type === CIRCLE) {
      brushRenderCircle(el.localX, el.localY, el.size / 200, el.segments);
    }
  }
}

function brushRenderPoint(x, y, size) {
  brushGl.uniform1f(brushUSize, size);
  var buf = brushGl.createBuffer();
  brushGl.bindBuffer(brushGl.ARRAY_BUFFER, buf);
  brushGl.bufferData(brushGl.ARRAY_BUFFER, new Float32Array([x, y]), brushGl.DYNAMIC_DRAW);
  brushGl.vertexAttribPointer(brushAPosition, 2, brushGl.FLOAT, false, 0, 0);
  brushGl.enableVertexAttribArray(brushAPosition);
  brushGl.drawArrays(brushGl.POINTS, 0, 1);
  brushGl.disableVertexAttribArray(brushAPosition);
}

function brushRenderTriangle(x, y, s) {
  var h = s * Math.sqrt(3) / 2;
  brushRenderTriVerts([
    x - s/2, y - h/3,
    x + s/2, y - h/3,
    x,       y + 2*h/3
  ]);
}

function brushRenderCircle(x, y, radius, segs) {
  var step = (2 * Math.PI) / segs;
  for (var i = 0; i < segs; i++) {
    var a1 = i * step, a2 = (i + 1) * step;
    brushRenderTriVerts([
      x,                          y,
      x + radius * Math.cos(a1),  y + radius * Math.sin(a1),
      x + radius * Math.cos(a2),  y + radius * Math.sin(a2)
    ]);
  }
}

function brushRenderTriVerts(verts) {
  var buf = brushGl.createBuffer();
  if (!buf) return;
  brushGl.bindBuffer(brushGl.ARRAY_BUFFER, buf);
  brushGl.bufferData(brushGl.ARRAY_BUFFER, new Float32Array(verts), brushGl.DYNAMIC_DRAW);
  brushGl.vertexAttribPointer(brushAPosition, 2, brushGl.FLOAT, false, 0, 0);
  brushGl.enableVertexAttribArray(brushAPosition);
  brushGl.drawArrays(brushGl.TRIANGLES, 0, 3);
  brushGl.disableVertexAttribArray(brushAPosition);
}

// ── Main canvas stamping (uses main gl) ────────────────────────────────────

function renderCustomBrushAt(worldX, worldY, brushSize) {
  if (g_brushElements.length === 0) return;
  var posScale = brushSize / 200; // scales element positions outward from center

  for (var i = 0; i < g_brushElements.length; i++) {
    var el = g_brushElements[i];
    var wx = worldX + el.localX * posScale;
    var wy = worldY + el.localY * posScale;
    var c  = el.color;

    gl.uniform4f(u_FragColor, c[0], c[1], c[2], c[3]);

    if (el.type === SQUARE) {
      gl.disableVertexAttribArray(a_Position);
      gl.vertexAttrib3f(a_Position, wx, wy, 0.0);
      gl.uniform1f(u_Size, el.size);
      gl.drawArrays(gl.POINTS, 0, 1);

    } else if (el.type === TRIANGLE) {
      var s = (el.size / 200) * posScale;
      var h = s * Math.sqrt(3) / 2;
      drawTriangle([
        wx - s/2, wy - h/3,
        wx + s/2, wy - h/3,
        wx,       wy + 2*h/3
      ]);

    } else if (el.type === CIRCLE) {
      var radius = (el.size / 200) * posScale;
      var step = (2 * Math.PI) / el.segments;
      for (var j = 0; j < el.segments; j++) {
        var a1 = j * step, a2 = (j + 1) * step;
        drawTriangle([
          wx,                         wy,
          wx + radius * Math.cos(a1), wy + radius * Math.sin(a1),
          wx + radius * Math.cos(a2), wy + radius * Math.sin(a2)
        ]);
      }
    }
  }
}

class CustomBrushShape {
  constructor() {
    this.type = 'custom';
    this.position = [0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 10.0;
  }

  render() {
    renderCustomBrushAt(this.position[0], this.position[1], this.size);
  }
}
