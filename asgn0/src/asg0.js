var canvas;
var ctx;

function main() {
  canvas = document.getElementById('example');
  if (!canvas) {
    console.log('Failed to retrieve the <canvas> element');
    return;
  }

  ctx = canvas.getContext('2d');

  // Black background
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw initial vectors
  var v1 = new Vector3([2.25, 2.25, 0]);
  drawVector(v1, 'red');
}

function drawVector(v, color) {
  var cx = canvas.width / 2;
  var cy = canvas.height / 2;
  var scale = 20;

  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + v.elements[0] * scale, cy - v.elements[1] * scale);
  ctx.stroke();
}

function handleDrawEvent() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var x1 = parseFloat(document.getElementById('x1').value);
  var y1 = parseFloat(document.getElementById('y1').value);
  var v1 = new Vector3([x1, y1, 0]);
  drawVector(v1, 'red');

  var x2 = parseFloat(document.getElementById('x2').value);
  var y2 = parseFloat(document.getElementById('y2').value);
  var v2 = new Vector3([x2, y2, 0]);
  drawVector(v2, 'blue');
}

function handleDrawOperationEvent() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var x1 = parseFloat(document.getElementById('x1').value);
  var y1 = parseFloat(document.getElementById('y1').value);
  var v1 = new Vector3([x1, y1, 0]);
  drawVector(v1, 'red');

  var x2 = parseFloat(document.getElementById('x2').value);
  var y2 = parseFloat(document.getElementById('y2').value);
  var v2 = new Vector3([x2, y2, 0]);
  drawVector(v2, 'blue');

  var op = document.getElementById('operation').value;
  var scalar = parseFloat(document.getElementById('scalar').value);

  if (op === 'add') {
    var v3 = new Vector3([x1, y1, 0]);
    v3.add(v2);
    drawVector(v3, 'green');
  } else if (op === 'sub') {
    var v3 = new Vector3([x1, y1, 0]);
    v3.sub(v2);
    drawVector(v3, 'green');
  } else if (op === 'mul') {
    var v3 = new Vector3([x1, y1, 0]);
    v3.mul(scalar);
    drawVector(v3, 'green');
    var v4 = new Vector3([x2, y2, 0]);
    v4.mul(scalar);
    drawVector(v4, 'green');
  } else if (op === 'div') {
    var v3 = new Vector3([x1, y1, 0]);
    v3.div(scalar);
    drawVector(v3, 'green');
    var v4 = new Vector3([x2, y2, 0]);
    v4.div(scalar);
    drawVector(v4, 'green');
  } else if (op === 'magnitude') {
    var mag1 = new Vector3([x1, y1, 0]).magnitude();
    var mag2 = new Vector3([x2, y2, 0]).magnitude();
    console.log('Magnitude of v1: ' + mag1);
    console.log('Magnitude of v2: ' + mag2);
  } else if (op === 'normalize') {
    var mag1 = new Vector3([x1, y1, 0]).magnitude();
    var mag2 = new Vector3([x2, y2, 0]).magnitude();
    console.log('Magnitude of v1: ' + mag1);
    console.log('Magnitude of v2: ' + mag2);
    var v3 = new Vector3([x1, y1, 0]);
    v3.normalize();
    drawVector(v3, 'green');
    var v4 = new Vector3([x2, y2, 0]);
    v4.normalize();
    drawVector(v4, 'green');
  } else if (op === 'angleBetween') {
    console.log('Angle: ' + angleBetween(v1, v2));
  } else if (op === 'area') {
    console.log('Area of the triangle: ' + areaTriangle(v1, v2));
  }
}

function angleBetween(v1, v2) {
  var d = Vector3.dot(v1, v2);
  var mag1 = v1.magnitude();
  var mag2 = v2.magnitude();
  var cosAlpha = d / (mag1 * mag2);
  // Clamp to [-1, 1] to guard against floating-point drift
  cosAlpha = Math.max(-1, Math.min(1, cosAlpha));
  return Math.acos(cosAlpha) * (180 / Math.PI);
}

function areaTriangle(v1, v2) {
  var cross = Vector3.cross(v1, v2);
  return cross.magnitude() / 2;
}
