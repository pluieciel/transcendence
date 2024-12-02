import * as THREE from "three";
import { UIManager } from "./UIManager";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class SceneManager {
	constructor() {
		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
		this.camera.position.set(0, 0, 20);
		this.paddles = [];
		this.ball = null;
		this.UIManager = new UIManager();
	}

	hideObjects() {
		// Hide all game objects
		this.paddles.forEach((paddle) => (paddle.visible = false));
		if (this.ball) this.ball.visible = false;
		if (this.topBorder) this.topBorder.visible = false;
		if (this.bottomBorder) this.bottomBorder.visible = false;
		if (this.leftBorder) this.leftBorder.visible = false;
		if (this.rightBorder) this.rightBorder.visible = false;

		this.UIManager.setTextsVisibility(false);
	}

	showObjects() {
		// Show all game objects
		this.paddles.forEach((paddle) => (paddle.visible = true));
		if (this.ball) this.ball.visible = true;
		if (this.topBorder) this.topBorder.visible = true;
		if (this.bottomBorder) this.bottomBorder.visible = true;
		if (this.leftBorder) this.leftBorder.visible = true;
		if (this.rightBorder) this.rightBorder.visible = true;

		this.UIManager.setTextsVisibility(true);
	}

	setupLights() {
		const light = new THREE.DirectionalLight(0xfafafa, 9);
		const ambientLight = new THREE.AmbientLight(0xfafafa); // Soft white light
		light.position.set(0, 5, 1);
		light.castShadow = true;
		this.scene.add(light);
		this.scene.add(ambientLight);
	}

	createPaddles() {
		const paddleGeometry = new THREE.BoxGeometry(0.8, 4, 0.4);
		const material = new THREE.MeshStandardMaterial({ color: 0xf2f0f2 });
		const paddle1 = new THREE.Mesh(paddleGeometry, material);
		const paddle2 = new THREE.Mesh(paddleGeometry, material);

		paddle1.castShadow = false;
		paddle1.receiveShadow = false;
		paddle2.castShadow = true;
		paddle2.receiveShadow = true;

		this.scene.add(paddle1);
		this.scene.add(paddle2);
		this.paddles.push(paddle1, paddle2);
	}
	createBall() {
		const material = new THREE.MeshStandardMaterial({ color: 0xf2f0f2 });
		const sphereGeometry = new THREE.SphereGeometry(0.5, 25, 25);
		const sphere = new THREE.Mesh(sphereGeometry, material);

		sphere.castShadow = true;
		sphere.receiveShadow = true;
		this.ball = sphere;
		this.scene.add(sphere);
	}

	createPlayableArea() {
		const material = new THREE.MeshStandardMaterial({ color: 0xf2f0f2 });
		const sideMat = new THREE.MeshStandardMaterial({ color: 0x2500f5 });
		const lineGeometry = new THREE.BoxGeometry(0.1, 20, 0.1);
		const horizontalLineGeometry = new THREE.BoxGeometry(40, 0.1, 0.1);

		this.topBorder = new THREE.Mesh(horizontalLineGeometry, material);
		this.bottomBorder = new THREE.Mesh(horizontalLineGeometry, material);
		this.leftBorder = new THREE.Mesh(lineGeometry, sideMat.clone());
		this.rightBorder = new THREE.Mesh(lineGeometry, sideMat.clone());

		// Positions will be updated when receiving init message
		this.scene.add(this.topBorder);
		this.scene.add(this.bottomBorder);
		this.scene.add(this.leftBorder);
		this.scene.add(this.rightBorder);
	}

	createDecor() {
		this.createPlayableArea();
	}
	createObjects() {
		this.createPaddles();
		this.createBall();
		this.createDecor();
	}

	getScene() {
		return this.scene;
	}

	getCamera() {
		return this.camera;
	}

	getPaddles() {
		return this.paddles;
	}

	updateGame(playerLeftPos, playerRightPos, ballPos, scoreLeft, scoreRight) {
		this.updatePaddle(this.paddles[0], playerLeftPos);
		this.updatePaddle(this.paddles[1], playerRightPos);
		this.updateBall(ballPos);
		this.UIManager.updateScoreLeft(scoreLeft);
		this.UIManager.updateScoreRight(scoreRight);
	}

	updatePaddle(paddle, position) {
		if (paddle) {
			paddle.position.set(position.x, position.y, position.z);
		}
	}

	updateBall(position) {
		if (this.ball && position) this.ball.position.set(position.x, position.y, position.z);
	}
}
