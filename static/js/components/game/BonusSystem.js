import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class BonusType {
	static BUBBLE = 0;
	static LIGHTNING = 1;
	static COIN = 2;
	static HEART = 3;
}
export class Bonuses {
	constructor(scene) {
		this.bonusGroup = new THREE.Group();
		this.scene = scene;
	}

	async createBonuses() {
		const loader = new GLTFLoader();
		const models = [
			{ type: BonusType.BUBBLE, path: "/js/components/game/Bubble.glb" },
			{ type: BonusType.LIGHTNING, path: "/js/components/game/Lightning.glb" },
			{ type: BonusType.COIN, path: "/js/components/game/Coin.glb" },
			{ type: BonusType.HEART, path: "/js/components/game/Heart.glb" },
		];

		try {
			await Promise.all(models.map((model) => this.loadModel(model, loader)));
			this.scene.add(this.bonusGroup);
			return this.bonusGroup;
		} catch (error) {
			console.error("Failed to load bonus models:", error);
			throw error;
		}
	}

	loadModel(model, loader) {
		return new Promise((resolve, reject) => {
			loader.load(
				model.path,
				(gltf) => {
					const bonusModel = gltf.scene;
					bonusModel.scale.set(0.1, 0.1, 0.1);
					bonusModel.visible = false;
					this.bonusGroup.add(bonusModel);
					resolve();
				},
				null,
				reject,
			);
		});
	}

	hidePowerups() {
		if (!this.bonusGroup) {
			console.error("Model group is not initialized.");
			return;
		}
		this.bonusGroup.children.forEach((child) => {
			child.visible = false;
		});
	}

	displayPowerUp(PowerUp, position) {
		this.hidePowerups();
		this.bonusGroup.children[BonusType.BUBBLE].visible = true;
		//this.bonusGroup.children[PowerUp].visible = true;
		this.bonusGroup.position.set(position.x, position.y, position.z);
	}
}
