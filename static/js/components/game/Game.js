import { Renderer } from "./Renderer.js";
import { SceneManager } from "./SceneManager.js";
import { InputManager } from "./InputManager.js";
import { ParticleSystem } from "./ParticleSystem.js";
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class Renderers {
	constructor(canvas, antialiasing) {
		this.renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: antialiasing, // Make this configurable
			alpha: true,
			powerPreference: "high-performance",
			stencil: false,
			samples: antialiasing ? 8 : 0, // Only use MSAA if anti-aliasing is enabled
		});

		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1;
	}
}

export class Game {
	constructor(canvas, ws) {
		this.ws = ws;
		this.initialized = false;
		this.gameStarted = false;

		this.antialiasing = false;
		this.bloom = false;
		this.renderer = new Renderers(canvas, this.antialiasing);

		this.sceneManager = new SceneManager(this.renderer.renderer, this.antialiasing, this.bloom);
		this.inputManager = new InputManager(this.ws);

		this.setupWebSocket();

		this.lastTime = 0;

		//DEBUG
		this.enableDebugMode(true);
		this.axis = "x";
		this.mode = "position";
		this.factor = 0.1;
	}

	async initialize(initData) {
		try {
			await this.sceneManager.initialize();
			this.particleSystem = new ParticleSystem(this.sceneManager.scene);
			await this.handleInit(initData);

			this.animate();
			this.initialized = true;
			this.sendInitDone();
		} catch (error) {
			console.error("Failed to initialize game:", error);
		}
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

	async handleInit(data) {
		const positions = data.positions;

		this.sceneManager.topBorder.position.set(positions.borders.top.x, positions.borders.top.y, positions.borders.top.z);
		this.sceneManager.bottomBorder.position.set(positions.borders.bottom.x, positions.borders.bottom.y, positions.borders.bottom.z);
		this.sceneManager.leftBorder.position.set(positions.borders.left.x, positions.borders.left.y, positions.borders.left.z);
		this.sceneManager.rightBorder.position.set(positions.borders.right.x, positions.borders.right.y, positions.borders.right.z);

		this.sceneManager.textManager.createInitialTexts(data.player.left.name, data.player.right.name, data.player.left.rank, data.player.right.rank, 0x005fff, 0x00ffff);
	}

	sendInitDone() {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			console.log(`Init sucessfull`); // Debug log
			this.ws.send(
				JSON.stringify({
					type: "init_confirm",
				}),
			);
		}
		this.printSceneObjects();
	}

	printSceneObjects() {
		console.log("Scene Objects:");
		this.sceneManager.scene.children.forEach((child, index) => {
			console.log(`Object ${index}:`, child);
		});
	}

	handleGameUpdate(data) {
		let game_end = false;
		if (data.player) {
			const leftPos = data.positions.player_left;
			const rightPos = data.positions.player_right;
			if (this.sceneManager.debugMod) {
				this.sceneManager.updateDebugPositions(data.positions);
				this.sceneManager.leftPaddle.visible = false;
				this.sceneManager.rightPaddle.visible = false;
				this.sceneManager.ball.visible = false;
			} else {
				if (this.sceneManager.leftPaddle) {
					this.sceneManager.leftPaddle.position.set(rightPos.x, rightPos.y - 0.2, rightPos.z);
					this.sceneManager.leftPaddle.visible = true;
				}
				if (this.sceneManager.rightPaddle) {
					this.sceneManager.rightPaddle.position.set(leftPos.x, leftPos.y - 0.2, leftPos.z);
					this.sceneManager.rightPaddle.visible = true;
				}
				if (data.positions.ball && this.sceneManager.ball) {
					this.sceneManager.ball.position.set(data.positions.ball.x, data.positions.ball.y, data.positions.ball.z);
					this.sceneManager.ball.visible = true;
				}
			}
		}
		if (data.trajectory) {
			this.sceneManager.updateTrajectory(data.trajectory);
		}
		if (data.events && data.events.length > 0) {
			data.events.forEach((event) => {
				if (event.type === "score" && event.position) {
					const scorePosition = new THREE.Vector3(event.position.x, event.position.y, event.position.z);
					this.emitParticles(scorePosition);
					console.log("Spawning particles at:", scorePosition);
				}
				if (event.type === "game_end" && event.winner) {
					game_end = true;
					//this.uiManager.setOverText(event.winner + " wins");
					//	this.uiManager.setOverlayVisibility(true);
					this.ws.close(1000);
					console.log("Websocket closed");
					this.handleGameEnd();
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
		if (!this.gameStarted && game_end == false) {
			this.gameStarted = true;
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
					objectToModify = this.sceneManager.text;
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
