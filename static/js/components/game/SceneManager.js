import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { UIManager } from "./UIManager.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Bonuses } from "./BonusSystem.js";
import { Loading } from "./Loading.js";

//Text
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";

//Bloom
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

//Anti aliasing
// import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
// import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";

export class SceneManager {
	constructor(loading, renderer, antialiasing, bloom) {
		this.paddles = [];
		this.ball = null;
		this.topBorder = null;
		this.bottomBorder = null;
		this.rightBorder = null;
		this.leftBorder = null;
		this.trajectoryLine = null;
		this.trajVisible = false;
		this.controls = null;
		this.renderer = renderer;
		this.debugMod = false;
		this.light = null;

		this.loading = loading;
		this.loading.addComponent("scene");
		this.antialiasing = antialiasing;
		this.bloom = bloom;
		this.initializeComponents();
		this.setupScene();

		this.text = null;

		this.bloomParams = {
			exposure: 1,
			bloomStrength: 0.5,
			bloomThreshold: 0,
			bloomRadius: 0.8,
			enabled: this.bloom,
		};
		this.composer = null;
		if (this.renderer) {
			// Only setup post-processing if renderer exists
			this.setupPostProcessing();
		}
	}

	setupPostProcessing() {
		if (!this.renderer || !this.scene || !this.camera) {
			console.error("Required components not initialized");
			return;
		}

		const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
			type: THREE.HalfFloatType,
			samples: this.antialiasing ? 8 : 0,
			format: THREE.RGBAFormat,
			colorSpace: THREE.SRGBColorSpace,
			stencilBuffer: false,
		});

		this.composer = new EffectComposer(this.renderer, renderTarget);

		const renderPass = new RenderPass(this.scene, this.camera);
		renderPass.clearColor = new THREE.Color(0x000000);
		renderPass.clearAlpha = 0;
		this.composer.addPass(renderPass);

		if (this.bloom) {
			const bloomPass = new UnrealBloomPass(
				new THREE.Vector2(window.innerWidth, window.innerHeight),
				this.bloomParams.bloomStrength,
				this.bloomParams.bloomRadius,
				this.bloomParams.bloomThreshold,
			);
			bloomPass.threshold = 0;
			bloomPass.strength = 0.5;
			bloomPass.radius = 0.8;
			bloomPass.quality = 5;
			this.bloomPass = bloomPass; // Store reference for later toggling
			this.composer.addPass(bloomPass);
		}

		if (this.antialiasing) {
			const smaaPass = new SMAAPass(window.innerWidth * this.renderer.getPixelRatio(), window.innerHeight * this.renderer.getPixelRatio());
			this.smaaPass = smaaPass; // Store reference for later toggling
			this.composer.addPass(smaaPass);
		}

		// Handle resize with optimal quality settings
		window.addEventListener("resize", () => {
			const width = window.innerWidth;
			const height = window.innerHeight;
			const pixelRatio = Math.min(window.devicePixelRatio, 2);

			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix();

			this.renderer.setSize(width, height);
			this.renderer.setPixelRatio(pixelRatio);

			renderTarget.setSize(width * pixelRatio, height * pixelRatio);

			this.composer.setSize(width, height);
			this.composer.setPixelRatio(pixelRatio);
		});
	}

	// setupPostProcessing() {
	// 	if (!this.renderer) {
	// 		console.error("Renderer is not initialized");
	// 		return;
	// 	}
	// 	if (!this.scene || !this.camera) {
	// 		console.error("Scene or camera not initialized");
	// 		return;
	// 	}

	// 	const renderScene = new RenderPass(this.scene, this.camera);

	// 	// Add FXAA
	// 	const fxaaPass = new ShaderPass(FXAAShader);
	// 	const pixelRatio = this.renderer.getPixelRatio();
	// 	fxaaPass.material.uniforms["resolution"].value.x = 1 / (window.innerWidth * pixelRatio);
	// 	fxaaPass.material.uniforms["resolution"].value.y = 1 / (window.innerHeight * pixelRatio);

	// 	const bloomPass = new UnrealBloomPass(
	// 		new THREE.Vector2(window.innerWidth, window.innerHeight),
	// 		this.bloomParams.bloomStrength,
	// 		this.bloomParams.bloomRadius,
	// 		this.bloomParams.bloomThreshold,
	// 	);

	// 	this.composer = new EffectComposer(this.renderer);
	// 	this.composer.addPass(renderScene);
	// 	this.composer.addPass(bloomPass);
	// 	this.composer.addPass(fxaaPass); // Add FXAA as the last pass

	// 	// Handle window resize
	// 	window.addEventListener("resize", () => {
	// 		const width = window.innerWidth;
	// 		const height = window.innerHeight;

	// 		this.camera.aspect = width / height;
	// 		this.camera.updateProjectionMatrix();

	// 		this.renderer.setSize(width, height);
	// 		this.composer.setSize(width, height);

	// 		// Update FXAA resolution
	// 		const newPixelRatio = this.renderer.getPixelRatio();
	// 		fxaaPass.material.uniforms["resolution"].value.x = 1 / (width * newPixelRatio);
	// 		fxaaPass.material.uniforms["resolution"].value.y = 1 / (height * newPixelRatio);
	// 	});
	// }

	initializeComponents() {
		this.scene = new THREE.Scene();
		this.createCamera();
		this.bonuses = new Bonuses(this.scene);
		this.UIManager = new UIManager();
	}

	setupScene() {
		this.setupLights();
		this.createGameObjects();
	}

	toggleDebugMode() {
		this.debugMod = !this.debugMod;

		// Toggle visibility of debug elements
		this.paddles.forEach((paddle) => (paddle.visible = this.debugMod));
		if (this.ball) this.ball.visible = this.debugMod;
		if (this.topBorder) this.topBorder.visible = this.debugMod;
		if (this.bottomBorder) this.bottomBorder.visible = this.debugMod;
		if (this.leftBorder) this.leftBorder.visible = this.debugMod;
		if (this.rightBorder) this.rightBorder.visible = this.debugMod;
		if (this.trajectoryLine) this.trajectoryLine.visible = this.debugMod;
	}

	createCamera() {
		this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

		// Set initial position and rotation
		this.camera.position.set(0, -8, 50);
		this.camera.rotation.z = -Math.PI;

		/*this.controls = new OrbitControls(this.camera, document.querySelector("canvas"));
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.05;
		this.controls.minDistance = 10;
		this.controls.maxDistance = 50;
	this.controls.update();*/
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
		this.trajectoryLine.visible = this.debugMod;
	}

	setupLights() {
		this.light = new THREE.DirectionalLight(0xfafafa, 9);
		//this.light.position.set(0, 136, 96);
		this.light.position.set(0, 255, 158);
		this.light.castShadow = true;
		this.scene.add(this.light);
	}

	async createGameObjects() {
		try {
			await Promise.all([
				this.createDebugBall(),
				this.createDebugBounds(),
				this.bonuses.createBonuses(),
				this.createNameRight("valgrant", new THREE.Vector3(0, -23, -10.4), 0x00ffff, 2),
				this.createNameLeft("jnunes42", new THREE.Vector3(0, -23, -10.4), 0x00ffff, 2),
				this.createEloRight("[812]", new THREE.Vector3(0, -20.70, -11.90), 0x00ffff, 2),
				this.createEloLeft("[1247]", new THREE.Vector3(0, -20.70, -11.90), 0x00ffff, 2),
				this.createPlayerAvatar("/js/components/game/Textures/valgrant.jpeg", new THREE.Vector3(-14.7, -21.9, -11)),
				this.createPlayerAvatar("/js/components/game/Textures/image.png", new THREE.Vector3(14.7, -21.9, -11)),
			]);
			this.bonuses.table.scale.set(4.14, 4.14, 4.14);
			this.bonuses.table.position.x = 0;
			this.bonuses.table.position.y = 1.59;
			this.bonuses.table.position.z = -30.72;
			this.bonuses.paddle.scale.set(0.75, 0.25, 0.5);
			this.bonuses.paddle.position.x = -18;
			this.bonuses.paddle.position.y = -3.2;
			this.bonuses.paddle.position.z = -15;
			this.bonuses.paddleRed.scale.set(0.6, 0.25, 0.5);
			this.bonuses.paddleRed.position.x = 17.94;
			this.bonuses.paddleRed.position.y = -3.2;
			this.bonuses.paddleRed.position.z = -15;
			this.bonuses.ball.position.x = 0;
			this.bonuses.ball.position.y = -3;
			this.bonuses.ball.position.z = -15;
			this.bonuses.ball.scale.set(0.44, 0.44, 0.44);
			this.createDebugPaddles();
		} catch (error) {
			console.error("Failed to create game objects:", error);
		}
	}

	createPlayerAvatar(imageUrl, position) {
		return new Promise((resolve, reject) => {
			const textureLoader = new THREE.TextureLoader();
			textureLoader.load(
				imageUrl,
				(texture) => {
					// Ensure proper texture encoding
					texture.encoding = THREE.sRGBEncoding;
					texture.needsUpdate = true;

					const aspectRatio = texture.image.width / texture.image.height;
					const width = 5;
					const height = width / aspectRatio;

					const geometry = new THREE.PlaneGeometry(width, height);
					const material = new THREE.MeshBasicMaterial({
						map: texture,
						transparent: true,
						side: THREE.DoubleSide,
						//color: 0xffffff, // White color to not affect texture
						opacity: 1,
						depthWrite: true,
						depthTest: true,
					});

					const avatar = new THREE.Mesh(geometry, material);
					avatar.position.copy(position);

					// Ensure proper texture display
					avatar.material.map.flipY = false; // Try with and without this
					avatar.material.needsUpdate = true;
					avatar.rotation.x = -0.5;
					avatar.scale.set(0.8, 0.8, 0.8);
					this.avatar = avatar;
					this.scene.add(avatar);
					resolve(avatar);
				},
				undefined,
				(error) => {
					console.error("Error loading avatar texture:", error);
					reject(error);
				},
			);
		});
	}
	async createNameRight(text, position, color = 0xffffff, size = 1) {
		return new Promise((resolve, reject) => {
			const loader = new FontLoader();

			loader.load(
				"https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
				(font) => {
					const geometry = new TextGeometry(text, {
						font: font,
						size: size,
						height: 0.2,
						curveSegments: 12,
						bevelEnabled: false,
					});

					const material = new THREE.MeshStandardMaterial({
						color: color,
						metalness: 0,
						roughness: 1,
					});

					this.text = new THREE.Mesh(geometry, material);
					geometry.computeBoundingBox();
					//-2.4720004501342787 x
					//20.643999099731445  l

					//-5.150000137329112 x
					//9.687999725341797 l

					//	console.log("aadsdasds  " + (20.643999099731445 - 9.687999725341797) / (-2.4720004501342787 - -5.150000137329112)) = 4.091113014977945;
					//	console.log("aadsdasds**  " + (20.643999099731445 - -2.4720004501342787 * 4.091113014977945)) = 30.75723231430713;

					this.text.position.copy(position);
					this.text.position.x = (geometry.boundingBox.max.x - 30.75723231430713) / 4.091113014977945;
					this.text.rotation.x = -0.5;
					this.text.rotation.z = Math.PI;
					this.text.scale.set(0.5, 0.5, 0.5);
					this.scene.add(this.text);
					resolve(this.text);
				},
				undefined,
				reject,
			);
		});
	}

	async createNameLeft(text, position, color = 0xffffff, size = 1) {
		return new Promise((resolve, reject) => {
			const loader = new FontLoader();

			loader.load(
				"https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
				(font) => {
					const geometry = new TextGeometry(text, {
						font: font,
						size: size,
						height: 0.2,
						curveSegments: 12,
						bevelEnabled: false,
					});

					const material = new THREE.MeshStandardMaterial({
						color: color,
						metalness: 0,
						roughness: 1,
					});

					this.text = new THREE.Mesh(geometry, material);
					geometry.computeBoundingBox();
					//-2.4720004501342787 x
					//20.643999099731445  l

					//-5.150000137329112 x
					//9.687999725341797 l

					//9.03489994215556 x
					//5.125999927520752 l

					//11.335659155487376 x
					//15.765999794006348 l

					//	console.log("aadsdasds  " + (20.643999099731445 - 9.687999725341797) / (-2.4720004501342787 - -5.150000137329112)) = 4.091113014977945;
					//	console.log("aadsdasds**  " + (20.643999099731445 - -2.4720004501342787 * 4.091113014977945)) = 30.75723231430713;


					//console.log("aadsdasds  " + (5.125999927520752 - 15.765999794006348) / (9.03489994215556 - 11.335659155487376)) = 4.624560364609999
					//console.log("aadsdasds**  " + (5.125999927520752 - 9.03489994215556 * 4.624560364609999)) = -36.656440243189024

					this.text.position.copy(position);
					this.text.position.x = (geometry.boundingBox.max.x - -36.656440243189024) / 4.624560364609999;
					this.text.rotation.x = -0.5;
					this.text.rotation.z = Math.PI;
					this.text.scale.set(0.5, 0.5, 0.5);
					this.scene.add(this.text);
					resolve(this.text);
				},
				undefined,
				reject,
			);
		});
	}

	async createEloRight(text, position, color = 0xffffff, size = 1) {
		return new Promise((resolve, reject) => {
			const loader = new FontLoader();

			loader.load(
				"https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
				(font) => {
					const geometry = new TextGeometry(text, {
						font: font,
						size: size,
						height: 0.2,
						curveSegments: 12,
						bevelEnabled: false,
					});

					const material = new THREE.MeshStandardMaterial({
						color: color,
						metalness: 0,
						roughness: 1,
					});

					this.text = new THREE.Mesh(geometry, material);
					geometry.computeBoundingBox();
					//-2.4720004501342787 x
					//20.643999099731445  l

					//-5.150000137329112 x
					//9.687999725341797 l

					//	console.log("aadsdasds  " + (20.643999099731445 - 9.687999725341797) / (-2.4720004501342787 - -5.150000137329112)) = 4.091113014977945;
					//	console.log("aadsdasds**  " + (20.643999099731445 - -2.4720004501342787 * 4.091113014977945)) = 30.75723231430713;

					this.text.position.copy(position);
					this.text.position.x = (geometry.boundingBox.max.x - 30.75723231430713) / 4.091113014977945;
					this.text.rotation.x = -0.5;
					this.text.rotation.z = Math.PI;
					this.text.scale.set(0.5, 0.5, 0.5);
					this.scene.add(this.text);
					resolve(this.text);
				},
				undefined,
				reject,
			);
		});
	}

		async createEloLeft(text, position, color = 0xffffff, size = 1) {
		return new Promise((resolve, reject) => {
			const loader = new FontLoader();

			loader.load(
				"https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
				(font) => {
					const geometry = new TextGeometry(text, {
						font: font,
						size: size,
						height: 0.2,
						curveSegments: 12,
						bevelEnabled: false,
					});

					const material = new THREE.MeshStandardMaterial({
						color: color,
						metalness: 0,
						roughness: 1,
					});

					this.text = new THREE.Mesh(geometry, material);
					geometry.computeBoundingBox();
					//-2.4720004501342787 x
					//20.643999099731445  l

					//-5.150000137329112 x
					//9.687999725341797 l

					//	console.log("aadsdasds  " + (20.643999099731445 - 9.687999725341797) / (-2.4720004501342787 - -5.150000137329112)) = 4.091113014977945;
					//	console.log("aadsdasds**  " + (20.643999099731445 - -2.4720004501342787 * 4.091113014977945)) = 30.75723231430713;

					this.text.position.copy(position);
					this.text.position.x = (geometry.boundingBox.max.x - -36.656440243189024) / 4.624560364609999;
					this.text.rotation.x = -0.5;
					this.text.rotation.z = Math.PI;
					this.text.scale.set(0.5, 0.5, 0.5);
					this.scene.add(this.text);
					resolve(this.text);
				},
				undefined,
				reject,
			);
		});
	}

	createDebugPaddles() {
		const paddleGeometry = new THREE.BoxGeometry(this.bonuses.paddle.scale.z * 1.6, this.bonuses.paddle.scale.x * 6.666666667, this.bonuses.paddle.scale.y * 1.6);
		console.log("Thickness : " + this.bonuses.paddle.scale.z * 1.6);
		console.log("Height : " + this.bonuses.paddle.scale.x * 6.666666667);
		const edges = new THREE.EdgesGeometry(paddleGeometry);
		const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
		const paddle1 = new THREE.LineSegments(edges, material);
		const paddle2 = new THREE.LineSegments(edges, material);

		paddle1.visible = this.debugMod;
		paddle2.visible = this.debugMod;

		this.scene.add(paddle1);
		this.scene.add(paddle2);
		this.paddles.push(paddle1, paddle2);
	}
	createDebugBall() {
		const sphereGeometry = new THREE.SphereGeometry(0.5, 8, 4);
		const edges = new THREE.EdgesGeometry(sphereGeometry);
		const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
		const sphere = new THREE.LineSegments(edges, material);

		sphere.visible = this.debugMod;
		this.ball = sphere;
		this.scene.add(sphere);
	}

	createDebugBounds() {
		const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
		const sideMat = new THREE.LineBasicMaterial({ color: 0x00ff00 });

		const lineGeometry = new THREE.BoxGeometry(0.1, 28.6, 0.1);
		const horizontalLineGeometry = new THREE.BoxGeometry(41.2, 0.1, 0.1);

		const topEdges = new THREE.EdgesGeometry(horizontalLineGeometry);
		const bottomEdges = new THREE.EdgesGeometry(horizontalLineGeometry);
		const leftEdges = new THREE.EdgesGeometry(lineGeometry);
		const rightEdges = new THREE.EdgesGeometry(lineGeometry);

		this.topBorder = new THREE.LineSegments(topEdges, material);
		this.bottomBorder = new THREE.LineSegments(bottomEdges, material);
		this.leftBorder = new THREE.LineSegments(leftEdges, sideMat);
		this.rightBorder = new THREE.LineSegments(rightEdges, sideMat);

		this.topBorder.visible = this.debugMod;
		this.bottomBorder.visible = this.debugMod;
		this.leftBorder.visible = this.debugMod;
		this.rightBorder.visible = this.debugMod;

		this.scene.add(this.topBorder);
		this.scene.add(this.bottomBorder);
		this.scene.add(this.leftBorder);
		this.scene.add(this.rightBorder);
	}

	updateDebugPositions(positions) {
		// Update ball position
		if (this.ball && positions.ball) {
			this.ball.position.set(positions.ball.x, positions.ball.y, positions.ball.z || 0);
		}

		if (positions.player_left) {
			this.paddles[0].position.set(positions.player_left.x, positions.player_left.y, positions.player_left.z);
		}
		// Right paddle
		if (positions.player_right) {
			this.paddles[1].position.set(positions.player_right.x, positions.player_right.y, positions.player_right.z);
		}
	}

	createDecor() {
		this.createDebugBounds();
	}
}
