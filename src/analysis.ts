import { Automata } from './automata';

export interface AnalysisResult {
  wolframClass: string;
  description: string;
  symmetries: string[];
}

// Known Class 4 rules (Complex/Universal)
// Source: Wolfram MathWorld & Wikipedia
const CLASS_4_RULES = new Set([110, 124, 137, 147, 193, 54]);

export function analyzeRule(rule: number, automata: Automata): AnalysisResult {
  const { width, height, grid } = automata;
  
  // 1. Determine Wolfram Class provided heuristic or lookups
  let wolframClass = "Class 3 (Chaotic/Aperiodic)";
  let description = "Chaotic, random-like patterns.";

  if (CLASS_4_RULES.has(rule)) {
    wolframClass = "Class 4 (Complex)";
    description = "Complex, localized structures, potential for universal computation.";
  } else {
    // Heuristic Checks
    if (isClass1(grid, width, height)) {
        wolframClass = "Class 1 (Uniform)";
        description = "Evolves to a homogenous state.";
    } else if (isClass2(grid, width, height)) {
        wolframClass = "Class 2 (Periodic/Stable)";
        description = "Evolves to simple separated periodic structures.";
    }
    // else default to Class 3
  }

  // 2. Detect Symmetries
  const symmetries: string[] = [];
  
  if (checkVerticalSymmetry(grid, width, height)) {
    symmetries.push("Vertical (Left-Right)");
  }
  if (checkHorizontalSymmetry(grid, width, height)) {
    symmetries.push("Horizontal (Top-Bottom)");
  }
  // Check Diagonal (Top-Left to Bottom-Right)
  // Only valid if square-ish or we check the valid sub-square?
  // The user likely means visual diagonal symmetry of the generated image.
  if (width === height) { // Automata is square
    if(checkDiagonalSymmetry(grid, width)) {
        symmetries.push("Diagonal (TL-BR)");
    }
    if (checkAntiDiagonalSymmetry(grid, width)) {
        symmetries.push("Anti-Diagonal (TR-BL)");
    }
  }

  if (symmetries.length === 0) {
    symmetries.push("None");
  }

  return { wolframClass, description, symmetries };
}

function isClass1(grid: Uint8Array, width: number, height: number): boolean {
  // Check last row for uniformity (all 0 or all 1)
  const lastRowIdx = (height - 1) * width;
  const val = grid[lastRowIdx];
  for (let x = 1; x < width; x++) {
    if (grid[lastRowIdx + x] !== val) return false;
  }
  return true;
}

function isClass2(grid: Uint8Array, width: number, height: number): boolean {
    // Check for periodicity in the last few rows.
    // Check last 50 rows for repetition against the very last row
    const limit = Math.min(50, height - 1);
    const lastRowStart = (height - 1) * width;
    
    // We check if row (height-1) matches row (height-1-k)
    // If it does, and row (height-2) matches row (height-2-k), it's likely periodic.
    // But simple check: just if the current state has occurred recently.
    
    for (let k = 1; k <= limit; k++) {
        const checkRowStart = (height - 1 - k) * width;
        let match = true;
        for (let x = 0; x < width; x++) {
            if (grid[lastRowStart + x] !== grid[checkRowStart + x]) {
                match = false;
                break;
            }
        }
        if (match) return true; // Found a period k
    }
    return false;
}

function checkVerticalSymmetry(grid: Uint8Array, width: number, height: number): boolean {
    // Check symmetry around x = width/2
    for (let y = 0; y < height; y++) {
        const rowStart = y * width;
        for (let x = 0; x < width / 2; x++) {
            if (grid[rowStart + x] !== grid[rowStart + width - 1 - x]) {
                return false;
            }
        }
    }
    return true;
}

function checkHorizontalSymmetry(grid: Uint8Array, width: number, height: number): boolean {
    // Check symmetry around y = height/2
    for (let y = 0; y < height / 2; y++) {
        const rowTop = y * width;
        const rowBot = (height - 1 - y) * width;
        for (let x = 0; x < width; x++) {
            if (grid[rowTop + x] !== grid[rowBot + x]) {
                return false;
            }
        }
    }
    return true;
}

function checkDiagonalSymmetry(grid: Uint8Array, size: number): boolean {
    // A[y][x] == A[x][y]
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < y; x++) { // lower triangle
            if (grid[y * size + x] !== grid[x * size + y]) {
                return false;
            }
        }
    }
    return true;
}

function checkAntiDiagonalSymmetry(grid: Uint8Array, size: number): boolean {
    // A[y][x] == A[size-1-x][size-1-y]
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size - 1 - y; x++) {
            if (grid[y * size + x] !== grid[(size - 1 - x) * size + (size - 1 - y)]) {
                return false;
            }
        }
    }
    return true;
}
