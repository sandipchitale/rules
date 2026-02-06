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
     
    for (let i = 0; i < this.width * this.height; i++) {
        const cell = source[i];
        const color = cell ? 255 : 0;
        const index = i * 4;
        this.data[index] = color;     // R
        this.data[index + 1] = color; // G
        this.data[index + 2] = color; // B
        this.data[index + 3] = 255;   // A
    }    
  }

  onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const gridAspect = this.width / this.height;
    
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
