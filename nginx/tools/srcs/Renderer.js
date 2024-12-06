import * as THREE from '/static/three/build/three.module.js';

export class Renderer {
	constructor(canvasId) {
		this.canvas = document.getElementById(canvasId);
		this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	}

	render(scene, camera) {
		this.renderer.render(scene, camera);
	}
}

