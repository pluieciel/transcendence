import { Renderer } from "./Renderer.js";
import { SceneManager } from "./SceneManager.js";
import { InputManager } from "./InputManager.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as THREE from "three";

export class Game {
	constructor(canvasId) {
		this.renderer = new Renderer(canvasId);
		this.sceneManager = new SceneManager();
		this.inputManager = new InputManager();
		this.uiManager = this.sceneManager.UIManager;

		this.controls = null;
		this.ball = null;
		this.initialized = false;
		this.gameStarted = false;
		this.sceneInitialized = false;

		this.uiManager.setOverlayVisibility(true);
		this.uiManager.setOverText("Waiting for server...");

		this.setupWebSocket();
	}

	setupWebSocket() {
		this.ws = new WebSocket("ws://localhost:8765");
		this.inputManager.ws = this.ws;

		this.ws.onopen = () => {
			if (this.sceneInitialized) {
				this.sendInitMessage();
			}
		};

		this.ws.onclose = () => {
			console.log("Disconnected from server");
			this.uiManager.setOverlayVisibility(true);
			this.uiManager.setOverText("Disconnected from server");
			setTimeout(() => this.setupWebSocket(), 1000);
		};

		this.ws.onerror = (error) => {
			console.error("WebSocket error:", error);
			this.uiManager.setOverlayVisibility(true);
			this.uiManager.setOverText("Error while connecting to server");
		};

		this.ws.onmessage = (event) => {
			const message = JSON.parse(event.data);
			console.log(message);
			if (!this.initialized) {
				this.onInitMessageReceived(message);
			} else {
				this.onMessageReceived(message);
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
		this.controls = new OrbitControls(this.sceneManager.camera, this.renderer.canvas);
		this.controls.target.set(0, 0, 0);
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

	onInitMessageReceived(message) {
		if (message.type === "init_response") {
			const positions = message.data.positions;

			if (this.sceneManager.paddles[0]) {
				this.sceneManager.paddles[0].position.copy(positions.player_left);
			}
			if (this.sceneManager.paddles[1]) {
				this.sceneManager.paddles[1].position.copy(positions.player_right);
			}

			if (this.sceneManager.ball) {
				this.sceneManager.ball.position.copy(positions.ball);
			}

			if (positions.borders) {
				this.sceneManager.topBorder.position.copy(positions.borders.top);
				this.sceneManager.bottomBorder.position.copy(positions.borders.bottom);
				this.sceneManager.leftBorder.position.copy(positions.borders.left);
				this.sceneManager.rightBorder.position.copy(positions.borders.right);
			}

			this.uiManager.updateNameLeft(message.data.player.left.name + " [" + message.data.player.left.rank + "]");
			this.uiManager.updateNameRight(message.data.player.right.name + " [" + message.data.player.right.rank + "]");
			this.uiManager.updateScoreLeft(0);
			this.uiManager.updateScoreRight(0);
			this.uiManager.setOverlayVisibility(true);
			this.uiManager.setOverText("Waiting for other player...");
			this.initialized = true;
		}
	}

	onMessageReceived(message) {
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
		this.controls.update();
		this.renderer.render(this.sceneManager.getScene(), this.sceneManager.getCamera());
	}
}
