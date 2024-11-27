import { Renderer } from "./Renderer.js";
import { SceneManager } from "./SceneManager.js";
import { InputManager } from "./InputManager.js";
import { Player } from "./Player.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as THREE from "three";

export class Game {
	constructor(canvasId) {
		this.renderer = new Renderer(canvasId);
		this.sceneManager = new SceneManager();
		this.inputManager = new InputManager();
		this.players = [];
		this.controls = null;
		this.ball = null;
		this.initialized = false;
		this.setupWebSocket();
	}

	setupWebSocket() {
		this.ws = new WebSocket("ws://localhost:8765");
		this.inputManager.ws = this.ws;

		this.ws.onopen = () => {
			console.log("Connected to server");
			if (this.sceneManager.paddles.length > 0) {
				this.sendInitMessage();
			}
		};

		this.ws.onclose = () => {
			console.log("Disconnected from server");
			// Attempt to reconnect after a delay
			setTimeout(() => this.setupWebSocket(), 1000);
		};

		this.ws.onerror = (error) => {
			console.error("WebSocket error:", error);
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
		const paddles = this.sceneManager.getPaddles();

		this.controls = new OrbitControls(this.sceneManager.camera, this.renderer.canvas);
		this.ball = this.sceneManager.ball;
		this.controls.target.set(0, 0, 0);

		// If WebSocket is already open, send init message
		if (this.ws.readyState === WebSocket.OPEN) {
			this.sendInitMessage();
		}

		this.animate();
	}

	onInitMessageReceived(message) {
		if (message.type == "init_response") {
			console.log("ReceivedInitialization");
			this.sceneManager.updateNameLeft(message.data.player.left.name + " [" + message.data.player.left.rank + "]");
			this.sceneManager.updateNameRight(message.data.player.right.name + " [" + message.data.player.right.rank + "]");
		}
		this.sceneManager.updateScoreLeft(0);
		this.sceneManager.updateScoreRight(0);
		this.initialized = true;
	}

	onMessageReceived(message) {
		if (message.type === "update") {
			this.updateGame(
				message.data.player.left.position,
				message.data.player.right.position,
				message.data.ball.position,
				message.data.player.left.score,
				message.data.player.right.score,
			);
		}
	}

	updateGame(playerLeftPos, playerRightPos, ballPos, scoreLeft, scoreRight) {
		const paddles = this.sceneManager.getPaddles();
		if (paddles[0]) {
			paddles[0].position.set(playerLeftPos.x, playerLeftPos.y, playerLeftPos.z);
		}
		if (paddles[1]) {
			paddles[1].position.set(playerRightPos.x, playerRightPos.y, playerRightPos.z);
		}
		if (this.ball && ballPos) {
			this.ball.position.set(ballPos.x, ballPos.y, ballPos.z);
		}
		this.sceneManager.updateScoreLeft(scoreLeft);
		this.sceneManager.updateScoreRight(scoreRight);
	}

	animate() {
		requestAnimationFrame(this.animate.bind(this)); // This ensures the `this` context is correct
		this.controls.update();
		this.renderer.render(this.sceneManager.getScene(), this.sceneManager.getCamera());
	}
}
