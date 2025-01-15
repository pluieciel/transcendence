import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class Bonuses {
	constructor() {
		this.defaultPath = "/js/components/game/";
		this.bubble = this.defaultPath + "Bubble.glb";
	}

	getBonus() {
		const loader = new GLTFLoader();
		const modelGroup = new THREE.Group();

		loader.load(
			"/js/components/game/Bubble.glb",
			(gltf) => {
				const bubbleModel = gltf.scene;
				bubbleModel.scale.set(0.1, 0.1, 0.1);
				this.modelGroup.add(bubbleModel);

				// Load Lightning (powerup) after bubble is loaded
				loader.load(
					"/js/components/game/Lightning.glb",
					(gltf) => {
						const powerupModel = gltf.scene;
						powerupModel.scale.set(0.1, 0.1, 0.1);
						// Adjust position relative to bubble if needed
						powerupModel.position.set(0, 0, 0);
						this.modelGroup.add(powerupModel);

						// Add the complete group to the scene
						this.scene.add(this.modelGroup);

						// Store reference to the group
						this.combinedModel = this.modelGroup;
					},
					null,
					(error) => console.error("Error loading Lightning:", error),
				);
			},
			null,
			(error) => console.error("Error loading Bubble:", error),
		);
	}
}
