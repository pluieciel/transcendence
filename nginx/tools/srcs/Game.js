import { Renderer } from "./Renderer.js";
import { SceneManager } from "./SceneManager.js";
import { InputManager } from "./InputManager.js";
//import { OrbitControls } from '/static/three/examples/jsm/controls/OrbitControls.js';
import * as THREE from "/static/three/build/three.module.js";

export class Game {
	constructor(canvasId) {
		this.renderer = new Renderer(canvasId);
		this.sceneManager = new SceneManager();
		this.inputManager = new InputManager();
		this.uiManager = this.sceneManager.UIManager;

		//this.controls = null;
		this.ball = null;
		this.initialized = false;
		this.gameStarted = false;
		this.sceneInitialized = false;

		this.uiManager.setOverlayVisibility(true);
		this.uiManager.setOverText("Waiting for server...");

		this.setupWebSocket();
	}

	setupWebSocket() {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const host = window.location.host;
		const wsUrl = `${protocol}//${host}/game/`;

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

	sendInitMessage() {
		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(
				JSON.stringify({
					type: "init",
					data: {
						positions: {
							player_left: this.sceneManager.paddles[0].position,
							player_right: this.sceneManager.paddles[1].position,
							ball: this.ball.position,
							corners: this.sceneManager.corners,
						},
					},
				}),
			);
		}
	}

	initialize() {
		this.sceneManager.setupLights();
		this.sceneManager.createObjects();
		this.sceneManager.hideObjects();
		this.ball = this.sceneManager.ball;
		//this.controls = new OrbitControls(this.sceneManager.camera, this.renderer.canvas);
		//this.controls.target.set(0, 0, 0);
		this.sceneInitialized = this.validateSceneInitialization();
		if (this.sceneInitialized && this.ws.readyState === WebSocket.OPEN) {
			this.sendInitMessage();
		}
		this.animate();
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
		// Set initial positions
		const positions = data.positions;

		this.sceneManager.paddles[0].position.set(positions.player_left.x, positions.player_left.y, positions.player_left.z);

		this.sceneManager.paddles[1].position.set(positions.player_right.x, positions.player_right.y, positions.player_right.z);

		this.sceneManager.ball.position.set(positions.ball.x, positions.ball.y, positions.ball.z);

		// Set player side
		this.playerSide = data.side;

		// Update player names and ranks
		this.uiManager.updateNameLeft(data.player.left.name + " [" + data.player.left.rank + "]");
		this.uiManager.updateNameRight(data.player.right.name + " [" + data.player.right.rank + "]");

		// Update scores
		this.uiManager.updateScoreLeft(data.player.left.score);
		this.uiManager.updateScoreRight(data.player.right.score);

		// Show game objects
		this.sceneManager.showObjects();

		// Show appropriate overlay message
		if (data.game_started) {
			this.uiManager.setOverlayVisibility(false);
			this.gameStarted = true;
		} else {
			this.uiManager.setOverlayVisibility(true);
			this.uiManager.setOverText("Waiting for opponent...");
		}
	}

	handleGameUpdate(data) {
		// Update paddle positions
		if (data.player) {
			const leftPos = data.player.left.position;
			const rightPos = data.player.right.position;

			if (this.sceneManager.paddles[0]) {
				this.sceneManager.paddles[0].position.set(leftPos.x, leftPos.y, leftPos.z);
			}
			if (this.sceneManager.paddles[1]) {
				this.sceneManager.paddles[1].position.set(rightPos.x, rightPos.y, rightPos.z);
			}

			// Update scores
			this.uiManager.updateScoreLeft(data.player.left.score);
			this.uiManager.updateScoreRight(data.player.right.score);
		}

		// Update ball position
		if (data.ball && this.sceneManager.ball) {
			this.sceneManager.ball.position.set(data.ball.position.x, data.ball.position.y, data.ball.position.z);
		}

		// Hide the overlay once we start getting game updates
		if (!this.gameStarted) {
			this.gameStarted = true;
			this.uiManager.setOverlayVisibility(false);
		}
	}

	onMessageReceived(message) {
		console.log(message);
		if (message.type === "update") {
			if (!this.gameStarted) {
				this.gameStarted = true;
				this.uiManager.setOverlayVisibility(false); // Hide overlay when game starts
				this.sceneManager.showObjects();
			}

			this.sceneManager.updateGame(
				message.data.player.left.position,
				message.data.player.right.position,
				message.data.ball.position,
				message.data.player.left.score,
				message.data.player.right.score,
			);
		}
	}

	animate() {
		requestAnimationFrame(this.animate.bind(this)); // This ensures the `this` context is correct
		//this.controls.update();
		this.renderer.render(this.sceneManager.getScene(), this.sceneManager.getCamera());
	}
}
