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
		this.ballMat = null;
	}

	async createBonuses() {
		const loader = new GLTFLoader();

		try {
			// Load each model individually
			this.table = await this.loadModel("/js/components/game/Table.glb", loader);
			this.paddle = await this.loadModel("/js/components/game/Paddle.glb", loader);
			this.paddleRed = await this.loadModel("/js/components/game/PaddleRed.glb", loader);
			this.ball = await this.loadModelBall("/js/components/game/Ball.glb", loader);

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

	loadModelBall(path, loader) {
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
					model.traverse((obj) => {
						if (obj.isMesh) {
							const materials = obj.material;
							if (materials.name == "Material.001") {
								this.ballMat = materials;
								this.ballMat.color.set(0x676a6e);
								this.ballMat.emissive.set(0x676a6e);
							}
						}
					});

					resolve(model);
				},
				null,
				reject,
			);
		});
	}

	updateBallColor(color, emissionColor) {
		if (this.ball && this.ballMat) {
			this.ballMat.color.set(color);
			this.ballMat.emissive.set(emissionColor);
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
					// model.traverse((obj) => {
					// 	if (obj.isMesh) {
					// 		const materials = obj.material;

					// 		// If the material is a multi-material array, loop through each material
					// 		if (Array.isArray(materials)) {
					// 			console.log("Multiple Material:", materials);
					// 			materials.forEach((material, index) => {
					// 				console.log(material.name);
					// 			});
					// 		} else {
					// 			// Single material
					// 			if (materials.name == "Material.003") {
					// 				materials.color.set(0xff0000);
					// 				materials.emissive.set(0xff0000);
					// 				console.log("Color changed");
					// 			} else {
					// 				console.log("Material name isnt {Material.003} but {" + materials.name + "}");
					// 			}
					// 		}
					// 	}
					// });

					resolve(model);
				},
				null,
				reject,
			);
		});
	}

	listTextures(material) {
		if (material.map) {
			console.log("Diffuse Map:", material.map);
		}
		if (material.normalMap) {
			console.log("Normal Map:", material.normalMap);
		}
		if (material.roughnessMap) {
			console.log("Roughness Map:", material.roughnessMap);
		}
		if (material.metalnessMap) {
			console.log("Metalness Map:", material.metalnessMap);
		}
		if (material.emissiveMap) {
			console.log("Emissive Map:", material.emissiveMap);
		}
		if (material.aoMap) {
			console.log("Ambient Occlusion Map:", material.aoMap);
		}
		// Add any other texture types that you may expect in the material
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
