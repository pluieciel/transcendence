import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PostProcessing } from "./PostProcessing.js";
import { TextManager } from "./TextManager.js";

export class SceneManager {
	constructor(renderer, quality) {
		this.leftPaddle = null;
		this.rightPaddle = null;
		this.ball = null;
		this.base_paddle_height = 0.75;
		this.base_debug_height = 0;
		this.quality = quality;

		//Debug
		this.debugMod = false;
		this.paddles = [];
		this.topBorder = null;
		this.bottomBorder = null;
		this.rightBorder = null;
		this.leftBorder = null;
		this.trajectoryLine = null;
		this.avatar = null;

		this.composer = null;
		this.renderer = renderer;
		this.light = null;
		this.textManager = null;
		this.colorTextureMap = this.getTextureMap();
	}

	dispose() {
		if (this.scene) {
			this.scene.traverse((object) => {
				if (object.geometry) {
					object.geometry.dispose();
				}
				if (object.material) {
					if (Array.isArray(object.material)) {
						object.material.forEach((material) => material.dispose());
					} else {
						object.material.dispose();
					}
				}
			});
		}
		if (this.renderer) {
			this.renderer.dispose();
		}
		if (this.composer) {
			this.composer.dispose();
		}
	}

	shakeCamera(intensity = 0.05, duration = 500) {
		const originalPosition = this.camera.position.clone();
		const shakeEndTime = performance.now() + duration;
		console.log("shaking");
		const shake = () => {
			const now = performance.now();
			if (now < shakeEndTime) {
				const shakeX = (Math.random() - 0.5) * intensity;
				const shakeY = (Math.random() - 0.5) * intensity;
				const shakeZ = (Math.random() - 0.5) * intensity;

				this.camera.position.set(originalPosition.x + shakeX, originalPosition.y + shakeY, originalPosition.z + shakeZ);

				requestAnimationFrame(shake);
			} else {
				this.camera.position.copy(originalPosition);
			}
		};

		shake();
	}

	async initialize(data) {
		//Create Scene, Lights, Camera
		this.scene = new THREE.Scene();
		this.setupLights();
		this.createCamera();

		//Create TextManager
		this.textManager = new TextManager(this.scene);
		await this.textManager.initialize(data);

		//Create Game Objects, Models
		await this.createGameObjects(data);

		//Setup Anti aliasing and bloom
		this.postProcessing = new PostProcessing(this.renderer, this.quality, this.scene, this.camera);
		this.composer = this.postProcessing.composer;
		return true;
	}

	createCamera() {
		this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 1000);
		this.camera.position.set(0, 9.3, 50);
	}

	setupLights() {
		this.light = new THREE.DirectionalLight(0xfafafa, 8);
		this.light.position.set(0, -255, 158);
		this.light.castShadow = true;
		this.scene.add(this.light);
	}

	async createGameObjects(data) {
		await Promise.all([
			this.createDebugBall(),
			this.createDebugBounds(data),
			this.createModels(data),
			//TODO LINK FROM DB AVATAR
			//RIGHT
			this.createPlayerAvatar(data.player.right.avatar, new THREE.Vector3(16.1, 25, -9.6), data.player.right.color),
			//LEFT
			this.createPlayerAvatar(data.player.left.avatar, new THREE.Vector3(-16.7, 25, -9.6), data.player.left.color),
		]);
		this.createDebugPaddles();
	}

	updateScore(side, score) {
		this.textManager.updateScore(side, score.toString());
	}

	updatePlayerInfo(side, name, elo) {
		this.textManager.updateText(`name${side.charAt(0).toUpperCase() + side.slice(1)}`, name, 0.5);
		this.textManager.updateText(`elo${side.charAt(0).toUpperCase() + side.slice(1)}`, `[${elo}]`, 0.5);
	}

	updateObjectPosition(positions) {
		const leftPos = positions.player_left;
		const rightPos = positions.player_right;

		this.leftPaddle.position.set(leftPos.x, leftPos.y - 0.2, leftPos.z);
		this.rightPaddle.position.set(rightPos.x, rightPos.y - 0.2, rightPos.z);
		this.ball.position.set(positions.ball.x, positions.ball.y, positions.ball.z);
	}

	updateBallColor(color, emissionColor) {
		if (this.ball && this.ballMat) {
			this.ballMat.color.set(color);
			this.ballMat.emissive.set(emissionColor);
		}
	}

	async createModels(data) {
		const loader = new GLTFLoader();

		const tableScale = new THREE.Vector3(4.14, 4.14, 4.14);
		const tablePos = new THREE.Vector3(0, 1.59, -30.72);
		const leftPaddleScale = new THREE.Vector3(this.base_paddle_height, 0.25, 0.5);
		const rightPaddlePos = new THREE.Vector3(-18, -3.2, -15);
		const rightPaddleScale = new THREE.Vector3(this.base_paddle_height, 0.25, 0.5);
		const leftPaddlePos = new THREE.Vector3(17.94, -3.2, -15);
		const ballScale = new THREE.Vector3(0.44, 0.44, 0.44);
		const ballPos = new THREE.Vector3(0, -3, -15);
		const leftColor = data.player.left.color;
		const rightColor = data.player.right.color;

		this.table = await this.loadModelTable("/js/components/game/Table.glb", loader, leftColor, rightColor, tableScale, tablePos, "Table");
		this.leftPaddle = await this.loadModel("/js/components/game/Paddle.glb", loader, leftColor, leftPaddleScale, leftPaddlePos, "Left Paddle");
		this.rightPaddle = await this.loadModel("/js/components/game/Paddle.glb", loader, rightColor, rightPaddleScale, rightPaddlePos, "Right Paddle");

		//Ball defaulted to grey color
		this.ball = await this.loadModel("/js/components/game/Ball.glb", loader, "#5c6169", ballScale, ballPos, "Ball");

		this.scene.add(this.table);
		this.scene.add(this.leftPaddle);
		this.scene.add(this.rightPaddle);
		this.scene.add(this.ball);
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
					model.rotation.y = -Math.PI / 2;
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
								case "ButtonLeftInner":
								case "ButtonLeftOuter":
									obj.material.color.set(colorLeft);
									obj.material.emissive.set(colorLeft);
									obj.material.emissiveIntensity = 4;
									break;
								case "RightColor":
								case "ButtonRightOuter":
								case "ButtonRightInner":
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

	createPlayerAvatar(imageUrl, position, color) {
		return new Promise((resolve, reject) => {
			const textureLoader = new THREE.TextureLoader();
			textureLoader.load(
				imageUrl,
				(texture) => {
					texture.encoding = THREE.sRGBEncoding;
					texture.needsUpdate = true;

					const width = 5;
					const height = 5; /*width / aspectRatio;*/

					// Create the avatar plane
					const avatarGeometry = new THREE.PlaneGeometry(width, height);
					const avatarMaterial = new THREE.MeshBasicMaterial({
						map: texture,
						transparent: true,
						side: THREE.DoubleSide,
						opacity: 1,
						depthWrite: true,
						depthTest: true,
					});

					const avatar = new THREE.Mesh(avatarGeometry, avatarMaterial);
					avatar.position.copy(position);
					avatar.material.map.flipX = false;
					avatar.material.map.flipY = false;
					avatar.material.map.flipZ = false;
					avatar.material.needsUpdate = true;
					avatar.rotation.x = 0.5;
					avatar.rotation.z = Math.PI;
					avatar.rotation.y = Math.PI;
					avatar.scale.set(0.8, 0.8, 0.8);

					// Create the background plane
					const backgroundGeometry = new THREE.PlaneGeometry(width * 1.12, height * 1.12); // Slightly larger
					const backgroundMaterial = new THREE.MeshBasicMaterial({
						color: color,
						side: THREE.DoubleSide,
						opacity: 1,
						roughness: 1,
						metalness: 0,
						depthWrite: true,
						depthTest: true,
					});

					const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
					background.position.copy(position);
					background.position.z -= 0.1; // Slightly behind the avatar
					background.rotation.x = 0.5;
					background.scale.set(0.8, 0.8, 0.8);

					this.scene.add(background);
					this.scene.add(avatar);
					this.avatar = avatar;

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

	getTextureMap() {
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
			"#3E27F8": {
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
		return this.colorTextureMap;
	}

	/************************DEBUG************************ */

	toggleDebugMode() {
		this.debugMod = !this.debugMod;

		this.paddles.forEach((paddle) => (paddle.visible = this.debugMod));
		this.ball.visible = this.debugMod;
		this.topBorder.visible = this.debugMod;
		this.bottomBorder.visible = this.debugMod;
		this.leftBorder.visible = this.debugMod;
		this.rightBorder.visible = this.debugMod;
		if (this.trajectoryLine) this.showTrajectory(this.debugMod);

		this.leftPaddle.visible = !this.debugMod;
		this.rightPaddle.visible = !this.debugMod;
		this.ball.visible = !this.debugMod;
	}

	updateTrajectory(trajectoryPoints) {
		if (this.trajectoryLine) {
			this.scene.remove(this.trajectoryLine);
		}

		if (!trajectoryPoints || trajectoryPoints.length < 2) return;

		const points = trajectoryPoints.map((point) => new THREE.Vector3(point.x, point.y, point.z));

		const geometry = new THREE.BufferGeometry().setFromPoints(points);
		const material = new THREE.LineBasicMaterial({
			color: 0xffffff,
			opacity: 1,
		});

		this.trajectoryLine = new THREE.Line(geometry, material);
		this.scene.add(this.trajectoryLine);
		this.trajectoryLine.visible = this.debugMod;
	}

	showTrajectory(visible) {
		if (this.trajectoryLine) {
			this.trajectoryLine.visible = visible;
		}
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
		this.base_debug_height = paddle1.scale.y;
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

	createDebugBounds(data) {
		const positions = data.positions;

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

		this.topBorder.position.set(positions.borders.top.x, positions.borders.top.y, positions.borders.top.z);
		this.bottomBorder.position.set(positions.borders.bottom.x, positions.borders.bottom.y, positions.borders.bottom.z);
		this.leftBorder.position.set(positions.borders.left.x, positions.borders.left.y, positions.borders.left.z);
		this.rightBorder.position.set(positions.borders.right.x, positions.borders.right.y, positions.borders.right.z);

		this.scene.add(this.topBorder);
		this.scene.add(this.bottomBorder);
		this.scene.add(this.leftBorder);
		this.scene.add(this.rightBorder);
	}

	updateDebugPositions(positions) {
		if (this.ball && positions.ball) {
			this.ball.position.set(positions.ball.x, positions.ball.y, positions.ball.z || 0);
		}
		if (positions.player_left) {
			this.paddles[0].position.set(positions.player_left.x, positions.player_left.y, positions.player_left.z);
		}
		if (positions.player_right) {
			this.paddles[1].position.set(positions.player_right.x, positions.player_right.y, positions.player_right.z);
		}
	}
}
