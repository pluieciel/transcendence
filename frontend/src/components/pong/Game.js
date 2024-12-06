import { Renderer } from "./Renderer.js";
import { SceneManager } from "./SceneManager.js";
import { InputManager } from "./InputManager.js";
import { ParticleSystem } from "./ParticleSystem.js";
import * as THREE from 'three';

export class Game {
	constructor(canvas) {
		this.renderer = new Renderer(canvas);
		this.sceneManager = new SceneManager();
		this.inputManager = new InputManager();
		this.uiManager = this.sceneManager.UIManager;

		this.ball = null;
		this.initialized = false;
		this.gameStarted = false;
		this.sceneInitialized = false;

		this.uiManager.setOverlayVisibility(true);
		this.uiManager.setOverText("Waiting for server...");

		this.setupWebSocket();

		this.particleSystem = null;
		this.lastTime = 0;

		window.addEventListener("keydown", (event) => {
			if (event.code === "Space") {
				this.emitParticles();
			}
		});
	}

	setupWebSocket() {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const host = window.location.host;
		const wsUrl = `${protocol}//${host}/api/game/`;

		this.ws = new WebSocket(wsUrl);
		this.inputManager.ws = this.ws;

		this.ws.onopen = () => {
			console.log("Connected to server");
		};

		this.ws.onclose = () => {
			console.log("Disconnected from server");
			this.uiManager.setOverlayVisibility(true);
			this.uiManager.setOverText("Disconnected from server");
			setTimeout(() => this.setupWebSocket(), 1000);
		};

		this.ws.onerror = (error) => {
			console.error("WebSocket error:", error);
		};

		this.ws.onmessage = (event) => {
			const message = JSON.parse(event.data);
			if (message.type === "init_response") {
				this.handleInitResponse(message.data);
			} else if (message.type === "game_update") {
				this.handleGameUpdate(message.data);
			}
		};
	}

	initialize() {
		this.sceneManager.setupLights();
		this.sceneManager.createObjects();
		this.sceneManager.hideObjects();
		this.ball = this.sceneManager.ball;
		this.sceneManager.hideBall();
		this.sceneInitialized = this.validateSceneInitialization();
		if (this.sceneInitialized && this.ws.readyState === WebSocket.OPEN) {
			this.sendInitMessage();
		}
		this.animate();

		this.particleSystem = new ParticleSystem(this.sceneManager.getScene());
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

	handleInitResponse(data) {
		const positions = data.positions;

		this.sceneManager.paddles[0].position.set(positions.player_left.x, positions.player_left.y, positions.player_left.z);
		this.sceneManager.paddles[1].position.set(positions.player_right.x, positions.player_right.y, positions.player_right.z);

		this.sceneManager.ball.position.set(positions.ball.x, positions.ball.y, positions.ball.z);

		this.sceneManager.topBorder.position.set(positions.borders.top.x, positions.borders.top.y, positions.borders.top.z);
		this.sceneManager.bottomBorder.position.set(positions.borders.bottom.x, positions.borders.bottom.y, positions.borders.bottom.z);
		this.sceneManager.leftBorder.position.set(positions.borders.left.x, positions.borders.left.y, positions.borders.left.z);
		this.sceneManager.rightBorder.position.set(positions.borders.right.x, positions.borders.right.y, positions.borders.right.z);

		this.playerSide = data.side;

		this.uiManager.updateNameLeft(data.player.left.name + " [" + data.player.left.rank + "]");
		this.uiManager.updateNameRight(data.player.right.name + " [" + data.player.right.rank + "]");
		this.uiManager.updateScoreLeft(data.player.left.score);
		this.uiManager.updateScoreRight(data.player.right.score);

		this.sceneManager.showObjects();

		if (data.game_started) {
			this.uiManager.setOverlayVisibility(false);
			this.gameStarted = true;
		} else {
			this.uiManager.setOverlayVisibility(true);
			this.uiManager.setOverText("Waiting for opponent...");
		}
	}

	handleGameUpdate(data) {
		if (data.player) {
			const leftPos = data.player.left.position;
			const rightPos = data.player.right.position;

			if (this.sceneManager.paddles[0]) {
				this.sceneManager.paddles[0].position.set(leftPos.x, leftPos.y, leftPos.z);
			}
			if (this.sceneManager.paddles[1]) {
				this.sceneManager.paddles[1].position.set(rightPos.x, rightPos.y, rightPos.z);
			}

			this.uiManager.updateScoreLeft(data.player.left.score);
			this.uiManager.updateScoreRight(data.player.right.score);
		}

		if (data.ball && this.sceneManager.ball) {
			this.sceneManager.ball.position.set(data.ball.position.x, data.ball.position.y, data.ball.position.z);
			console.log(data.ball.visibility == true ? "Visible" : "Not");
			console.log(data.ball.visibility == false ? "Invisible" : "Not");
			this.sceneManager.ball.visible = data.ball.visibility;
		}

		if (!this.gameStarted) {
			this.gameStarted = true;
			this.uiManager.setOverlayVisibility(false);
		}

		if (data.events && data.events.length > 0) {
			data.events.forEach((event) => {
				if (event.type === "score" && event.position) {
					const scorePosition = new THREE.Vector3(event.position.x, event.position.y, event.position.z);
					this.emitParticles(scorePosition);
					//this.sceneManager.hideBall();
					console.log("Spawning particles at:", scorePosition);
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

		this.renderer.render(this.sceneManager.getScene(), this.sceneManager.getCamera());
	}
}
