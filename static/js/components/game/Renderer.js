import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class Renderer {
	constructor(canvas) {
		this.renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: false, // Make this configurable
			alpha: true,
			powerPreference: "high-performance",
			stencil: false,
		});

		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1;
	}
}
