import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

//Bloom
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

//Anti aliasing
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";

export class PostProcessing {
	constructor(renderer, quality, scene, camera, preview = false) {
		let antiAliasing = quality > 1;
		let bloom = quality > 0;
		this.renderTarget = null;
		this.renderer = renderer;
		this.camera = camera;

		let bloomParams = {
			exposure: 0,
			bloomStrength: 0,
			bloomThreshold: 0.85,
			bloomRadius: 0.4,
			enabled: bloom,
		};
		if (preview) {
			const canvas = renderer.domElement;
			const width = canvas.clientWidth;
			const height = canvas.clientHeight;
			const pixelRatio = Math.min(window.devicePixelRatio, 2);

			this.renderTarget = new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, {
				type: THREE.HalfFloatType,
				samples: antiAliasing ? 8 : 0,
				format: THREE.RGBAFormat,
				colorSpace: THREE.SRGBColorSpace,
				stencilBuffer: false,
			});
		} else {
			this.renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
				type: THREE.HalfFloatType,
				samples: antiAliasing ? 8 : 0,
				format: THREE.RGBAFormat,
				colorSpace: THREE.SRGBColorSpace,
				stencilBuffer: false,
			});
		}

		this.composer = new EffectComposer(renderer, this.renderTarget);
		const renderPass = new RenderPass(scene, camera);
		renderPass.clearColor = new THREE.Color(0x000000);
		renderPass.clearAlpha = 0;
		this.composer.addPass(renderPass);


		if (bloom) {
			const bloomPass = new UnrealBloomPass(
				new THREE.Vector2(window.innerWidth, window.innerHeight),
				bloomParams.bloomStrength,
				bloomParams.bloomRadius,
				bloomParams.bloomThreshold,
			);
			bloomPass.threshold = 0.85;
			bloomPass.strength = 0.6;
			bloomPass.radius = 1;
			bloomPass.quality = 5;
			this.composer.addPass(bloomPass);
		}

		if (antiAliasing) {
			const smaaPass = new SMAAPass(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio());
			this.composer.addPass(smaaPass);
		}
		if (!preview)
			window.addEventListener("resize", this.onWindowResize.bind(this));
	}

	onWindowResize() {
		const width = window.innerWidth;
		const height = window.innerHeight;
		const pixelRatio = Math.min(window.devicePixelRatio, 2);

		if (this.camera) {

			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix();

			this.renderer.setSize(width, height);
			this.renderer.setPixelRatio(pixelRatio);

			this.renderTarget.setSize(width * pixelRatio, height * pixelRatio);

			this.composer.setSize(width, height);
			this.composer.setPixelRatio(pixelRatio);
		}
	}

	dispose() {
		
		window.removeEventListener("resize", this.onWindowResize.bind(this));

		if (this.renderTarget) {
			this.renderTarget.dispose();
			this.renderTarget = null;
		}

		if (this.composer) {
			this.composer.passes.forEach((pass) => {
				if (pass.dispose) pass.dispose();
			});
			this.composer = null;
		}
		
	}
}
