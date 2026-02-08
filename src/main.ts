import './style.css';
import { Automata } from './automata';
import { Visualizer } from './visualizer';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="controls">
    <div>
      <label for="ruleInput">Rule (0-255):</label>
      <input type="number" id="ruleInput" min="0" max="255" value="30" />
    </div>
    
    <div>
      <button id="runBtn">Run Automaton</button>
      <button id="resetBtn">Reset</button>
      <button id="randomBtn">Random Rule</button>
    </div>

    <div>
      <div style="display: flex; flex-direction: column; gap: 5px; border: 1px solid #444; padding: 5px; border-radius: 4px; margin-bottom: 5px;">
        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
          <input type="checkbox" id="autoModeCheck" /> Auto Mode
        </label>
        <label style="display: flex; align-items: center; gap: 5px;">
          Delay: <span id="delayValue">5</span>s
          <input type="range" id="delayInput" min="1" max="5" step="1" value="5" />
        </label>
      </div>
    </div>
    
    <div>
      <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
        <input type="checkbox" id="colorModeCheck" /> Color Mode
      </label>
    </div>
    
    <div>
      <small id="statusText">Ready</small>
    </div>
    
    <div id="analysis" style="margin-top: 20px; border-top: 1px solid #444; padding-top: 10px; min-height: 120px; width: 350px;">
        <div><strong>Wolfram Class:</strong> <span id="wolframClass">...</span></div>
        <div style="font-size: 0.85em; color: #aaa; margin-bottom: 5px; min-height: 2.5em;" id="classDesc">...</div>
        <div><strong>Symmeties:</strong> <span id="symmetries">...</span></div>
    </div>
  </div>
`;

import { analyzeRule } from './analysis';

const WIDTH = 256;
const HEIGHT = 256;

// Logic
const automata = new Automata(WIDTH, HEIGHT);
// Set initial rule
automata.setRule(30);

// Visible
const appContainer = document.getElementById('app')!;
const visualizer = new Visualizer(appContainer, WIDTH, HEIGHT, automata.grid);

// Run initial
run();

function run() {
  automata.reset();
  automata.run();
  visualizer.updateData(automata.grid);
  visualizer.updateData(automata.grid);
  const statusEl = document.getElementById('statusText');
  if (statusEl) statusEl.textContent = `Rule ${automata.rule} rendered.`;
  
  // Analyze
  const result = analyzeRule(automata.rule, automata);
  
  const wolframEl = document.getElementById('wolframClass');
  const classDescEl = document.getElementById('classDesc');
  const symEl = document.getElementById('symmetries');
  
  if (wolframEl) wolframEl.textContent = result.wolframClass;
  if (classDescEl) classDescEl.textContent = result.description;
  if (symEl) symEl.textContent = result.symmetries.join(', ');
}

// Controls
const ruleInput = document.getElementById('ruleInput') as HTMLInputElement;
const runBtn = document.getElementById('runBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const randomBtn = document.getElementById('randomBtn') as HTMLButtonElement;
const autoModeCheck = document.getElementById('autoModeCheck') as HTMLInputElement;
const colorModeCheck = document.getElementById('colorModeCheck') as HTMLInputElement;
const delayInput = document.getElementById('delayInput') as HTMLInputElement;
const delayValue = document.getElementById('delayValue') as HTMLSpanElement;

let autoInterval: number | undefined;

function startAutoMode() {
  stopAutoMode();
  const delay = parseInt(delayInput.value) * 1000;
  
  autoInterval = setInterval(() => {
    let r = automata.rule + 1;
    if (r > 255) r = 0;
    
    ruleInput.value = r.toString();
    automata.setRule(r);
    run();
  }, delay);
}

function stopAutoMode() {
  if (autoInterval) {
    clearInterval(autoInterval);
    autoInterval = undefined;
  }
}

autoModeCheck.addEventListener('change', () => {
  if (autoModeCheck.checked) {
    startAutoMode();
  } else {
    stopAutoMode();
  }
});

delayInput.addEventListener('input', () => {
  delayValue.textContent = delayInput.value;
  if (autoModeCheck.checked) {
    startAutoMode();
  }
});

colorModeCheck.addEventListener('change', () => {
  visualizer.setColorMode(colorModeCheck.checked);
  // Re-render current state
  visualizer.updateData(automata.grid);
});

// Stop auto mode if user manually changes rule or clicks buttons?
// User said: "Using slider it should just stop the auto mode."
// Implies "slider" (checkbox) is the control to stop it.
// But usually manual interaction should probably pause/stop it?
// I will just let the checkbox control it for now to follow instructions strictly.


runBtn.addEventListener('click', () => {
  let r = parseInt(ruleInput.value);
  if (isNaN(r)) r = 0;
  if (r < 0) r = 0;
  if (r > 255) r = 255;
  ruleInput.value = r.toString();
  
  automata.setRule(r);
  run();
});

resetBtn.addEventListener('click', () => {
  automata.reset();
  visualizer.updateData(automata.grid);
  const statusEl = document.getElementById('statusText');
  if (statusEl) statusEl.textContent = `Grid reset. Ready.`;
});

randomBtn.addEventListener('click', () => {
  const r = Math.floor(Math.random() * 256);
  ruleInput.value = r.toString();
  automata.setRule(r);
  run();
});

// Allow Enter key in input
ruleInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    runBtn.click();
  }
});
