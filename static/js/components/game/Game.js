import { Renderer } from "./Renderer.js";
import { SceneManager } from "./SceneManager.js";
import { InputManager } from "./InputManager.js";
import { ParticleSystem } from "./ParticleSystem.js";
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class Game {
	constructor(canvas, ws) {
		this.ws = ws;
		this.initialized = false;
		this.antialiasing = false;
		this.canvas = canvas;
		this.bloom = true;
		this.renderer = null;

		this.sceneManager = null;
		this.inputManager = null;

		this.setupWebSocket();
		this.lastTime = 0;

		//DEBUG
		this.enableDebugMode(true);
		this.axis = "x";
		this.mode = "position";
		this.factor = 0.1;
	}

	async initialize(initData) {
		this.renderer = new Renderer(this.canvas);
		this.sceneManager = new SceneManager(this.renderer.renderer, this.antialiasing, this.bloom);
		this.inputManager = new InputManager(this.ws);
		await this.sceneManager.initialize(initData);
		this.particleSystem = new ParticleSystem(this.sceneManager.scene);
		this.animate();
		this.initialized = true;
		this.sendInitDone();
	}

	setupWebSocket() {
		this.ws.onmessage = (event) => {
			const message = JSON.parse(event.data);
			switch (message.type) {
				case "init":
					this.initialize(message.data);
					break;
				case "game_update":
					if (this.initialized) {
						this.handleGameUpdate(message.data);
					}
					break;
			}
		};
	}

	emitParticles(position = new THREE.Vector3(0, 0, 0)) {
		const particleCount = 40;
		const geometry = "square";
		const velocity = 0.2;
		const lifetime = 0.5;
		const size = 0.1;
		if (this.particleSystem) {
			this.particleSystem.emit(particleCount, geometry, velocity, lifetime, size, position);
		}
	}

	sendInitDone() {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(
				JSON.stringify({
					type: "init_confirm",
				}),
			);
		}
	}

	handleGameUpdate(data) {
		if (this.sceneManager.debugMod) {
			this.sceneManager.updateDebugPositions(data.positions);
		} else {
			this.sceneManager.updateObjectPosition(data.positions);
		}
		if (data.trajectory) {
			this.sceneManager.updateTrajectory(data.trajectory);
		}
		if (data.events && data.events.length > 0) {
			data.events.forEach((event) => {
				if (event.type === "score" && event.position) {
					const scorePosition = new THREE.Vector3(event.position.x, event.position.y, event.position.z);
					this.emitParticles(scorePosition);
					try {
						this.sceneManager.textManager.updateScore("left", event.score_left.toString());
						this.sceneManager.textManager.updateScore("right", event.score_right.toString());
					} catch (e) {
						console.log(e);
					}
				}
				if (event.type === "game_end" && event.winner) {
					this.ws.close(1000);
					console.log("Websocket closed");
				}
				if (event.type == "ball_last_hitter") {
					if (event.value == "RIGHT") {
						this.sceneManager.updateBallColor(0xff0000, 0xff0000);
					} else if (event.value == "LEFT") {
						this.sceneManager.updateBallColor(0x00ffff, 0x00ffff);
					} else {
						this.sceneManager.updateBallColor(0x676a6e, 0x676a6e);
					}
				}
			});
		}
	}

	animate(currentTime) {
		requestAnimationFrame(this.animate.bind(this));
		const deltaTime = (currentTime - this.lastTime) / 1000;
		this.lastTime = currentTime;
		if (this.particleSystem) {
			this.particleSystem.update(deltaTime);
		}
		this.sceneManager.composer.render();
	}

	/******************************DEBUG************************************/
	printSceneObjects() {
		console.log("Scene Objects:");
		this.sceneManager.scene.children.forEach((child, index) => {
			console.log(`Object ${index}:`, child);
		});
	}

	enableDebugMode(editor) {
		let objectToModify = null;
		window.addEventListener("keydown", (event) => {
			if (event.code === "Space") {
				this.sceneManager.toggleDebugMode();
			}
			if (editor) {
				if (event.code == "KeyG") {
					console.log("Entering position mode");
					console.log(objectToModify);
					this.mode = "position";
				} else if (event.code == "KeyO") {
					objectToModify = this.sceneManager.textManager.object;
					if (objectToModify && objectToModify.geometry) {
						objectToModify.geometry.computeBoundingBox();
						const box = objectToModify.geometry.boundingBox;
						const centerX = objectToModify.position.x + ((box.max.x + box.min.x) / 2) * objectToModify.scale.x;
						console.log("Object set. Current center X: " + centerX);
					}
				} else if (event.code == "KeyS") {
					this.mode = "scale";
					console.log("Entering scale mode");
				} else if (event.code == "KeyR") {
					this.mode = "rotate";
					console.log("Entering rotate mode");
				} else if (event.code == "NumpadAdd") {
					if (this.mode == "scale") {
						if (this.axis == "x") {
							objectToModify.scale.x += this.factor;
							console.log("New x scale is : " + objectToModify.scale.x);
						} else if (this.axis == "y") {
							objectToModify.scale.y += this.factor;
							console.log("New scale y is : " + objectToModify.scale.y);
						} else if (this.axis == "z") {
							objectToModify.scale.z += this.factor;
							console.log("New scale z is : " + objectToModify.scale.z);
						} else if (this.axis == "all") {
							objectToModify.scale.x += this.factor;
							objectToModify.scale.y += this.factor;
							objectToModify.scale.z += this.factor;
							console.log("New scale x is : " + objectToModify.scale.x);
							console.log("New scale y is : " + objectToModify.scale.y);
							console.log("New scale z is : " + objectToModify.scale.z);
						}
					} else if (this.mode == "position") {
						if (this.axis == "x") {
							objectToModify.position.x += this.factor;
							// Calculate and display center position
							if (objectToModify.geometry) {
								objectToModify.geometry.computeBoundingBox();
								const box = objectToModify.geometry.boundingBox;
								const centerX = objectToModify.position.x + ((box.max.x + box.min.x) / 2) * objectToModify.scale.x;
								console.log("New position x: " + objectToModify.position.x);
								console.log("Current center X: " + centerX);
							}
						} else if (this.axis == "y") {
							objectToModify.position.y += this.factor;
							console.log("New position y is : " + objectToModify.position.y);
						} else if (this.axis == "z") {
							objectToModify.position.z += this.factor;
							console.log("New position z is : " + objectToModify.position.z);
						}
					} else if (this.mode == "rotate") {
						if (this.axis == "x") {
							objectToModify.rotation.x += this.factor;
							console.log("New x rotation is : " + objectToModify.rotation.x);
						} else if (this.axis == "y") {
							objectToModify.rotation.y += this.factor;
							console.log("New rotation y is : " + objectToModify.rotation.y);
						} else if (this.axis == "z") {
							objectToModify.rotation.z += this.factor;
							console.log("New rotation z is : " + objectToModify.rotation.z);
						}
					}
				} else if (event.code == "NumpadSubtract") {
					if (this.mode == "scale") {
						if (this.axis == "x") {
							objectToModify.scale.x -= this.factor;
							console.log("New x scale is : " + objectToModify.scale.x);
						} else if (this.axis == "y") {
							objectToModify.scale.y -= this.factor;
							console.log("New scale y is : " + objectToModify.scale.y);
						} else if (this.axis == "z") {
							objectToModify.scale.z -= this.factor;
							console.log("New scale z is : " + objectToModify.scale.z);
						} else if (this.axis == "all") {
							objectToModify.scale.x -= this.factor;
							objectToModify.scale.y -= this.factor;
							objectToModify.scale.z -= this.factor;
							console.log("New scale x is : " + objectToModify.scale.x);
							console.log("New scale y is : " + objectToModify.scale.y);
							console.log("New scale z is : " + objectToModify.scale.z);
						}
					} else if (this.mode == "position") {
						if (this.axis == "x") {
							objectToModify.position.x -= this.factor;
							console.log("New x position is : " + objectToModify.position.x);
						} else if (this.axis == "y") {
							objectToModify.position.y -= this.factor;
							console.log("New y position is : " + objectToModify.position.y);
						} else if (this.axis == "z") {
							objectToModify.position.z -= this.factor;
							console.log("New z position is : " + objectToModify.position.z);
						}
					} else if (this.mode == "rotate") {
						if (this.axis == "x") {
							objectToModify.rotation.x -= this.factor;
							console.log("New x rotation is : " + objectToModify.rotation.x);
						} else if (this.axis == "y") {
							objectToModify.rotation.y -= this.factor;
							console.log("New rotation y is : " + objectToModify.rotation.y);
						} else if (this.axis == "z") {
							objectToModify.rotation.z -= this.factor;
							console.log("New rotation z is : " + objectToModify.rotation.z);
						}
					}
				} else if (event.code == "KeyX") {
					this.axis = "x";
					console.log("Axis set to x");
				} else if (event.code == "KeyY") {
					this.axis = "y";
					console.log("Axis set to y");
				} else if (event.code == "KeyZ") {
					this.axis = "z";
					console.log("Axis set to z");
				} else if (event.code == "KeyA") {
					this.axis = "all";
					console.log("Axis set to all");
				}
			}
		});
	}
}
