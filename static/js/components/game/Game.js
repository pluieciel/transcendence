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

		this.onGameEnd = null;
		this.ended = false;
		this.showBanner = null;
		this.setupWebSocket();
		this.lastTime = 0;

		//DEBUG
		this.axis = "x";
		this.mode = "position";
		this.factor = 0.1;
		this.editor = true;

		this.keydownListener = this.enableDebugMode.bind(this);
		window.addEventListener("keydown", this.keydownListener);
	}

	dispose() {
		console.warn("Disposing game");
		if (this.ws) {
			this.ws.close();
		}
	}

	clean() {
		if (this.sceneManager) {
			this.sceneManager.dispose();
		}
		if (this.renderer) {
			this.renderer.renderer.dispose();
		}
		this.initialized = false;
		this.ended = true;
		window.removeEventListener("keydown", this.keydownListener);
		this.inputManager.dispose();
	}

	async initialize(initData) {
		if (!window.app.settings.fetched) await window.app.getUserPreferences();
		this.renderer = new Renderer(this.canvas);
		this.sceneManager = new SceneManager(this.renderer.renderer, window.app.settings.quality);
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

		this.ws.onclose = () => {
			console.log("WebSocket closed");
			this.clean();
		};
	}

	emitParticles(position = new THREE.Vector3(0, 0, 0), color) {
		const particleCount = 170;
		const geometry = "sphere";
		const velocity = 0.3;
		const lifetime = 0.5;
		const size = 0.1;
		//orange 0xe67e00
		//cyan 0x00BDD1
		if (this.particleSystem) {
			this.particleSystem.emit(particleCount, geometry, velocity, lifetime, size, position, color);
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
		if (data.positions && this.sceneManager.debugMod) {
			this.sceneManager.updateDebugPositions(data.positions);
		} else if (data.positions) {
			this.sceneManager.updateObjectPosition(data.positions);
		}
		if (data.trajectory) {
			this.sceneManager.updateTrajectory(data.trajectory);
			this.sceneManager.showTrajectory(true);
		} else {
			this.sceneManager.showTrajectory(false);
		}
		if (data.events && data.events.length > 0) {
			data.events.forEach((event) => {
				if (event.type === "score" && event.position) {
					const scorePosition = new THREE.Vector3(event.position.x, event.position.y, event.position.z);
					this.emitParticles(scorePosition, event.color);
					this.sceneManager.shakeCamera(0.5, 280);
					try {
						this.sceneManager.textManager.updateScore("left", event.score_left.toString());
						this.sceneManager.textManager.updateScore("right", event.score_right.toString());
					} catch (e) {
						console.log(e);
					}
				}
				if (event.type === "game_end") {
					console.log("game end");
					if (this.onGameEnd) {
						console.log("calling game end fun");
						this.onGameEnd(event);
						this.dispose();
					}
					this.ws.close(1000);
					console.log("Websocket closed");
				}
				if (event.type == "ball_last_hitter") {
					this.sceneManager.updateBallColor(event.color, event.color);
				}
				if (event.type == "event") {
					try {
						console.log(event);
						if (event.announce) {
							this.showBanner(event.icon, event.name, event.description);
						}
						if (event.action != "none") {
							console.log("Activating event");
							this.activateEvent(event);
						}
					} catch (e) {
						console.log("Error showing banner" + e.message);
					}
				}
			});
		}
	}

	activateEvent(event) {
		console.log(event.name);
		switch (event.name) {
			case "Lights Out":
				if (event.action == "on") {
					console.log("lights turned on");
					this.sceneManager.light.visible = true;
					this.sceneManager.light.intensity = 8;
				} else {
					console.log("lights turned off");
					this.sceneManager.light.visible = false;
					this.sceneManager.light.intensity = 0;
				}
				break;
			case "Shrinking Paddles":
				if (event.action == "shrinkLeft") {
					this.sceneManager.leftPaddle.scale.x *= 0.9;
					this.sceneManager.paddles[0].scale.y *= 0.9;
				} else if (event.action == "shrinkRight") {
					this.sceneManager.rightPaddle.scale.x *= 0.9;
					this.sceneManager.paddles[1].scale.y *= 0.9;
				} else if (event.action == "reset") {
					this.sceneManager.leftPaddle.scale.x = this.sceneManager.base_paddle_height;
					this.sceneManager.rightPaddle.scale.x = this.sceneManager.base_paddle_height;
					this.sceneManager.paddles[0].scale.y = this.sceneManager.base_debug_height;
					this.sceneManager.paddles[1].scale.y = this.sceneManager.base_debug_height;
				}
				break;
		}
	}

	animate(currentTime) {
		if (this.ended == false) {
			requestAnimationFrame(this.animate.bind(this));
			const deltaTime = (currentTime - this.lastTime) / 1000;
			this.lastTime = currentTime;
			if (this.particleSystem) {
				this.particleSystem.update(deltaTime);
			}
			this.sceneManager.composer.render();
		}
	}

	/******************************DEBUG************************************/
	printSceneObjects() {
		console.log("Scene Objects:");
		this.sceneManager.scene.children.forEach((child, index) => {
			console.log(`Object ${index}:`, child);
		});
	}

	enableDebugMode(event) {
		let objectToModify = null;
		if (event.code === "Space") {
			this.sceneManager.toggleDebugMode();
		}
		if (this.editor) {
			if (event.code == "KeyG") {
				console.log("Entering position mode");
				console.log(objectToModify);
				this.mode = "position";
			} else if (event.code == "KeyO") {
				objectToModify = this.sceneManager.camera;
				if (objectToModify && objectToModify.geometry) {
					objectToModify.geometry.computeBoundingBox();
					const box = objectToModify.geometry.boundingBox;
					const centerX = objectToModify.position.x + ((box.max.x + box.min.x) / 2) * objectToModify.scale.x;
					console.log("Object set. Current center X: " + centerX);
				}
			} else if (event.code == "KeyS") {
				this.mode = "scale";
				console.log("Entering scale mode");
			} else if (event.code == "KeyZ") {
				this.mode = "zoom";
				console.log("Entering zoom mode");
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
				} else if (this.mode == "zoom") {
					if (objectToModify.fov) {
						objectToModify.fov -= this.factor * 10;
						objectToModify.updateProjectionMatrix();
						console.log("Zooming in, new FOV is : " + objectToModify.fov);
					} else {
						console.log("Object cannot zoom");
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
				} else if (this.mode == "zoom") {
					if (objectToModify.fov) {
						objectToModify.fov += this.factor * 10;
						objectToModify.updateProjectionMatrix();
						console.log("Zooming in, new FOV is : " + objectToModify.fov);
					} else {
						console.log("Object cannot zoom");
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
	}
}
