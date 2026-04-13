class Circle {
  constructor() {
    this.type = 'circle';
    this.position = [0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 10.0;
    this.segments = 10;
  }

  render() {
    var xy = this.position;
    var rgba = this.color;
    var radius = this.size / 200;
    var segs = this.segments;

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // Draw circle as a triangle fan from center
    var angleStep = (2 * Math.PI) / segs;
    for (var i = 0; i < segs; i++) {
      var a1 = i * angleStep;
      var a2 = (i + 1) * angleStep;
      drawTriangle([
        xy[0],                           xy[1],
        xy[0] + radius * Math.cos(a1),   xy[1] + radius * Math.sin(a1),
        xy[0] + radius * Math.cos(a2),   xy[1] + radius * Math.sin(a2)
      ]);
    }
  }
}
