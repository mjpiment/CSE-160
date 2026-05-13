class Camera {
  constructor() {
    this.fov = 60;
    this.eye = [16, 1.5, 29];
    this.at  = [16, 1.5, 28];
    this.up  = [0, 1, 0];

    // Yaw: horizontal angle in degrees (270 = looking toward -Z / north)
    // Pitch: vertical angle, clamped to [-89, 89]
    this.yaw   = 270;
    this.pitch = 0;

    this.viewMatrix       = new Matrix4();
    this.projectionMatrix = new Matrix4();
    this._dirty = true;
    this._recompute();
  }

  _updateAt() {
    const yRad = this.yaw   * Math.PI / 180;
    const pRad = this.pitch * Math.PI / 180;
    const cp = Math.cos(pRad);
    this.at[0] = this.eye[0] + cp * Math.cos(yRad);
    this.at[1] = this.eye[1] + Math.sin(pRad);
    this.at[2] = this.eye[2] + cp * Math.sin(yRad);
    this._dirty = true;
  }

  _recompute() {
    if (!this._dirty) return;
    this.viewMatrix.setLookAt(
      this.eye[0], this.eye[1], this.eye[2],
      this.at[0],  this.at[1],  this.at[2],
      this.up[0],  this.up[1],  this.up[2]
    );
    this._dirty = false;
  }

  setAspect(aspect) {
    this.projectionMatrix.setPerspective(this.fov, aspect, 0.1, 1000);
  }

  getViewMatrix() { this._recompute(); return this.viewMatrix; }
  getProjMatrix() { return this.projectionMatrix; }

  // Flat forward (no Y) for walking / collision
  _fwd() {
    const yRad = this.yaw * Math.PI / 180;
    return [Math.cos(yRad), 0, Math.sin(yRad)];
  }

  // Right vector: perpendicular to fwd in XZ plane
  _right() {
    const f = this._fwd();
    return [-f[2], 0, f[0]];
  }

  moveForward(d) {
    const f = this._fwd();
    this.eye[0] += f[0]*d; this.eye[2] += f[2]*d;
    this._updateAt();
  }

  moveBackwards(d) { this.moveForward(-d); }

  moveLeft(d) {
    const r = this._right();
    this.eye[0] -= r[0]*d; this.eye[2] -= r[2]*d;
    this._updateAt();
  }

  moveRight(d) { this.moveLeft(-d); }

  panLeft(alpha)  { this.yaw -= alpha; this._updateAt(); }
  panRight(alpha) { this.yaw += alpha; this._updateAt(); }

  // dx/dy in pixels
  panMouse(dx, dy) {
    this.yaw   += dx * 0.15;
    this.pitch -= dy * 0.15;
    this.pitch  = Math.max(-89, Math.min(89, this.pitch));
    this._updateAt();
  }
}
