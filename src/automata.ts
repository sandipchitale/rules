export class Automata {
  width: number;
  height: number;
  rule: number;
  // stored as 0 or 1
  grid: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.rule = 0;
    this.grid = new Uint8Array(width * height);
    this.reset();
  }

  setRule(rule: number) {
    this.rule = rule;
  }

  reset() {
    this.grid.fill(0);
    // Seed the first row with a single cell in the center
    const centerX = Math.floor(this.width / 2);
    this.grid[centerX] = 1;
  }

  run() {
    // Start from row 1 (row 0 is the seed)
    for (let y = 1; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const left = this.grid[(y - 1) * this.width + (x - 1 + this.width) % this.width];
        const center = this.grid[(y - 1) * this.width + x];
        const right = this.grid[(y - 1) * this.width + (x + 1) % this.width];
        
        const pattern = (left << 2) | (center << 1) | right;
        const state = (this.rule >> pattern) & 1;
        
        this.grid[y * this.width + x] = state;
      }
    }
  }

  // Helper to fill a texture buffer (RGBA)
  fillTextureBuffer(buffer: Uint8Array) {
    for (let i = 0; i < this.width * this.height; i++) {
        const cell = this.grid[i];
        const color = cell ? 255 : 0;
        const index = i * 4;
        buffer[index] = color;     // R
        buffer[index + 1] = color; // G
        buffer[index + 2] = color; // B
        buffer[index + 3] = 255;   // A
    }
  }
}
