import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

//Text
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";

//Bloom
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

//Anti aliasing
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";

export class SceneManager {
	constructor(renderer, antialiasing, bloom) {
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

		this.leftPaddle = null;
		this.rightPaddle = null;
		this.antialiasing = antialiasing;
		this.bloom = bloom;

		this.textManager = null;

		this.scoreLeft = null;
		this.scoreRight = null;

		this.bloomParams = {
			exposure: 1,
			bloomStrength: 0.5,
			bloomThreshold: 0,
			bloomRadius: 0.8,
			enabled: this.bloom,
		};
		this.composer = null;

		this.colorTextureMap = {
			//Red
			"#E71200": {
				leftTexture: "/js/components/game/Textures/TextureLeftRed.png",
				rightTexture: "/js/components/game/Textures/TextureRightRed.png",
			},
			//Green
			"#00AD06": {
				leftTexture: "/js/components/game/Textures/TextureLeftGreen.png",
				rightTexture: "/js/components/game/Textures/TextureRightGreen.png",
			},
			//Cyan
			"#00BDD1": {
				leftTexture: "/js/components/game/Textures/TextureLeftCyan.png",
				rightTexture: "/js/components/game/Textures/TextureRightCyan.png",
			},
			//Blue
			"#0004cc": {
				leftTexture: "/js/components/game/Textures/TextureLeftBlue.png",
				rightTexture: "/js/components/game/Textures/TextureRightBlue.png",
			},
			//Orange
			"#e67e00": {
				leftTexture: "/js/components/game/Textures/TextureLeftOrange.png",
				rightTexture: "/js/components/game/Textures/TextureRightOrange.png",
			},
			//SoftGreen
			"#OEC384": {
				leftTexture: "/js/components/game/Textures/TextureLeftSoftGreen.png",
				rightTexture: "/js/components/game/Textures/TextureRightSoftGreen.png",
			},
			//White
			"#E6E3E1": {
				leftTexture: "/js/components/game/Textures/TextureLeftWhite.png",
				rightTexture: "/js/components/game/Textures/TextureRightWhite.png",
			},
			//Pink
			"#EC008F": {
				leftTexture: "/js/components/game/Textures/TextureLeftPink.png",
				rightTexture: "/js/components/game/Textures/TextureRightPink.png",
			},
			//Purple
			"#6400C4": {
				leftTexture: "/js/components/game/Textures/TextureLeftPurple.png",
				rightTexture: "/js/components/game/Textures/TextureRightPurple.png",
			},
		};
	}

	async initialize() {
		try {
			this.scene = new THREE.Scene();
			this.createCamera();
			this.textManager = new TextManager(this.scene);
			await this.textManager.initialize();

			if (this.renderer) {
				this.setupPostProcessing();
			}

			this.setupLights();
			await this.createGameObjects();
			this.leftPaddle.position.set(new THREE.Vector3(5, 5, 5));

			return true;
		} catch (error) {
			console.error("Failed to initialize scene:", error);
			throw error;
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
		this.light.position.set(0, 255, 158);
		this.light.castShadow = true;
		this.scene.add(this.light);
	}

	async createGameObjects() {
		try {
			await Promise.all([
				this.createDebugBall(),
				this.createDebugBounds(),
				this.createModels(),
				this.createPlayerAvatar("/js/components/game/Textures/valgrant.jpeg", new THREE.Vector3(17.3, -21.9, -11)),
				this.createPlayerAvatar("/js/components/game/Textures/image.png", new THREE.Vector3(-16.8, -21.9, -11)),
			]);
			this.createDebugPaddles();
		} catch (error) {
			console.error("Failed to create game objects:", error);
		}
	}
	updateScore(side, score) {
		this.textManager.updateScore(side, score.toString());
	}

	updatePlayerInfo(side, name, elo) {
		this.textManager.updateText(`name${side.charAt(0).toUpperCase() + side.slice(1)}`, name, 0.5);
		this.textManager.updateText(`elo${side.charAt(0).toUpperCase() + side.slice(1)}`, `[${elo}]`, 0.5);
	}

	createPlayerAvatar(imageUrl, position) {
		return new Promise((resolve, reject) => {
			const textureLoader = new THREE.TextureLoader();
			textureLoader.load(
				imageUrl,
				(texture) => {
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
					avatar.material.map.flipY = false;
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

	createDebugPaddles() {
		const paddleGeometry = new THREE.BoxGeometry(this.leftPaddle.scale.z * 1.6, this.leftPaddle.scale.x * 6.666666667, this.leftPaddle.scale.y * 1.6);
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

	async createModels() {
		const loader = new GLTFLoader();

		try {
			// Load each model individually
			const tableScale = new THREE.Vector3(4.14, 4.14, 4.14);
			const tablePos = new THREE.Vector3(0, 1.59, -30.72);
			const leftPaddleScale = new THREE.Vector3(0.75, 0.25, 0.5);
			const rightPaddlePos = new THREE.Vector3(-18, -3.2, -15);
			const rightPaddleScale = new THREE.Vector3(0.75, 0.25, 0.5);
			const leftPaddlePos = new THREE.Vector3(17.94, -3.2, -15);
			const ballScale = new THREE.Vector3(0.44, 0.44, 0.44);
			const ballPos = new THREE.Vector3(0, -3, -15);

			this.table = await this.loadModelTable("/js/components/game/Table.glb", loader, "#e67e00", "#EC008F", tableScale, tablePos, "Table");
			this.leftPaddle = await this.loadModel("/js/components/game/Paddle.glb", loader, "#e67e00", leftPaddleScale, leftPaddlePos, "Left Paddle");
			this.rightPaddle = await this.loadModel("/js/components/game/Paddle.glb", loader, "#EC008F", rightPaddleScale, rightPaddlePos, "Right Paddle");
			this.ball = await this.loadModel("/js/components/game/Ball.glb", loader, "#EC008F", ballScale, ballPos, "Ball");

			// Add models to scene
			this.scene.add(this.table);
			this.scene.add(this.leftPaddle);
			this.scene.add(this.rightPaddle);
			this.scene.add(this.ball);
		} catch (error) {
			console.error("Failed to load bonus models:", error);
			throw error;
		}
	}

	updateBallColor(color, emissionColor) {
		if (this.ball && this.ballMat) {
			this.ballMat.color.set(color);
			this.ballMat.emissive.set(emissionColor);
		}
	}

	loadModelTable(path, loader, colorLeft, colorRight, scale, position, name) {
		return new Promise((resolve, reject) => {
			const textureLoader = new THREE.TextureLoader();

			loader.load(
				path,
				(gltf) => {
					const model = gltf.scene;
					model.scale.set(scale.x, scale.y, scale.z);
					model.rotation.x = Math.PI / 2;
					model.rotation.y = Math.PI / 2;
					model.position.set(position.x, position.y, position.z);
					model.visible = true;
					model.name = name;

					model.traverse((obj) => {
						if (obj.isMesh) {
							switch (obj.material.name) {
								case "LeftBG":
									textureLoader.load(
										this.colorTextureMap[colorLeft].leftTexture,
										(texture) => {
											texture.encoding = THREE.sRGBEncoding;
											texture.flipY = false; // Might need to adjust this
											obj.material.map = texture;
											obj.material.needsUpdate = true;
										},
										undefined,
										(error) => {
											console.error("Error loading texture:", error);
										},
									);
									break;
								case "RightBG":
									textureLoader.load(
										this.colorTextureMap[colorRight].rightTexture,
										(texture) => {
											texture.encoding = THREE.sRGBEncoding;
											texture.flipY = false;
											obj.material.map = texture;
											obj.material.needsUpdate = true;
										},
										undefined,
										(error) => {
											console.error("Error loading texture:", error);
										},
									);
									break;
								case "LeftColor":
									obj.material.color.set(colorLeft);
									obj.material.emissive.set(colorLeft);
									obj.material.emissiveIntensity = 4;
									break;
								case "RightColor":
									obj.material.color.set(colorRight);
									obj.material.emissive.set(colorRight);
									obj.material.emissiveIntensity = 4;
									break;
							}
						}
					});
					resolve(model);
				},
				null,
				reject,
			);
		});
	}

	loadModel(path, loader, color, scale, position, name) {
		return new Promise((resolve, reject) => {
			const textureLoader = new THREE.TextureLoader();

			loader.load(
				path,
				(gltf) => {
					const model = gltf.scene;
					model.scale.set(scale.x, scale.y, scale.z);
					model.rotation.x = Math.PI / 2;
					model.rotation.y = Math.PI / 2;
					model.position.set(position.x, position.y, position.z);
					model.visible = true;
					model.name = name;

					model.traverse((obj) => {
						if (obj.isMesh) {
							switch (obj.material.name) {
								case "PaddleLights":
									obj.material.color.set(color);
									obj.material.emissive.set(color);
									obj.material.emissiveIntensity = 2;
									break;
								case "BallColor":
									this.ballMat = obj.material;
									obj.material.color.set(color);
									obj.material.emissive.set(color);
									obj.material.emissiveIntensity = 2;
							}
						}
					});
					resolve(model);
				},
				null,
				reject,
			);
		});
	}
}

class TextManager {
	constructor(scene) {
		this.scene = scene;
		this.font = null;
		this.meshes = new Map(); // Store all text meshes with identifiers
		this.positions = {
			scoreLeft: new THREE.Vector3(2.27, -21.1, -11.3),
			scoreRight: new THREE.Vector3(-1.83, -21.1, -11.3),
			nameLeft: new THREE.Vector3(9.1, -23, -10.4),
			nameRight: new THREE.Vector3(-8.8, -23, -10.4),
			eloLeft: new THREE.Vector3(9.1, -20.7, -11.9),
			eloRight: new THREE.Vector3(-8.8, -20.7, -11.9),
		};
		this.colorLeft = null;
		this.colorRight = null;
	}

	async initialize() {
		await this.loadFont();
	}

	async loadFont() {
		return new Promise((resolve, reject) => {
			const loader = new FontLoader();
			loader.load(
				"https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
				(font) => {
					this.font = font;
					resolve();
				},
				undefined,
				reject,
			);
		});
	}

	createText(text, position, color = 0x00ffff, scale = 1) {
		const geometry = new TextGeometry(text, {
			font: this.font,
			size: 2,
			height: 0.2,
			curveSegments: 12,
			bevelEnabled: false,
		});

		geometry.computeBoundingBox();
		geometry.translate(-geometry.boundingBox.max.x / 2, 0, 0);

		const material = new THREE.MeshStandardMaterial({
			color: color,
			metalness: 0,
			roughness: 1,
		});

		const mesh = new THREE.Mesh(geometry, material);
		mesh.position.copy(position);
		mesh.scale.set(scale, scale, scale);
		mesh.rotation.x = -0.5;
		mesh.rotation.z = Math.PI;

		return mesh;
	}

	async createInitialTexts(nameLeft, nameRight, eloLeft, eloRight, colorLeft, colorRight) {
		this.colorLeft = colorLeft;
		this.colorRight = colorRight;
		this.updateScore("left", "0");
		this.updateScore("right", "0");

		this.updateText("nameLeft", nameLeft, 0.5);
		this.updateText("nameRight", nameRight, 0.5);
		this.updateText("eloLeft", eloLeft, 0.5);
		this.updateText("eloRight", eloRight, 0.5);
	}

	updateText(id, newText, scale = 1) {
		if (this.meshes.has(id)) {
			this.scene.remove(this.meshes.get(id));
		}

		let color;
		if (id.toLowerCase().includes("left")) {
			color = this.colorLeft;
		} else if (id.toLowerCase().includes("right")) {
			color = this.colorRight;
		} else {
			color = 0x00ffff;
		}

		const mesh = this.createText(newText, this.positions[id], color, scale);
		this.scene.add(mesh);
		this.meshes.set(id, mesh);
	}

	updateScore(side, score) {
		this.updateText(`score${side.charAt(0).toUpperCase() + side.slice(1)}`, score, 1);
	}
}
