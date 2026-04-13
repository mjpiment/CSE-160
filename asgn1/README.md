# Assignment 1: WebGL Paint Program

**Michael Pimentel — mjpiment@ucsc.edu**

## What I Did

### Core Features (Tasks 1–11)

- **Points (Squares):** Click or drag on the canvas to stamp squares. Uses `gl.POINTS` with a configurable `gl_PointSize`.
- **Triangles:** Draws equilateral triangles at the cursor position, built from a `drawTriangle(vertices)` function and a `Triangle` class.
- **Circles:** Draws filled circles approximated as a triangle fan. Segment count is adjustable with a slider (3–100 segments).
- **Color picker:** Three RGB sliders (0–100) control the fill color for all shape types. A live color preview swatch shows the current color.
- **Size slider:** Controls the size of all shapes uniformly (10–40).
- **Clear button:** Wipes the canvas and empties the shape list.
- **Performance display:** Shows shape count, render time (ms), and FPS.

### Hardcoded Picture (Task 12)

- **Draw Picture button:** Renders a hardcoded scene built entirely from triangles — a night sky with a golden "M" temple, a flag, a green hill, and stars.
- Implemented in `Picture.js` using a separate `drawPictureTriangle(vertices, color)` function to avoid name conflicts.

### Awesomeness — Custom Brush Designer (Task 13)

**Make Your Own Brush** button opens a second WebGL canvas (the Brush Designer). You can:

1. **Design a brush** by clicking or dragging on the 200×200 Brush Designer canvas. Each click stamps a triangle at that position in local normalized space.
2. **Clear** the brush with the "Clear Brush" button.
3. **Use as Brush** — closes the designer and switches the drawing mode to your custom brush.

When painting with the custom brush on the main canvas, each stamp reproduces your full brush shape at the cursor position. The **color sliders** and **size slider** both apply correctly — the brush is re-colored and re-scaled on every stamp. This means one brush design can produce vastly different results depending on color and size settings.

The brush designer runs its own independent WebGL context (`CustomBrush.js`) so it never interferes with the main canvas state.

## File Structure

```
src/
  ColoredPoints.html   — Main page, all UI
  ColoredPoints.js     — Main entry point, event wiring, shape dispatch
  Point.js             — Square (gl.POINTS) shape class
  Triangle.js          — Triangle class + shared drawTriangle() helper
  Circle.js            — Circle class (triangle fan)
  CustomBrush.js       — Brush designer canvas + CustomBrushShape class
  Picture.js           — Hardcoded scene drawn with triangles
lib/
  cuon-utils.js
  webgl-utils.js
  webgl-debug.js
```
