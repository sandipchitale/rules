import * as THREE from 'three';

export class Visualizer {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  texture: THREE.DataTexture;
  mesh: THREE.Mesh;
  
  width: number;
  height: number;
  data: Uint8Array;

  constructor(container: HTMLElement, width: number, height: number, initialData: Uint8Array) {
    this.width = width;
    this.height = height;
    
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    // Camera - Orthographic for 2D feel
    // Frustum will be set in onResize
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    this.camera.position.z = 10;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Use pixelated upscaling
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // Texture
    // Copy initial data to a 4-channel buffer for texture
    const size = width * height;
    this.data = new Uint8Array(size * 4);
    // fill initial dummy data
    this.updateTextureBuffer(initialData);

    this.texture = new THREE.DataTexture(
      this.data,
      width,
      height,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    this.texture.needsUpdate = true;
    this.texture.magFilter = THREE.NearestFilter; // Key for cellular look
    this.texture.minFilter = THREE.NearestFilter;

    // Plane
    // Scale it to respect aspect ratio match
    const geometry = new THREE.PlaneGeometry(width, height);
    // We want the texture to be oriented correctly. 
    // By default UVs map (0,0) bottom-left to (1,1) top-right.
    // Our grid is row 0 at top? Automata logic usually prints row 0 at top.
    // Three.js texture coordinate (0,0) is bottom-left.
    // So row 0 of our data will appear at the bottom unless we flip Y.
    this.texture.flipY = true;

    const material = new THREE.MeshBasicMaterial({ map: this.texture });
    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);

    // Initial resize
    this.onResize();
    window.addEventListener('resize', () => this.onResize());

    // Render loop
    this.animate();
  }

  updateData(newData: Uint8Array) {
    this.updateTextureBuffer(newData);
    this.texture.needsUpdate = true;
  }

  updateTextureBuffer(source: Uint8Array) {
     // Automata.ts has a helper for this, but passed data is just the grid (0/1).
     // Wait, Automata already has fillTextureBuffer?? 
     // Ah, I see `fillTextureBuffer` in `Automata` accepts the buffer to fill.
     // So here `updateData` should probably receive the `Automata` instance or just let `Automata` fill `this.data`.
     // But to keep it decoupled, I'll redo the loop here or expect RGBA data?
     // Let's expect `Automata` to do the filling or do it here. 
     // Doing it here keeps Automata just math.
     
    const colorHelper = new THREE.Color();
    for (let i = 0; i < this.width * this.height; i++) {
        const cell = source[i];
        const index = i * 4;

        if (cell) {
            if (this.useColor) {
               // Calculate row index
               const row = Math.floor(i / this.width);
               
               // Hue cycles from 0 to 1 based on row position.
               // To smooth the blue-pink transition (around hue 0.8-0.9), we can
               // use the full spectrum but maybe adjust lightness or saturation slightly
               // if it looks too dark.
               // Re-mapping slightly to avoid the very end if that's where the "abruptness" is?
               // Actually, blue is around 0.66, pink/magenta around 0.83, red at 0/1.
               // A full 0->1 cycle is a standard rainbow.
               // Let's try 0 to 0.85 to stop at magenta/pink and avoid wrapping back to red if that's the issue.
               // User said "transition around blue to pink is abrupt".
               // Blue is ~240deg (0.66), Pink ~300deg (0.83).
               // If we map 0..height to 0..0.85, we get Red->Yellow->Green->Blue->Magenta/Pink.
               
               const hue = (row / this.height) * 0.85; 
               
               // Full saturation, 50% lightness for bright rainbow colors
               // Use constant lightness to ensure smooth transitions without abrupt jumps.
               // Or use a gentle smooth curve if needed, but the previous 'if' created hard edges.
               // Let's use constant 0.5 for now, which is standard HSL rainbow.
               // If blue is too dark, we can boost it smoothly:
               // lightness = 0.5 + 0.1 * Math.exp(-20 * Math.pow(hue - 0.66, 2));
               // But usually constant L is best for "rainbow" unless specific need.
               // The user complained about "abrupt" which was likely the step function.
               

               // Hue from 0 (Red) to 0.85 (Magenta).
               // Pure Blue (0.66) often creates a dark band in HSL.
               // We boost lightness smoothly around hue 0.66 to prevent this "abrupt" dark transition.
               
               let lightness = 0.5;
               
               // Center of Blue is ~0.66.
               // We apply a smooth boost curve (Gaussian-like or triangular)
               // Range of boost: roughly 0.55 to 0.77
               const blueCenter = 0.66;
               const dist = Math.abs(hue - blueCenter);
               const width = 0.15;
               
               if (dist < width) {
                   // Boost up to +0.2 at the center
                   const boost = 0.2 * (1 - dist / width);
                   lightness += boost;
               }


               colorHelper.setHSL(hue, 1.0, lightness);
               
               this.data[index] = Math.floor(colorHelper.r * 255);     // R
               this.data[index + 1] = Math.floor(colorHelper.g * 255); // G
               this.data[index + 2] = Math.floor(colorHelper.b * 255); // B
            } else {
               this.data[index] = 255;
               this.data[index + 1] = 255;
               this.data[index + 2] = 255;
            }
            this.data[index + 3] = 255;   // A
        } else {
            this.data[index] = 0;
            this.data[index + 1] = 0;
            this.data[index + 2] = 0;
            this.data[index + 3] = 255;
        }
    }
  }

  useColor = false;
  setColorMode(enabled: boolean) {
      this.useColor = enabled;
      // We need to re-render with current data. 
      // But updateTextureBuffer needs `source` which we don't store here permanently?
      // Ah, data is in texture buffer? No, `source` is the automata grid (0/1).
      // We don't have access to automata grid here unless we store it.
      // But wait, `updateData` is called from main loop.
      // If we just set the flag, the next `run()` or update will fix it.
      // To apply immediately, we'd need the current grid state.
      // Let's rely on the caller to call updateData or we just store the last valid grid?
      // Actually `visualizer` doesn't persist the `grid` source, only pixel data.
      // So checking "Color Mode" might not update instantly unless we re-send data.
      // It's better if `main.ts` handles the update call.
  }

  onResize() {
    const aspect = window.innerWidth / window.innerHeight;

    
    // We want to fit the grid entirely in view.
    // The grid geometry size is (width, height).
    // Let's say we want to view a vertical extent of 'height'.
    // If we set camera frustum top/bottom to height/2 and -height/2, it matches geometry height.
    
    let frustumHeight = this.height;
    let frustumWidth = frustumHeight * aspect;

    // If window is too narrow, we need to increase frustum height (zoom out) to fit width
    if (frustumWidth < this.width) {
        frustumWidth = this.width;
        frustumHeight = frustumWidth / aspect;
    }
    
    // Add some padding
    const padding = 1.1;
    frustumHeight *= padding;
    frustumWidth *= padding;

    this.camera.left = -frustumWidth / 2;
    this.camera.right = frustumWidth / 2;
    this.camera.top = frustumHeight / 2;
    this.camera.bottom = -frustumHeight / 2;

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }
}
