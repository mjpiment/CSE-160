var g_vertexBuffer = null;
function drawTriangle3D(vertices) {
  var n = 3; // The number of vertices

  // Create a buffer object
  if (g_vertexBuffer == null) {
    g_vertexBuffer = gl.createBuffer();
    if (!g_vertexBuffer) {
      console.log('Failed to create the buffer object');
      return -1;
    }
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
  // Write data into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, n);
}

class Cube {
  constructor() {
    this.type = 'cube';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
  }

  render() {
    var rgba = this.color;

    // Pass the matrix to u_ModelMatrix attribute
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // Front of cube
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    drawTriangle3D( [0,0,0, 1,1,0, 1,0,0] );
    drawTriangle3D( [0,0,0, 0,1,0, 1,1,0] );

    // Top of cube
    gl.uniform4f(u_FragColor, rgba[0]*0.9, rgba[1]*0.9, rgba[2]*0.9, rgba[3]);
    drawTriangle3D( [0,1,0, 0,1,1, 1,1,1] );
    drawTriangle3D( [0,1,0, 1,1,1, 1,1,0] );

    // Right of cube
    gl.uniform4f(u_FragColor, rgba[0]*0.8, rgba[1]*0.8, rgba[2]*0.8, rgba[3]);
    drawTriangle3D( [1,0,0, 1,1,0, 1,1,1] );
    drawTriangle3D( [1,0,0, 1,1,1, 1,0,1] );

    // Left of cube
    gl.uniform4f(u_FragColor, rgba[0]*0.7, rgba[1]*0.7, rgba[2]*0.7, rgba[3]);
    drawTriangle3D( [0,0,0, 0,0,1, 0,1,1] );
    drawTriangle3D( [0,0,0, 0,1,1, 0,1,0] );

    // Bottom of cube
    gl.uniform4f(u_FragColor, rgba[0]*0.6, rgba[1]*0.6, rgba[2]*0.6, rgba[3]);
    drawTriangle3D( [0,0,0, 1,0,0, 1,0,1] );
    drawTriangle3D( [0,0,0, 1,0,1, 0,0,1] );

    // Back of cube
    gl.uniform4f(u_FragColor, rgba[0]*0.5, rgba[1]*0.5, rgba[2]*0.5, rgba[3]);
    drawTriangle3D( [0,0,1, 1,0,1, 1,1,1] );
    drawTriangle3D( [0,0,1, 1,1,1, 0,1,1] );
  }
}
