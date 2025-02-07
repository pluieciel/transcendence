import { addUserData, message, message2, saveUserChanges, eraseInDB } from "../utils/settingsUtils.js";
import { SceneManager } from "../game/SceneManager.js";
import { Renderer } from "../game/Renderer.js";
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";

export default class CustomizeView {
    constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.previewGame = null;
		this.init();
	}

	async init() {
		this.render();
		this.addEventListeners();
		await this.getSettings();
		if (window.app.settings.is_admin) {
			const adminButton = document.getElementById("admin-button");
			adminButton.style.display = "block";
		}
		await addUserData(this.settings);
		const canvas = document.getElementById("previewCanvas");
		this.previewGame = new PreviewGame(canvas);
		await this.previewGame.initialize();
	}

	async getSettings() {
		if (!window.app.settings["fetched"]) await window.app.getPreferences();
		this.settings = {
			color: window.app.settings.color,
			quality: window.app.settings.quality,
		};
		return;
	}

	async refresh_settings() {
		await window.app.getPreferences();
	}

	render() {
		this.container.innerHTML = `
<header>
				<h1 id="pong">P
					<button id="credit-button">
						<i class="fa-solid fa-table-tennis-paddle-ball fa-xs"></i>
					</button>
					 N G
				</h1>
				<div id="nav-buttons">
					<button class="nav-button" id="play-button">
						<i class="fa-solid fa-gamepad fa-xl"></i>Play
					</button>
					<button class="nav-button nav-button-disabled" id="customize-button">
						<i class="fa-solid fa-palette fa-xl"></i>Customize
					</button>
					<button class="nav-button" id="leaderboard-button">
						<i class="fa-solid fa-medal fa-xl"></i>Leaderboard
					</button>
					<button class="nav-button" id="achievements-button">
						<i class="fa-solid fa-trophy fa-xl"></i>Achievements
					</button>
					<button class="nav-button" id="profile-button">
						<i class="fa-solid fa-user fa-xl"></i>Profile
					</button>
					<button class="nav-button" id="admin-button">
						<i class="fa-solid fa-user-tie fa-xl"></i>Admin
					</button>
					<button class="nav-button" id="logout-button">
						<i class="fa-solid fa-right-from-bracket fa-xl"></i>Log Out
					</button>
				</div>
			</header>
	<div class ="contentCustomize">
		<div class="containerGame userOutline">
			<h3>Game customization</h3>
			<div id="row">
				<button id="leftColor" class="arrow"><</button>
				<div id="colorDiv"></div>
				<button id="rightColor"class="arrow">></button>
			</div>
			<div id="row">
				<button id="leftQuality" class="arrow"><</button>
				<div id="qualityDiv"></div>
				<button id="rightQuality"class="arrow">></button>
			</div>
			<button id="savebtn">Save changes</button>
		</div>
		<canvas id="previewCanvas" class='userOutline' ></canvas>
		<div class="modal fade" id="changeModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<h1 class="modal-title fs-5" id="modalHeader"></h1>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
					</div>
					<div class="modal-body">
						<h2 class="modal-title fs-5" id="modalDialog"></h2>
					</div>
					<div id="modalFooter" class="modal-footer d-none">
						<button class="btn btn-primary" id="modalsavebtn">Save changes</button>
						<button class="btn btn-primary" id="gotomainbtn">Go to main without saving</button>
					</div>
				</div>
			</div>
		</div>


					`;
	}

	addCustomizationEventListeners() {
		const leftColor = document.getElementById("leftColor");
		const rightColor = document.getElementById("rightColor");
		const leftQuality = document.getElementById("leftQuality");
		const rightQuality = document.getElementById("rightQuality");
		const saveChanges = document.getElementById("savebtn");
		const saveChanges2 = document.getElementById("modalsavebtn");
		const gotomain = document.getElementById("gotomainbtn");

		leftColor.addEventListener("click", () => {
			if (this.settings.color == 0) this.settings.color = 8;
			else this.settings.color -= 1;
			window.app.settings.color = this.settings.color;
			addUserData(this.settings);
			this.previewGame.updateColor(this.settings.color);
		});

		rightColor.addEventListener("click", () => {
			if (this.settings.color == 8) this.settings.color = 0;
			else this.settings.color += 1;
			window.app.settings.color = this.settings.color;
			addUserData(this.settings);
			this.previewGame.updateColor(this.settings.color);
		});

		leftQuality.addEventListener("click", () => {
			if (this.settings.quality == 0) return;
			this.settings.quality -= 1;
			window.app.settings.quality = this.settings.quality;
			addUserData(this.settings);
			this.previewGame.updateComposer(this.settings.quality);
		});

		rightQuality.addEventListener("click", () => {
			if (this.settings.quality == 2) return;
			this.settings.quality += 1;
			window.app.settings.quality = this.settings.quality;
			addUserData(this.settings);
			this.previewGame.updateComposer(this.settings.quality);
		});

		saveChanges.addEventListener("click", async () => {
			await saveUserChanges(false, this.settings);
		});
	}

	addNavEventListeners() {
		const creditButton = document.getElementById("credit-button");
		const playButton = document.getElementById("play-button");
		const customizeButton = document.getElementById("customize-button");
		const leaderboardButton = document.getElementById("leaderboard-button");
		const achievementsButton = document.getElementById("achievements-button");
		const profileButton = document.getElementById("profile-button");
		const adminButton = document.getElementById("admin-button");
		const logoutButton = document.getElementById("logout-button");

		creditButton.addEventListener("click", async () => {
			if (this.previewGame) {
				this.previewGame.destroy();
				await this.refresh_settings();
			}
			window.app.router.navigateTo("/credits");
		});

		playButton.addEventListener("click", async () => {
			if (this.previewGame) {
				this.previewGame.destroy();
				await this.refresh_settings();
			}
			window.app.router.navigateTo("/index");
		});

		customizeButton.addEventListener("click", async () => {
			if (this.previewGame) {
				this.previewGame.destroy();
				await this.refresh_settings();
			}
			window.app.router.navigateTo("/customize");
		});

		leaderboardButton.addEventListener("click", async () => {
			if (this.previewGame) {
				this.previewGame.destroy();
				await this.refresh_settings();
			}
			window.app.router.navigateTo("/leaderboard");
		});

		achievementsButton.addEventListener("click", async () => {
			if (this.previewGame) {
				this.previewGame.destroy();
				await this.refresh_settings();
			}
			window.app.router.navigateTo("/achievements");
		});

		profileButton.addEventListener("click", async () => {
			if (this.previewGame) {
				this.previewGame.destroy();
				await this.refresh_settings();
			}
			window.app.router.navigateTo("/profile");
		});

		adminButton.addEventListener("click", async () => {
			if (this.previewGame) {
				this.previewGame.destroy();
				await this.refresh_settings();
			}
			window.app.router.navigateTo("/admin");
		});

		logoutButton.addEventListener("click", async () => {
			if (this.previewGame) {
				this.previewGame.destroy();
				await this.refresh_settings();
			}
			window.app.chatBox.disconnect();
			window.app.logout();
		});
	}

	addEventListeners() {
		this.addCustomizationEventListeners();
		this.addNavEventListeners();
		window.addEventListener("popstate", () => {
			if (this.previewGame) {
				this.previewGame.destroy();
				this.refresh_settings();
			}
		});
	}
}

class PreviewGame {
	constructor(canvas) {
		this.canvas = canvas;
		this.renderer = null;
		this.sceneManager = null;
		this.previewRunning = false;
		this.animationFrameId = null;
	}

	async initialize() {
		if (!window.app.settings.fetched) await window.app.getPreferences();
		console.log("Initializing preview with settings:", window.app.settings);
		this.renderer = new Renderer(this.canvas, true);
		console.log("calling with " + window.app.settings.quality);
		this.sceneManager = new SceneManager(this.renderer.renderer, window.app.settings.quality);
		await this.sceneManager.initialize_preview(this.getColor(window.app.settings.color));
		this.previewRunning = true;

		// Initialize OrbitControls
		this.controls = new OrbitControls(this.sceneManager.camera, this.renderer.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.05;
		this.controls.screenSpacePanning = false;
		this.controls.minDistance = 10;
		this.controls.maxDistance = 100;
		this.controls.update();
		this.sceneManager.camera.rotation.x = 0;
		this.previewRunning = true; // Start the preview

		this.animate();
	}

	getColor(color) {
		switch (color) {
			case 0:
				return "#3E27F8";
			case 1:
				return "#00BDD1";
			case 2:
				return "#00AD06";
			case 3:
				return "#E67E00";
			case 4:
				return "#E6008F";
			case 5:
				return "#6400C4";
			case 6:
				return "#E71200";
			case 7:
				return "#0EC384";
			case 8:
				return "#E6E3E1";
			default:
				return "#00BDD1";
		}
	}

	destroy() {
		console.log("Destroying preview...");
		this.previewRunning = false;
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
		if (this.sceneManager) {
			this.sceneManager.dispose();
			this.sceneManager = null;
		}
		if (this.renderer) {
			this.renderer.dispose();
			this.renderer = null;
		}
		console.log("Preview destroyed.");
	}

	animate() {
		if (!this.previewRunning) return; // Stop the animation loop if the flag is false
		this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
		this.sceneManager.composer.render();
	}

	updateComposer(quality) {
		if (quality == 0) {
			this.sceneManager.composer = this.sceneManager.low_composer;
		}
		if (quality == 1) {
			this.sceneManager.composer = this.sceneManager.medium_composer;
		}
		if (quality == 2) {
			this.sceneManager.composer = this.sceneManager.high_composer;
		}
	}

	updateColor(color) {
		const textureLoader = new THREE.TextureLoader();
		const colorTextureMap = this.sceneManager.getTextureMap();
		color = this.getColor(color);
		const table = this.sceneManager.table;
		const paddle = this.sceneManager.leftPaddle;
		console.log(color + "  " + colorTextureMap[color]);

		table.traverse((obj) => {
			if (obj.isMesh) {
				switch (obj.material.name) {
					case "LeftBG":
						textureLoader.load(
							colorTextureMap[color].leftTexture,
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
						obj.material.color.set(color);
						obj.material.emissive.set(color);
						break;
				}
			}
		});

		paddle.traverse((obj) => {
			if (obj.isMesh && obj.material.name === "PaddleLights") {
				obj.material.color.set(color);
				obj.material.emissive.set(color);
			}
		});

		this.sceneManager.updateBallColor(color, color);
	}
}
