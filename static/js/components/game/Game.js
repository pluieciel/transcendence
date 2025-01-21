import { Renderer } from "./Renderer.js";
import { SceneManager } from "./SceneManager.js";
import { InputManager } from "./InputManager.js";
import { ParticleSystem } from "./ParticleSystem.js";
import { Loading } from "./Loading.js";
//import * as THREE from 'three';
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
		this.antialiasing = true;
		this.bloom = true;
		this.renderer = new Renderers(canvas, this.antialiasing);
		this.loading = new Loading();
		//this.renderer = new Renderer(canvas);
		this.sceneManager = new SceneManager(this.loading, this.renderer.renderer, this.antialiasing, this.bloom);
		this.inputManager = new InputManager();
		this.uiManager = this.sceneManager.UIManager;
		this.ws = ws;

		this.ball = null;
		this.initialized = false;
		this.gameStarted = false;
		this.sceneInitialized = false;

		this.onGameEnd = null;

		this.uiManager.setOverlayVisibility(true);
		this.uiManager.setOverText("Waiting for server...");

		this.setupWebSocket();

		this.particleSystem = null;
		this.lastTime = 0;
		this.axis = "x";
		this.mode = "position";
		this.factor = 0.01;

		this.enableDebugMode(true, this.sceneManager.bonuses.table);

		this.loading.onComplete = () => {
			this.sendInitDone();
			this.sceneManager.bonuses.displayPowerUp(0, new THREE.Vector3(0, 0, 0));
		};
	}

	handleUnrecognizedToken() {}

	setupWebSocket() {
		//const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		//const host = window.location.host;
		//const token = window.app.getToken();
		//if (!token) this.handleUnrecognizedToken();
		//const wsUrl = `${protocol}//${host}/ws/game/?token=${token}`;

		//this.ws = new WebSocket(wsUrl);
		this.inputManager.ws = this.ws;

		this.ws.onmessage = (event) => {
			const message = JSON.parse(event.data);
			this.uiManager.setOverText(message.message);
			if (message.type === "game_update") {
				this.handleGameUpdate(message.data);
			}
		};
	}

	initialize(data, side) {
		// this.sceneManager.setupLights();
		// this.sceneManager.createObjects();
		// this.sceneManager.hideObjects();
		this.ball = this.sceneManager.ball;
		this.sceneInitialized = this.validateSceneInitialization();
		this.animate();

		this.particleSystem = new ParticleSystem(this.sceneManager.scene);
		this.handleInit(data, side);
		this.sendInitDone();
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

	validateSceneInitialization() {
		return (
			this.sceneManager.paddles.length === 2 &&
			this.sceneManager.ball !== null &&
			this.sceneManager.topBorder !== null &&
			this.sceneManager.bottomBorder !== null &&
			this.sceneManager.leftBorder !== null &&
			this.sceneManager.rightBorder !== null &&
			this.sceneManager.playerLeftScore !== null &&
			this.sceneManager.playerRightScore !== null &&
			this.sceneManager.playerLeftName !== null &&
			this.sceneManager.playerRightName !== null
		);
	}

	handleInit(data) {
		const positions = data.positions;
		//this.sceneManager.paddles[0].position.set(positions.player_left.x, positions.player_left.y, positions.player_left.z);
		//this.sceneManager.paddles[1].position.set(positions.player_right.x, positions.player_right.y, positions.player_right.z);
		//this.sceneManager.paddles[0].visible = false;

		//this.sceneManager.ball.position.set(positions.ball.x, positions.ball.y, positions.ball.z);

		this.sceneManager.topBorder.position.set(positions.borders.top.x, positions.borders.top.y, positions.borders.top.z);
		this.sceneManager.bottomBorder.position.set(positions.borders.bottom.x, positions.borders.bottom.y, positions.borders.bottom.z);
		this.sceneManager.leftBorder.position.set(positions.borders.left.x, positions.borders.left.y, positions.borders.left.z);
		this.sceneManager.rightBorder.position.set(positions.borders.right.x, positions.borders.right.y, positions.borders.right.z);
		console.log("x " + positions.borders.left.x + " y : " + positions.borders.left.y + " z " + positions.borders.left.z);
		this.uiManager.updateNameLeft(data.player.left.name + " [" + data.player.left.rank + "]");
		this.uiManager.updateNameRight(data.player.right.name + " [" + data.player.right.rank + "]");

		this.uiManager.updateScoreLeft(data.player.left.score);
		this.uiManager.updateScoreRight(data.player.right.score);

		//this.sceneManager.showObjects();

		this.uiManager.setOverlayVisibility(true);
		this.uiManager.setOverText("Waiting for game start...");
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
	}

	handleGameUpdate(data) {
		let game_end = false;
		if (data.player) {
			const leftPos = data.positions.player_left;
			const rightPos = data.positions.player_right;

			if (this.sceneManager.debugMod) {
				this.sceneManager.updateDebugPositions(data.positions);
				this.sceneManager.bonuses.paddle.visible = false;
				this.sceneManager.bonuses.paddleRed.visible = false;
				this.sceneManager.bonuses.ball.visible = false;
			} else {
				if (this.sceneManager.bonuses.paddle) {
					this.sceneManager.bonuses.paddle.position.set(leftPos.x, leftPos.y - 0.2, leftPos.z);
					this.sceneManager.bonuses.paddle.visible = true;
				}
				if (this.sceneManager.bonuses.paddleRed) {
					this.sceneManager.bonuses.paddleRed.position.set(rightPos.x, rightPos.y - 0.2, rightPos.z);
					this.sceneManager.bonuses.paddleRed.visible = true;
				}

				if (data.positions.ball && this.sceneManager.bonuses.ball) {
					this.sceneManager.bonuses.ball.position.set(data.positions.ball.x, data.positions.ball.y, data.positions.ball.z);
					this.sceneManager.bonuses.ball.visible = true;
				}
			}

			this.uiManager.updateScoreLeft(data.player.left.score);
			this.uiManager.updateScoreRight(data.player.right.score);
		}

		if (data.trajectory) {
			this.sceneManager.updateTrajectory(data.trajectory);
		}

		if (data.events && data.events.length > 0) {
			console.log(data.events);
			data.events.forEach((event) => {
				if (event.type === "score" && event.position) {
					const scorePosition = new THREE.Vector3(event.position.x, event.position.y, event.position.z);
					this.emitParticles(scorePosition);
					//this.sceneManager.hideBall();
					console.log("Spawning particles at:", scorePosition);
				}
				if (event.type === "game_end" && event.winner) {
					game_end = true;
					this.uiManager.setOverText(event.winner + " wins");
					this.uiManager.setOverlayVisibility(true);
					this.ws.close(1000);
					console.log("Websocket closed");
					this.handleGameEnd();
				}
				if (event.type == "ball_last_hitter") {
					if (event.value == "RIGHT") {
						this.sceneManager.bonuses.updateBallColor(0xff0000, 0xff0000);
					} else {
						this.sceneManager.bonuses.updateBallColor(0x00ffff, 0x00ffff);
					}
				}
			});
		}

		if (!this.gameStarted && game_end == false) {
			this.gameStarted = true;
			this.uiManager.setOverlayVisibility(false);
		}
	}

	getScene() {
		return this.sceneManager.scene;
	}

	handleGameEnd() {
		// Your existing game end logic

		// Call the callback if it exists
		if (this.onGameEnd) {
			this.onGameEnd();
		}
	}

	animate(currentTime) {
		requestAnimationFrame(this.animate.bind(this));

		const deltaTime = (currentTime - this.lastTime) / 1000;
		this.lastTime = currentTime;
		//console.log(1 / deltaTime);

		if (this.particleSystem) {
			this.particleSystem.update(deltaTime);
		}
		if (this.sceneManager.model) {
			this.sceneManager.model.rotation.y += 0.02;
			//this.sceneManager.model.rotation.z += 0.02;
			//this.sceneManager.model.rotation.x += 0.02;
		}
		if (this.sceneManager.bonuses.ball) {
			this.sceneManager.bonuses.ball.rotation.x += 0.02;
			//this.sceneManager.bonuses.ball.rotation.z += 0.02;
			this.sceneManager.bonuses.ball.rotation.y += 0.02;
		}
		/*if (this.sceneManager.camera) {
			console.log(this.sceneManager.camera.position);
			console.log(this.sceneManager.camera.rotation);
			} else console.log("truc");*/

		this.sceneManager.composer.render();
		//this.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
	}

	enableDebugMode(editor, objectToModify) {
		window.addEventListener("keydown", (event) => {
			if (event.code === "Space") {
				this.sceneManager.toggleDebugMode();
			}
			if (editor) {
				if (event.code == "KeyG") {
					console.log("Entering position mode");
					this.mode = "position";
				} else if (event.code == "KeyS") {
					this.mode = "scale";
					console.log("Entering scale mode");
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
							console.log("New x position is : " + objectToModify.position.x);
						} else if (this.axis == "y") {
							objectToModify.position.y += this.factor;
							console.log("New position y is : " + objectToModify.position.y);
						} else if (this.axis == "z") {
							objectToModify.position.z += this.factor;
							console.log("New position z is : " + objectToModify.position.z);
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
				} else if (event.code == "KeyF") {
					this.sceneManager.bonuses.table.scale.set(4.14, 4.14, 4.14);
					this.sceneManager.bonuses.table.position.x = 0;
					this.sceneManager.bonuses.table.position.y = 1.59;
					this.sceneManager.bonuses.table.position.z = -30.72;
					this.sceneManager.bonuses.paddle.scale.set(0.6, 0.25, 0.5);
					this.sceneManager.bonuses.paddle.position.x = -18;
					this.sceneManager.bonuses.paddle.position.y = -3.2;
					this.sceneManager.bonuses.paddle.position.z = -15;
					this.sceneManager.bonuses.paddleRed.scale.set(0.6, 0.25, 0.5);
					this.sceneManager.bonuses.paddleRed.position.x = 17.94;
					this.sceneManager.bonuses.paddleRed.position.y = -3.2;
					this.sceneManager.bonuses.paddleRed.position.z = -15;
					this.sceneManager.bonuses.ball.position.x = 0;
					this.sceneManager.bonuses.ball.position.y = -3;
					this.sceneManager.bonuses.ball.position.z = -15;
					this.sceneManager.bonuses.ball.scale.set(0.44, 0.44, 0.44);
				}
				console.log(event.code);
			}
		});
	}
}
