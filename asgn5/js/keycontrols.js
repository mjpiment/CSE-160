// Returns a live key-state object { w, a, s, d, space, shift }.
export function addKeyControls() {
  const keys = { w: false, a: false, s: false, d: false, space: false, shift: false };

  window.addEventListener('keydown', e => {
    switch (e.code) {
      case 'KeyW':     keys.w     = true; break;
      case 'KeyA':     keys.a     = true; break;
      case 'KeyS':     keys.s     = true; break;
      case 'KeyD':     keys.d     = true; break;
      case 'Space':    keys.space = true; e.preventDefault(); break;
      case 'ShiftLeft':
      case 'ShiftRight': keys.shift = true; break;
    }
  });

  window.addEventListener('keyup', e => {
    switch (e.code) {
      case 'KeyW':     keys.w     = false; break;
      case 'KeyA':     keys.a     = false; break;
      case 'KeyS':     keys.s     = false; break;
      case 'KeyD':     keys.d     = false; break;
      case 'Space':    keys.space = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': keys.shift = false; break;
    }
  });

  return keys;
}
