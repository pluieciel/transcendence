import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { UIManager } from "./UIManager.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Bonuses } from "./BonusSystem.js";
import { Loading } from "./Loading.js";

export class SceneManager {
	constructor(loading) {
		this.paddles = [];
		this.ball = null;
		this.topBorder = null;
		this.bottomBorder = null;
		this.rightBorder = null;
		this.leftBorder = null;
		this.trajectoryLine = null;
		this.trajVisible = false;
		this.controls = null;

		this.loading = loading;
		this.loading.addComponent("scene");
		this.initializeComponents();
		this.setupScene();
	}

	initializeComponents() {
		this.scene = new THREE.Scene();
		this.camera = this.createCamera();
		//this.bonuses = new Bonuses(this.scene);
		this.UIManager = new UIManager();
	}

	setupScene() {
		this.setupLights();
		this.createGameObjects();
		this.hideObjects();
	}

	createCamera() {
		const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
		camera.position.set(0, 0, 20);
		//camera.position.set(0, 5, 5);

		this.controls = new OrbitControls(camera, document.querySelector("canvas"));
		this.controls.enableDamping = true; // Add smooth damping
		this.controls.dampingFactor = 0.05;
		this.controls.minDistance = 10; // Minimum zoom distance
		this.controls.maxDistance = 50; // Maximum zoom
		return camera;
	}

	updateTrajectory(trajectoryPoints) {
		if (this.trajectoryLine) {
			this.scene.remove(this.trajectoryLine);
		}

		if (!trajectoryPoints || trajectoryPoints.length < 2) return;

		const points = trajectoryPoints.map((point) => new THREE.Vector3(point.x, point.y, point.z));

		const geometry = new THREE.BufferGeometry().setFromPoints(points);
		const material = new THREE.LineBasicMaterial({
			color: 0x329da8,
			opacity: 1,
		});

		this.trajectoryLine = new THREE.Line(geometry, material);
		this.scene.add(this.trajectoryLine);
		this.trajectoryLine.visible = this.trajVisible;
	}

	hideObjects() {
		this.paddles.forEach((paddle) => (paddle.visible = false));
		if (this.ball) this.ball.visible = false;
		if (this.topBorder) this.topBorder.visible = false;
		if (this.bottomBorder) this.bottomBorder.visible = false;
		if (this.leftBorder) this.leftBorder.visible = false;
		if (this.rightBorder) this.rightBorder.visible = false;

		this.UIManager.setTextsVisibility(false);
	}

	hideBall() {
		if (this.ball) this.ball.visible = false;
	}

	showObjects() {
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
		//light.position.set(0, 0, 1);
		light.position.set(-10, 1, 3);
		light.rotation.x = -Math.PI / 4;
		light.rotation.y = -Math.PI / 4;
		light.castShadow = true;
		this.scene.add(light);
		this.scene.add(ambientLight);
	}

	async createGameObjects() {
		try {
			await Promise.all([this.createPaddles(), this.createBall(), this.createPlayableArea() /*, this.bonuses.createBonuses()*/]);
		} catch (error) {
			console.error("Failed to create game objects:", error);
		}
	}

	createPaddles() {
		const paddleGeometry = new THREE.BoxGeometry(0.8, 4, 0.4);
		const material = new THREE.MeshStandardMaterial({ color: 0xf2f0f2 });
		const paddle1 = new THREE.Mesh(paddleGeometry, material);
		const paddle2 = new THREE.Mesh(paddleGeometry, material);

		paddle1.castShadow = true;
		paddle1.receiveShadow = true;
		paddle2.castShadow = true;
		paddle2.receiveShadow = true;

		this.scene.add(paddle1);
		this.scene.add(paddle2);
		this.paddles.push(paddle1, paddle2);
	}
	createBall() {
		const material = new THREE.MeshStandardMaterial({ color: 0xf2f0f2 });
		console.log("ball updated");
		const sphereGeometry = new THREE.SphereGeometry(0.5, 8, 4);
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
}
