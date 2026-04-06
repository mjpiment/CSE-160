# CSE 160 — Assignment 0: Vector Library

**Michael Pimentel** | mjpiment@ucsc.edu

---

## Overview

This assignment extends the `cuon-matrix-cse160.js` matrix library with a full set of `Vector3` operations, and builds an interactive canvas app to visualize them.

---

## Files

| File | Description |
|---|---|
| `asg0.html` | Main page — canvas + controls UI |
| `asg0.js` | Drawing logic and event handlers |
| `lib/cuon-matrix-cse160.js` | Vector3 library with implemented operations |
| `lib/vectorTests.html` | In-browser test runner (open directly in browser) |

---

## Features

### Draw (red = v1, blue = v2)
Enter x/y coordinates for v1 and v2, click **Draw** to render both vectors from the canvas center. Coordinates are scaled ×20 so a unit vector is clearly visible.

### Operations (result shown in green)
Select an operation and click **Draw Operation**:

| Operation | Result |
|---|---|
| `add` | v3 = v1 + v2 |
| `sub` | v3 = v1 − v2 |
| `mul` | v3 = v1 × scalar, v4 = v2 × scalar |
| `div` | v3 = v1 / scalar, v4 = v2 / scalar |
| `magnitude` | Prints \|\|v1\|\| and \|\|v2\|\| to the console |
| `normalize` | Draws unit vectors for v1 and v2; prints magnitudes to console |
| `angleBetween` | Prints angle (degrees) between v1 and v2 to the console |
| `area` | Prints area of the triangle formed by v1 and v2 to the console |

### Vector Tests
Open `lib/vectorTests.html` in a browser to run 9 automated pass/fail tests covering all Vector3 methods.
