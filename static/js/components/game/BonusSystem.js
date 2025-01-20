import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class BonusType {
	static TABLE = 0;
	static PADDLE = 1;
	static PADDLERED = 2;
	static BALL = 3;
}
export class Bonuses {
	constructor(scene) {
		this.bonusGroup = new THREE.Group();
		this.scene = scene;
		this.tabble = null;
		this.paddle = null;
		this.paddleRed = null;
		this.ball = null;
	}

	async createBonuses() {
		const loader = new GLTFLoader();

		try {
			// Load each model individually
			this.table = await this.loadModel("/js/components/game/Table.glb", loader);
			this.paddle = await this.loadModel("/js/components/game/Paddle.glb", loader);
			this.paddleRed = await this.loadModel("/js/components/game/PaddleRed.glb", loader);
			this.ball = await this.loadModel("/js/components/game/Ball.glb", loader);

			// Add models to scene
			this.scene.add(this.table);
			this.scene.add(this.paddle);
			this.scene.add(this.paddleRed);
			this.scene.add(this.ball);

			return {
				table: this.table,
				paddle: this.paddle,
				paddleRed: this.paddleRed,
				ball: this.ball,
			};
		} catch (error) {
			console.error("Failed to load bonus models:", error);
			throw error;
		}
	}

	loadModel(path, loader) {
		return new Promise((resolve, reject) => {
			loader.load(
				path,
				(gltf) => {
					const model = gltf.scene;
					model.scale.set(1.2, 1.2, 1.2);
					model.rotation.x = Math.PI / 2;
					model.rotation.y = Math.PI / 2;
					model.position.z = -2;
					model.visible = true;
					resolve(model);
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

	//displayPowerUp(PowerUp, position) {
	//	this.hidePowerups();
	//	this.bonusGroup.children[BonusType.BUBBLE].visible = true;
	//this.bonusGroup.children[PowerUp].visible = true;
	//	this.bonusGroup.position.set(position.x, position.y, position.z);
	//}
}
