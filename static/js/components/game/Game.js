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

		// this.keydownListener = this.enableDebugMode.bind(this);
		// window.addEventListener("keydown", this.keydownListener);
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
		if (data.keys)
		{
			const playerLeftKeys = data.keys.player_left;
			const playerRightKeys = data.keys.player_right;

			this.sceneManager.setButtonBrightness("left", true, playerLeftKeys.includes("UP"))
			this.sceneManager.setButtonBrightness("left", false, playerLeftKeys.includes("DOWN"))
			this.sceneManager.setButtonBrightness("right", true, playerRightKeys.includes("UP"))
			this.sceneManager.setButtonBrightness("right", false, playerRightKeys.includes("DOWN"))
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
						
					}
				}
				if (event.type === "game_end") {
					
					if (this.onGameEnd) {
						
						this.onGameEnd(event);
						this.dispose();
					}
					this.ws.close(1000);
					
				}
				if (event.type == "ball_last_hitter") {
					this.sceneManager.updateBallColor(event.color, event.color);
				}
				if (event.type == "event") {
					try {
						
						if (event.announce) {
							this.showBanner(event.icon, event.name, event.description);
						}
						if (event.action != "none") {
							
							this.activateEvent(event);
						}
					} catch (e) {
						
					}
				}
			});
		}
	}

	activateEvent(event) {
		
		switch (event.name) {
			case "Lights Out":
				if (event.action == "on") {
					
					this.sceneManager.light.visible = true;
					this.sceneManager.light.intensity = 8;
				} else {
					
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
			case "Invisibility Field":
				{
					if (event.action == 'smoke')
					{
						this.sceneManager.invisibilityField.visible = true;
					}
					else if (event.action == 'reset')
					{
						this.sceneManager.invisibilityField.visible = false;
					}
				}
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
		
		this.sceneManager.scene.children.forEach((child, index) => {
			
		});
	}

	// enableDebugMode(event) {
	// 	let objectToModify = null;
	// 	if (event.code === "Space") {
	// 		this.sceneManager.toggleDebugMode();
	// 	}
	// 	if (this.editor) {
	// 		if (event.code == "KeyG") {
				
				
	// 			this.mode = "position";
	// 		} else if (event.code == "KeyO") {
	// 			objectToModify = this.sceneManager.camera;
	// 			if (objectToModify && objectToModify.geometry) {
	// 				objectToModify.geometry.computeBoundingBox();
	// 				const box = objectToModify.geometry.boundingBox;
	// 				const centerX = objectToModify.position.x + ((box.max.x + box.min.x) / 2) * objectToModify.scale.x;
					
	// 			}
	// 		} else if (event.code == "KeyS") {
	// 			this.mode = "scale";
				
	// 		} else if (event.code == "KeyZ") {
	// 			this.mode = "zoom";
				
	// 		} else if (event.code == "KeyR") {
	// 			this.mode = "rotate";
				
	// 		} else if (event.code == "NumpadAdd") {
	// 			if (this.mode == "scale") {
	// 				if (this.axis == "x") {
	// 					objectToModify.scale.x += this.factor;
						
	// 				} else if (this.axis == "y") {
	// 					objectToModify.scale.y += this.factor;
						
	// 				} else if (this.axis == "z") {
	// 					objectToModify.scale.z += this.factor;
						
	// 				} else if (this.axis == "all") {
	// 					objectToModify.scale.x += this.factor;
	// 					objectToModify.scale.y += this.factor;
	// 					objectToModify.scale.z += this.factor;
						
						
						
	// 				}
	// 			} else if (this.mode == "position") {
	// 				if (this.axis == "x") {
	// 					objectToModify.position.x += this.factor;
	// 					// Calculate and display center position
	// 					if (objectToModify.geometry) {
	// 						objectToModify.geometry.computeBoundingBox();
	// 						const box = objectToModify.geometry.boundingBox;
	// 						const centerX = objectToModify.position.x + ((box.max.x + box.min.x) / 2) * objectToModify.scale.x;
							
							
	// 					}
	// 				} else if (this.axis == "y") {
	// 					objectToModify.position.y += this.factor;
						
	// 				} else if (this.axis == "z") {
	// 					objectToModify.position.z += this.factor;
						
	// 				}
	// 			} else if (this.mode == "rotate") {
	// 				if (this.axis == "x") {
	// 					objectToModify.rotation.x += this.factor;
						
	// 				} else if (this.axis == "y") {
	// 					objectToModify.rotation.y += this.factor;
						
	// 				} else if (this.axis == "z") {
	// 					objectToModify.rotation.z += this.factor;
						
	// 				}
	// 			} else if (this.mode == "zoom") {
	// 				if (objectToModify.fov) {
	// 					objectToModify.fov -= this.factor * 10;
	// 					objectToModify.updateProjectionMatrix();
						
	// 				} else {
						
	// 				}
	// 			}
	// 		} else if (event.code == "NumpadSubtract") {
	// 			if (this.mode == "scale") {
	// 				if (this.axis == "x") {
	// 					objectToModify.scale.x -= this.factor;
						
	// 				} else if (this.axis == "y") {
	// 					objectToModify.scale.y -= this.factor;
						
	// 				} else if (this.axis == "z") {
	// 					objectToModify.scale.z -= this.factor;
						
	// 				} else if (this.axis == "all") {
	// 					objectToModify.scale.x -= this.factor;
	// 					objectToModify.scale.y -= this.factor;
	// 					objectToModify.scale.z -= this.factor;
						
						
						
	// 				}
	// 			} else if (this.mode == "position") {
	// 				if (this.axis == "x") {
	// 					objectToModify.position.x -= this.factor;
						
	// 				} else if (this.axis == "y") {
	// 					objectToModify.position.y -= this.factor;
						
	// 				} else if (this.axis == "z") {
	// 					objectToModify.position.z -= this.factor;
						
	// 				}
	// 			} else if (this.mode == "rotate") {
	// 				if (this.axis == "x") {
	// 					objectToModify.rotation.x -= this.factor;
						
	// 				} else if (this.axis == "y") {
	// 					objectToModify.rotation.y -= this.factor;
						
	// 				} else if (this.axis == "z") {
	// 					objectToModify.rotation.z -= this.factor;
						
	// 				}
	// 			} else if (this.mode == "zoom") {
	// 				if (objectToModify.fov) {
	// 					objectToModify.fov += this.factor * 10;
	// 					objectToModify.updateProjectionMatrix();
						
	// 				} else {
						
	// 				}
	// 			}
	// 		} else if (event.code == "KeyX") {
	// 			this.axis = "x";
				
	// 		} else if (event.code == "KeyY") {
	// 			this.axis = "y";
				
	// 		} else if (event.code == "KeyZ") {
	// 			this.axis = "z";
				
	// 		} else if (event.code == "KeyA") {
	// 			this.axis = "all";
				
	// 		}
	// 	}
	// }
}
