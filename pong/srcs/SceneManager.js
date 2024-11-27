import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class SceneManager {
	constructor() {
		this.scene = new THREE.Scene();
		// Define your desired game view size
		this.offsetX = 0;
		this.offsetY = -3;
		this.offsetZ = -15;
		this.corners = [];

		this.camera = new THREE.PerspectiveCamera(
			90, // FOV: Adjust as needed
			window.innerWidth / window.innerHeight,
			0.1, // Near plane
			1000, // Far plane
		);

		this.camera.position.set(0, 0, 0); // Position the camera above the scene
		this.paddles = [];
		this.ball = null;
		this.playerLeftName = null;
		this.playerRightName = null;
		this.playerLeftScore = null;
		this.playerRightScore = null;
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
		this.scene.add(paddle1);
		paddle1.position.set(-18 + this.offsetX, this.offsetY, this.offsetZ);
		paddle2.castShadow = true;
		paddle2.receiveShadow = true;
		this.scene.add(paddle2);
		paddle2.position.set(18 + this.offsetX, this.offsetY, this.offsetZ);
		this.paddles.push(paddle1, paddle2);
	}
	createBall() {
		const material = new THREE.MeshStandardMaterial({ color: 0xf2f0f2 });
		const sphereGeometry = new THREE.SphereGeometry(0.5, 25, 25);

		const sphere = new THREE.Mesh(sphereGeometry, material);

		sphere.castShadow = true;
		sphere.receiveShadow = true;
		sphere.position.set(this.offsetX, this.offsetY, this.offsetZ);
		this.ball = sphere;
		this.scene.add(sphere);
	}

	createPlayableArea() {
		const material = new THREE.MeshStandardMaterial({ color: 0xf2f0f2 });
		const sideMat = new THREE.MeshStandardMaterial({ color: 0x2500f5 });
		const lineGeometry = new THREE.BoxGeometry(0.1, 20, 0.1); // Vertical lines
		const horizontalLineGeometry = new THREE.BoxGeometry(40, 0.1, 0.1); // Horizontal lines

		// Create four distinct lines
		this.topBorder = new THREE.Mesh(horizontalLineGeometry, material);
		this.bottomBorder = new THREE.Mesh(horizontalLineGeometry, material);
		this.leftBorder = new THREE.Mesh(lineGeometry, sideMat.clone());
		this.rightBorder = new THREE.Mesh(lineGeometry, sideMat.clone());

		// Position the lines
		this.topBorder.position.set(
			this.offsetX,
			10 + this.offsetY,
			this.offsetZ,
		);
		this.bottomBorder.position.set(
			this.offsetX,
			-10 + this.offsetY,
			this.offsetZ,
		);
		this.leftBorder.position.set(
			-20 + this.offsetX,
			this.offsetY,
			this.offsetZ,
		);
		this.rightBorder.position.set(
			20 + this.offsetX,
			this.offsetY,
			this.offsetZ,
		);

		// Add to scene
		this.scene.add(this.topBorder);
		this.scene.add(this.bottomBorder);
		this.scene.add(this.leftBorder);
		this.scene.add(this.rightBorder);
		this.corners = {
			topLeft: {
				x: -20 + this.offsetX, // Left border x
				y: 10 + this.offsetY, // Top border y
				z: this.offsetZ,
			},
			topRight: {
				x: 20 + this.offsetX, // Right border x
				y: 10 + this.offsetY, // Top border y
				z: this.offsetZ,
			},
			bottomLeft: {
				x: -20 + this.offsetX, // Left border x
				y: -10 + this.offsetY, // Bottom border y
				z: this.offsetZ,
			},
			bottomRight: {
				x: 20 + this.offsetX, // Right border x
				y: -10 + this.offsetY, // Bottom border y
				z: this.offsetZ,
			},
		};
	}

	createTexts()
	{
		var scoreLeft = document.createElement("div");
		scoreLeft.style.position = "absolute";
		scoreLeft.style.color = "white";
		scoreLeft.style.outlineColor = "0x0000";
		scoreLeft.style.width = 100;
		scoreLeft.style.height = 100;
		scoreLeft.style.fontSize = "100px";
		scoreLeft.innerHTML = "0";
		scoreLeft.style.top = 50 + "px";
		scoreLeft.style.left = 600 + "px";
		document.body.appendChild(scoreLeft);
		this.playerLeftScore = scoreLeft;

		var scoreRight = document.createElement("div");
		scoreRight.style.position = "absolute";
		scoreRight.style.color = "white";
		scoreRight.style.outlineColor = "0xffffff";
		scoreRight.style.width = 100;
		scoreRight.style.height = 100;
		scoreRight.style.fontSize = "100px";
		scoreRight.innerHTML = "0";
		scoreRight.style.top = 50 + "px";
		scoreRight.style.right = 600 + "px";
		document.body.appendChild(scoreRight);
		this.playerRightScore = scoreRight;

		var nameLeft = document.createElement("div");
		nameLeft.style.position = "absolute";
		nameLeft.style.color = "white";
		nameLeft.style.outlineColor = "0xffffff";
		nameLeft.style.width = 100;
		nameLeft.style.height = 100;
		nameLeft.style.fontSize = "50px";
		nameLeft.innerHTML = "Julien [2057]";
		nameLeft.style.top = 170 + "px";
		nameLeft.style.left = 500 + "px";
		document.body.appendChild(nameLeft);
		this.playerLeftName = nameLeft;

		var nameRight = document.createElement("div");
		nameRight.style.position = "absolute";
		nameRight.style.color = "white";
		nameRight.style.outlineColor = "0xffffff";
		nameRight.style.width = 100;
		nameRight.style.height = 100;
		nameRight.style.fontSize = "50px";
		nameRight.innerHTML = "Test [1201]";
		nameRight.style.top = 170 + "px";
		nameRight.style.right = 500 + "px";
		document.body.appendChild(nameRight);
		this.playerRightName = nameRight;
	}
	createDecor() {
		this.createTexts();
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

	updateScoreLeft(score) {
		this.playerLeftScore.innerHTML = score;
	}

	updateScoreRight(score) {
		this.playerRightScore.innerHTML = score;
	}

	updateNameLeft(name) {
		this.playerLeftName.innerHTML = name;
	}

	updateNameRight(name) {
		this.playerRightName.innerHTML = name;
	}
}
