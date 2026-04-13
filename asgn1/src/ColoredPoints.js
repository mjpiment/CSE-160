// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =`
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_Size;
  }
`



// Fragment shader program
var FSHADER_SOURCE =`
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }
`


// Global Variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;


function setupWebGL(){
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  //gl = getWebGLContext(canvas);
  
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true});

  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
}

function connectVariablesToGLSL(){
  
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }
  
  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_Size
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }
}

const SQUARE = 0;
const TRIANGLE = 1;
const CIRCLE = 2;
const CUSTOM = 3;

// Globals related to UI elements
let g_selectedColor = [1.0, 1.0, 1.0, 1.0]
let g_selectedSize = 10;
let g_selectedType = SQUARE;
let g_selectedSegments = 10;


function addActionsforHtmlUI() {
  // Clear Canvas Event
  document.getElementById('clear_canvas').onclick = function () { g_shapesList = []; renderAllShapes(); };

  // Squares Button
  document.getElementById('squares').onclick = function () { g_selectedType = SQUARE };

  // Triangles Button
  document.getElementById('triangles').onclick = function () { g_selectedType = TRIANGLE };

  // Circles Button
  document.getElementById('circles').onclick = function () { g_selectedType = CIRCLE };

  // Draw the Picture
  document.getElementById('draw_picture').onclick = function () { drawPicture(); };

  // Make Your Own Brush — toggle the brush designer panel
  document.getElementById('make_brush').onclick = function () {
    var section = document.getElementById('brush_section');
    var visible = section.style.display !== 'none';
    section.style.display = visible ? 'none' : 'block';
    if (!visible) setupBrushCanvas();
  };

  // Use as Brush — switch drawing mode to custom brush
  document.getElementById('use_brush').onclick = function () {
    g_selectedType = CUSTOM;
    document.getElementById('brush_section').style.display = 'none';
  };

  // Clear Brush
  document.getElementById('clear_brush').onclick = function () {
    g_brushElements = [];
    renderBrushCanvas();
  };

  // Red Slider
  document.getElementById('red').addEventListener('input', function() { g_selectedColor[0] = this.value / 100; updateColorPreview(); });

  // Green Slider
  document.getElementById('green').addEventListener('input', function() { g_selectedColor[1] = this.value / 100; updateColorPreview(); });

  // Blue Slider
  document.getElementById('blue').addEventListener('input', function() { g_selectedColor[2] = this.value / 100; updateColorPreview(); });

  // Size Slider
  document.getElementById('shape_size').addEventListener('input', function() { g_selectedSize = this.value; });

  // Segment Count Slider (circles)
  document.getElementById('seg_count').addEventListener('input', function() { g_selectedSegments = this.value; });


}


function main() {

  // Sets the WebGL up
  setupWebGL();

  // Connect variables to GLSL
  connectVariablesToGLSL();

  addActionsforHtmlUI();

  // Register function (event handler) to be called on a mouse press
  // canvas.onmousedown = click;
  canvas.onmousemove = function(ev) { if (ev.buttons == 1) {click(ev)} };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  updateColorPreview();
}

function updateColorPreview() {
  var r = Math.floor(g_selectedColor[0] * 255);
  var g = Math.floor(g_selectedColor[1] * 255);
  var b = Math.floor(g_selectedColor[2] * 255);
  document.getElementById('color_preview').style.backgroundColor = 'rgb(' + r + ',' + g + ',' + b + ')';
}

function convertCoords(ev){
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return ([x, y]);
}


function renderAllShapes(){
  
  var startTime = performance.now();


  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  //var len = g_points.length;
  var len = g_shapesList.length;

  for(var i = 0; i < len; i++) {

    g_shapesList[i].render();
    
  }

  var duration = performance.now() - startTime;
  
  sendTextToHTML("numdot: " + len + " ms: " + Math.floor(duration) + " fps: " + Math.floor(1000/duration), "numdot");
}



var g_shapesList = [];

// var g_points = [];  // The array for the position of a mouse press
// var g_colors = [];  // The array to store the color of a point
// var g_sizes = [];   // The array to store the size of the point

function click(ev) {
  // Convert the coordinates to [0,1]
  [x, y] = convertCoords(ev);
  // Store the coordinates to g_points array
  // g_points.push([x, y]);
  // g_colors.push(g_selectedColor.slice());
  // g_sizes.push(g_selectedSize);


  let point;

  if (g_selectedType == SQUARE) {
    point = new Point();
  } else if (g_selectedType == TRIANGLE) {
    point = new Triangle();
  } else if (g_selectedType == CIRCLE) {
    point = new Circle();
    point.segments = g_selectedSegments;
  } else if (g_selectedType == CUSTOM) {
    point = new CustomBrushShape();
  }
  point.position = [x, y];
  point.color = g_selectedColor.slice();
  point.size = g_selectedSize;
  g_shapesList.push(point);


  // Store the coordinates to g_points array
  // if (x >= 0.0 && y >= 0.0) {      // First quadrant
  //   g_colors.push([1.0, 0.0, 0.0, 1.0]);  // Red
  // } else if (x < 0.0 && y < 0.0) { // Third quadrant
  //   g_colors.push([0.0, 0.0, 1.0, 1.0]);  // Green
  // } else {                         // Others
  //   g_colors.push([1.0, 0.0, 1.0, 1.0]);  // White
  // }

  // Dev tool to check color on console
  console.log("Color at click time:", g_selectedColor); // add this


  // Render shapes onto the canvas
  renderAllShapes();

} 


function sendTextToHTML(text, htmlID) {
  var htmlELm = document.getElementById(htmlID);
  if (!htmlELm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlELm.innerHTML = text;
}


