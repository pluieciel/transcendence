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
		this.base_ball_scale = 0.44;
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
		this.low_composer = null;
		this.medium_composer = null;
		this.high_composer = null;
		this.renderer = renderer;
		this.light = null;
		this.textManager = null;
		this.colorTextureMap = this.getTextureMap();

		this.invisibilityField = null;

		this.leftButtonDownMat = null;
		this.leftButtonUpMat = null;
		this.rightButtonDownMat = null;
		this.rightButtonUpMat = null;
	}

	dispose() {
		

		if (this.scene) {
			this.scene.traverse((object) => {
				if (object.geometry) {
					object.geometry.dispose();
				}
				if (object.material) {
					if (Array.isArray(object.material)) {
						object.material.forEach((material) => {
							if (material.map) material.map.dispose(); // Dispose of textures
							material.dispose();
						});
					} else {
						if (object.material.map) object.material.map.dispose(); // Dispose of textures
						object.material.dispose();
					}
				}
			});

			// Remove all objects from the scene
			while (this.scene.children.length > 0) {
				this.scene.remove(this.scene.children[0]);
			}
		}

		if (this.renderer) {
			this.renderer.dispose();
		}

		if (this.composer) {
			this.composer.passes.forEach((pass) => {
				if (pass.dispose) pass.dispose();
			});
			this.composer.dispose();
		}

		if (this.low_composer) {
			this.low_composer.passes.forEach((pass) => {
				if (pass.dispose) pass.dispose();
			});
			this.low_composer.dispose();
		}

		if (this.medium_composer) {
			this.medium_composer.passes.forEach((pass) => {
				if (pass.dispose) pass.dispose();
			});
			this.medium_composer.dispose();
		}

		if (this.high_composer) {
			this.high_composer.passes.forEach((pass) => {
				if (pass.dispose) pass.dispose();
			});
			this.high_composer.dispose();
		}

		
	}

	shakeCamera(intensity = 0.05, duration = 500) {
		const originalPosition = this.camera.position.clone();
		const shakeEndTime = performance.now() + duration;
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

	async initialize_preview(base_color) {
		//Create Scene, Lights, Camera
		this.scene = new THREE.Scene();
		this.setupLights();
		this.createCamera();
		this.createModelsPreview(base_color);

		this.postProcessingLow = new PostProcessing(this.renderer, 0, this.scene, this.camera, true);
		this.postProcessingMedium = new PostProcessing(this.renderer, 1, this.scene, this.camera, true);
		this.postProcessingHigh = new PostProcessing(this.renderer, 2, this.scene, this.camera, true);
		this.postProcessing = new PostProcessing(this.renderer, this.quality, this.scene, this.camera, true);
		this.low_composer = this.postProcessingLow.composer;
		this.medium_composer = this.postProcessingMedium.composer;
		this.high_composer = this.postProcessingHigh.composer;
		this.composer = this.postProcessing.composer;
		return true;
	}

	createCamera() {
		this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 1000);
		this.camera.position.set(0, 9.3, 50);
		this.camera.rotation.set(0, 0, 0);
	}

	setupLights() {
		this.light = new THREE.DirectionalLight(0xfafafa, 8);
		this.light.position.set(0, -255, 158);
		this.light.castShadow = true;
		this.scene.add(this.light);
	}

	createInvisibilityField(data, colorLeft, colorRight)
	{
		const positions = data.positions;
	
		// Use MeshBasicMaterial instead of LineBasicMaterial for emissive properties
		const middleMat = new THREE.MeshBasicMaterial({ 
			color: 0x000000, 
			opacity: 0.1 
			
			//emissive: 0xe3e6e5, 
			//emissiveIntensity: 0, // Adjusted for visibility
		});

		const leftMat = new THREE.MeshStandardMaterial({ 
			color: 0xe3e6e5, 
			emissive: colorLeft, 
			emissiveIntensity: 5
		});

		const rightMat = new THREE.MeshStandardMaterial({ 
			color: 0xe3e6e5, 
			emissive: colorRight, 
			emissiveIntensity: 5
		});
	
		const lineGeometry = new THREE.BoxGeometry(0.3, 30, 0.2);
		const middleGeometry = new THREE.BoxGeometry(12, 30, 0.2);
	
		const leftEdges = new THREE.EdgesGeometry(lineGeometry);
		const rightEdges = new THREE.EdgesGeometry(lineGeometry);

		const middle = new THREE.Mesh(middleGeometry, middleMat);
		const right = new THREE.Mesh(rightEdges, rightMat);
		const left = new THREE.Mesh(leftEdges, leftMat);
	
		middle.position.set(0, positions.borders.left.y, positions.borders.left.z);
		right.position.set(6, positions.borders.right.y, positions.borders.right.z);
		left.position.set(-6, positions.borders.left.y, positions.borders.left.z);

		right.rotation.set(0,1,0);
		left.rotation.set(0,-1,0);
		
		this.invisibilityField = new THREE.Group();
		this.invisibilityField.add(middle);
		this.invisibilityField.add(right);
		this.invisibilityField.add(left);
		this.scene.add(this.invisibilityField);
		this.invisibilityField.visible = false;
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
			this.createInvisibilityField(data, data.player.left.color, data.player.right.color),
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
		const rightPaddlePos = new THREE.Vector3(-18, 6, -15);
		const rightPaddleScale = new THREE.Vector3(this.base_paddle_height, 0.25, 0.5);
		const leftPaddlePos = new THREE.Vector3(17.94, 6, -15);
		const ballScale = new THREE.Vector3(0.44, 0.44, 0.44);
		const ballPos = new THREE.Vector3(0, 6, -15);
		const leftColor = data.player.left.color;
		const rightColor = data.player.right.color;

		this.table = await this.loadModelTable("/js/components/game/Table.glb", loader, leftColor, rightColor, tableScale, tablePos, "Table");
		this.leftPaddle = await this.loadModel("/js/components/game/Paddle.glb", loader, leftColor, leftPaddleScale, leftPaddlePos, "Left Paddle");
		this.rightPaddle = await this.loadModel("/js/components/game/Paddle.glb", loader, rightColor, rightPaddleScale, rightPaddlePos, "Right Paddle");

		this.setButtonBrightness("left", true, false);
		this.setButtonBrightness("left", false, false);
		this.setButtonBrightness("right", true, false);
		this.setButtonBrightness("right", false, false);
		//Ball defaulted to grey color
		this.ball = await this.loadModel("/js/components/game/Ball.glb", loader, "#5c6169", ballScale, ballPos, "Ball");

		this.scene.add(this.table);
		this.scene.add(this.leftPaddle);
		this.scene.add(this.rightPaddle);
		this.scene.add(this.ball);
	}

	async createModelsPreview(base_color) {
		const loader = new GLTFLoader();
		const tableScale = new THREE.Vector3(4.14, 4.14, 4.14);
		const tablePos = new THREE.Vector3(0, 1.59, -30.72);
		const leftPaddleScale = new THREE.Vector3(this.base_paddle_height, 0.25, 0.5);
		const leftPaddlePos = new THREE.Vector3(-18, 6, -15);
		const rightPaddleScale = new THREE.Vector3(this.base_paddle_height, 0.25, 0.5);
		const rightPaddlePos = new THREE.Vector3(17.94, 6, -15);
		const ballScale = new THREE.Vector3(0.44, 0.44, 0.44);
		const ballPos = new THREE.Vector3(0, 6, -15);
		const leftColor = base_color;
		const rightColor = "#00BDD1";
	
		this.table = await this.loadModelTable("/js/components/game/Table.glb", loader, leftColor, rightColor, tableScale, tablePos, "Table");
		this.leftPaddle = await this.loadModel("/js/components/game/Paddle.glb", loader, leftColor, leftPaddleScale, leftPaddlePos, "Left Paddle");
		this.rightPaddle = await this.loadModel("/js/components/game/Paddle.glb", loader, rightColor, rightPaddleScale, rightPaddlePos, "Right Paddle");

		//Ball defaulted to grey color
		this.ball = await this.loadModel("/js/components/game/Ball.glb", loader, base_color, ballScale, ballPos, "Ball");

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

								case "ButtonLeftInnerUp":
									this.leftButtonUpMat = obj.material;
									obj.material.color.set(colorLeft);
									obj.material.emissive.set(colorLeft);
									obj.material.emissiveIntensity = 4;
									break;
								case "ButtonLeftInnerDown":
									this.leftButtonDownMat = obj.material;
									obj.material.color.set(colorLeft);
									obj.material.emissive.set(colorLeft);
									obj.material.emissiveIntensity = 4;
									break;					
								case "ButtonLeftOuter":
								case "LeftColor":
									obj.material.color.set(colorLeft);
									obj.material.emissive.set(colorLeft);
									obj.material.emissiveIntensity = 4;
									break;
								case "ButtonRightInnerUp":
									this.rightButtonUpMat = obj.material;
									obj.material.color.set(colorRight);
									obj.material.emissive.set(colorRight);
									obj.material.emissiveIntensity = 4;
									break;
								case "ButtonRightInnerDown":
									this.rightButtonDownMat = obj.material;
									obj.material.color.set(colorRight);
									obj.material.emissive.set(colorRight);
									obj.material.emissiveIntensity = 4;
									break;
								case "RightColor":
								case "ButtonRightOuter":
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

	setButtonBrightness(side, up, on) {
		brightness = on ? 6 : 0;
		if (side === "left" && up) {
			this.leftButtonUpMat.emissiveIntensity = brightness;
		}
		else if (side === "left" && !up) {
			this.leftButtonDownMat.emissiveIntensity = brightness;
		}
		else if (side === "right" && up) {
			this.rightButtonUpMat.emissiveIntensity = brightness;
		}
		else if (side === "right" && !up) {
			this.rightButtonDownMat.emissiveIntensity = brightness;
		}
	}


	getDisabledButtonColor(baseColor, factor)
	{
		const color = new THREE.Color(baseColor);
		const hsl = { h: 0, s: 0, l: 0 };

		color.getHSL(hsl);
		hsl.l = Math.min(1, hsl.l * 0.2);

		color.setHSL(hsl.h, hsl.s, hsl.l);
		return color;
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
				leftTexture: "/js/components/game/Textures/RedTextureLeft.png",
				rightTexture: "/js/components/game/Textures/RedTextureRight.png",
			},
			//Green
			"#00AD06": {
				leftTexture: "/js/components/game/Textures/GreenTextureLeft.png",
				rightTexture: "/js/components/game/Textures/GreenTextureRight.png",
			},
			//Cyan
			"#00BDD1": {
				leftTexture: "/js/components/game/Textures/CyanTextureLeft.png",
				rightTexture: "/js/components/game/Textures/CyanTextureRight.png",
			},
			//Blue
			"#447AFF": {
				leftTexture: "/js/components/game/Textures/BlueTextureLeft.png",
				rightTexture: "/js/components/game/Textures/BlueTextureRight.png",
			},
			//Orange
			"#E67E00": {
				leftTexture: "/js/components/game/Textures/OrangeTextureLeft.png",
				rightTexture: "/js/components/game/Textures/OrangeTextureRight.png",
			},
			//SoftGreen
			"#0EC384": {
				leftTexture: "/js/components/game/Textures/SoftGreenTextureLeft.png",
				rightTexture: "/js/components/game/Textures/SoftGreenTextureRight.png",
			},
			//White
			"#E6E3E1": {
				leftTexture: "/js/components/game/Textures/WhiteTextureLeft.png",
				rightTexture: "/js/components/game/Textures/WhiteTextureRight.png",
			},
			//Pink
			"#E6008F": {
				leftTexture: "/js/components/game/Textures/PinkTextureLeft.png",
				rightTexture: "/js/components/game/Textures/PinkTextureRight.png",
			},
			//Purple
			"#6900CC": {
				leftTexture: "/js/components/game/Textures/PurpleTextureLeft.png",
				rightTexture: "/js/components/game/Textures/PurpleTextureRight.png",
			},
			//Yellow
			"#D5DA2B": {
				leftTexture: "/js/components/game/Textures/YellowTextureLeft.png",
				rightTexture: "/js/components/game/Textures/YellowTextureRight.png",
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
