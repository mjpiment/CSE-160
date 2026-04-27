# CSE 160 — Assignment 2: Blocky Eagle

This project renders a stylized “blocky” eagle in WebGL and places it in a valley environment (terrain, mountains, trees, grass, clouds, lighting, and fog).

It also includes a **Fly Mode** where you can soar through the world with third‑person camera follow.

## How to run

- Open `src/BlockyAnimal.html` in a browser (Chrome recommended).
  - If your browser blocks local file loading, run a simple local server in the assignment folder and open the served page instead.

## Controls (normal view)

- **Mouse drag**: orbit camera
- **Alt + drag** (or middle mouse drag): roll the camera
- **Mouse wheel**: zoom

UI buttons/sliders in the page control animation and pose values.

## Fly Mode

Click the **Fly Mode** button and then **Start**.

### Flight controls

- **Mouse**: look / steer (yaw + pitch)
- **A / D** (or **Left / Right arrows**): turn (bank)
- **W / Space** (or **Up arrow**): flap / add thrust
- **S / Shift** (or **Down arrow**): dive / tuck
- **Esc**: pause menu (pointer lock releases)

### Notes

- Fly mode uses pointer lock for smooth mouse steering.
- The camera is a third‑person “chase” camera with its own smoothing so it stays stable while still following the bird.

## Files

- `src/BlockyAnimal.html`: UI + canvas page
- `src/BlockyAnimal.js`: WebGL scene, eagle model, environment, and fly mode
- `src/Shapes.js`: shape helpers (spheres, cones, cylinders, etc.)

