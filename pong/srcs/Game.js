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
		// Initial camera setup
		this.inputManager = new InputManager();
		this.players = [];
		this.paddleSpeed = 0.1;
		this.paddlePositions = [0, 0];
		this.controls = null;
		this.ball = null;
	}

	initialize() {
		this.sceneManager.setupLights();
		this.sceneManager.createObjects();
		const paddles = this.sceneManager.getPaddles();
		this.players.push(new Player(0, "Player Left", 1000, paddles[0]));
		this.players.push(new Player(1, "Player Right", 1000, paddles[1]));
		//Orbit
		this.controls = new OrbitControls(
			this.sceneManager.camera,
			this.renderer.canvas,
		);
		this.ball = this.sceneManager.ball;
		this.controls.target.set(0, 0, 0);

		this.sceneManager.updateNameLeft(
			this.players[0].name + " [" + this.players[0].elo + "]",
		);
		this.sceneManager.updateNameRight(
			this.players[1].name + " [" + this.players[1].elo + "]",
		);
		this.animate();
	}

	handleInput() {
		const { inputManager, paddlePositions, paddleSpeed } = this;
		// Player 1 controls
		if (inputManager.isKeyPressed("ArrowUp") && paddlePositions[0] < 5) {
			paddlePositions[0] += paddleSpeed;
		}
		if (inputManager.isKeyPressed("ArrowDown") && paddlePositions[0] > -5) {
			paddlePositions[0] -= paddleSpeed;
		}
		// Player 2 controls
		if (inputManager.isKeyPressed("w") && paddlePositions[1] < 5) {
			paddlePositions[1] += paddleSpeed;
		}
		if (inputManager.isKeyPressed("s") && paddlePositions[1] > -5) {
			paddlePositions[1] -= paddleSpeed;
		}

		const playerLeftPos = new THREE.Vector3(
			18,
			paddlePositions[0],
			this.sceneManager.offsetZ,
		);
		const playerRightPos = new THREE.Vector3(
			-18,
			paddlePositions[1],
			this.sceneManager.offsetZ,
		);
		const ballPos = new THREE.Vector3(0, 0, this.sceneManager.offsetZ);

		this.updateGame(playerLeftPos, playerRightPos, ballPos, 1, 0);
	}

	updateGame(playerLeftPos, playerRightPos, ballPos, scoreLeft, scoreRight) {
		const p1 = this.players[0];
		const p2 = this.players[1];
		p1.paddle.position.copy(playerLeftPos);
		p2.paddle.position.copy(playerRightPos);
		p1.score = scoreLeft;
		p2.score = scoreRight;
		this.sceneManager.updateScoreLeft(scoreLeft);
		this.sceneManager.updateScoreRight(scoreRight);
		if (ballPos) {
			this.ball.position.copy(ballPos);
		}
	}

	animate() {
		requestAnimationFrame(this.animate.bind(this)); // This ensures the `this` context is correct
		this.handleInput();
		this.controls.update();
		this.renderer.render(
			this.sceneManager.getScene(),
			this.sceneManager.getCamera(),
		);
	}
}
