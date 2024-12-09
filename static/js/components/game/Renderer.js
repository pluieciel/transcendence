//import * as THREE from 'three';
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class Renderer {
	constructor(canvas) {
		//this.canvas = document.getElementById(canvasId);
		this.canvas = canvas;
		this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
		this.renderer.setSize(window.innerWidth - 75, window.innerHeight - 20);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	}

	render(scene, camera) {
		this.renderer.render(scene, camera);
	}
}
