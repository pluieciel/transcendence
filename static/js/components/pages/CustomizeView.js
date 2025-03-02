import { addUserData } from "../utils/settingsUtils.js";
import { SceneManager } from "../game/SceneManager.js";
import { Renderer } from "../game/Renderer.js";
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";

export default class CustomizeView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.previewGame = null;
		this.saveButton = null;
		this.unlockedColors = new Set();
		this.init();
	}

	async init() {
		await window.app.getSettings();
		await this.render();
		window.app.initChat();
		this.addEventListeners();
		this.settings = {
			color: window.app.settings.color,
			quality: window.app.settings.quality,
			isSaved: false,
		};
		await addUserData(this.settings);
		const canvas = document.getElementById("preview");
		this.saveButton = document.querySelector('#save-button');
		this.previewGame = new PreviewGame(canvas);
		await this.previewGame.initialize();
		await this.getColors(this.username)
		document.querySelector('#input-message').innerHTML = 'locked'
	}

	setSaveButtonActive(active)
	{
		if (active)
		{
			this.saveButton.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save';
			this.saveButton.disabled = '';
		}
		else
		{
			this.saveButton.innerHTML = '<i class="fa-solid fa-lock"></i> Locked';
			this.saveButton.disabled = true;
		}
	}

	async getColors(username) {
		try {
			const response = await fetch(`/api/profiles/${username}/colors/`);
			const data = await response.json();
			if (data.success) {
				this.unlockedColors = new Set(data.colors);
				this.setSaveButtonActive(this.unlockedColors.has(this.settings.color))
				return data.colors;
			} else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
				window.app.logout();
			} else {
				console.error("Failed to fetch colors:", data.message);
				return [];
			}
		} catch (error) {
			console.error("An error occurred: " + error);
			return [];
		}
	}

	async render() {
		await window.app.renderHeader(this.container, "customize");
		this.container.innerHTML += `
			<main>
				<div id="customize-card" class="card">
					<h2 id="card-title"><i class="fa-solid fa-palette"></i> CUSTOMIZE</h2>
					<div id="color">
						<button id="selector-left-arrow"><i class="fa-solid fa-arrow-left fa-lg"></i></button>
						<div id="selector-middle">
							<span id="color-span"></span>
						</div>
						<button id="selector-right-arrow"><i class="fa-solid fa-arrow-right fa-lg"></i></button>
					</div>
					<div id="quality">
						<button id="selector-left-arrow"><i class="fa-solid fa-arrow-left fa-lg"></i></button>
						<div id="selector-middle">
							<span id="quality-span"></span>
						</div>
						<button id="selector-right-arrow"><i class="fa-solid fa-arrow-right fa-lg"></i></button>
					</div>
					<div id="input-message" class="input-message"></div>
					<button id="save-button" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save</button>
				</div>
				<div id="preview-card" class="card">
					<canvas id="preview"></canvas>
				</div>
			</main>
			<div id="chatBoxContainer"></div>
		`;
	}

	addCustomizationEventListeners() {
		const leftColor = document.querySelector("#color #selector-left-arrow");
		const rightColor = document.querySelector("#color #selector-right-arrow");
		const leftQuality = document.querySelector("#quality #selector-left-arrow");
		const rightQuality = document.querySelector("#quality #selector-right-arrow");
		const saveChanges = document.getElementById("save-button");

		leftColor.addEventListener("click", () => {
			if (this.settings.color == 0) this.settings.color = 9;
			else this.settings.color -= 1;
			addUserData(this.settings);
			this.previewGame.updateColor(this.settings.color);
			this.settings.isSaved = false;

			
			this.setSaveButtonActive(this.unlockedColors.has(this.settings.color));
		});

		rightColor.addEventListener("click", () => {
			if (this.settings.color == 9) this.settings.color = 0;
			else this.settings.color += 1;
			addUserData(this.settings);
			this.previewGame.updateColor(this.settings.color);
			this.settings.isSaved = false;
			this.setSaveButtonActive(this.unlockedColors.has(this.settings.color));
		});

		leftQuality.addEventListener("click", () => {
			rightQuality.disabled = false;
			if (this.settings.quality == 0)
				return;
			if (this.settings.quality == 1)
				leftQuality.disabled = true;
			this.settings.quality -= 1;
			addUserData(this.settings);
			this.previewGame.updateComposer(this.settings.quality);
			this.settings.isSaved = false;
		});

		rightQuality.addEventListener("click", () => {
			leftQuality.disabled = false;
			if (this.settings.quality == 2) return;
			if (this.settings.quality == 1)
				rightQuality.disabled = true;
			this.settings.quality += 1;
			addUserData(this.settings);
			this.previewGame.updateComposer(this.settings.quality);
			this.settings.isSaved = false;
		});

		saveChanges.addEventListener("click", async () => {
			try {
				const inputMessage = document.getElementById('input-message');
				inputMessage.innerHTML = '';
				inputMessage.style.display = 'none';

				const response = await fetch('/api/settings/customize/update/', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						'color': this.settings.color,
						'quality': this.settings.quality,
					}),
				});
					
				const data = await response.json();
		
				if (data.success) {
					if (data.message === 'No changes made')
						window.app.showWarningMsg('#input-message', data.message);
					else {
						window.app.showSuccessMsg('#input-message', data.message);
						window.app.settings.color = this.settings.color;
						window.app.settings.quality = this.settings.quality;
						this.settings.isSaved = true;
					}
				} else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
					window.app.logout();
				} else {
					window.app.showErrorMsg('#input-message', data.message);
				}
			} catch (error) {
				console.error("An error occurred: " + error);
			};
		});
	}

	addRefreshOnNavEventListeners() {
		const navButtons = document.querySelectorAll(".nav-button");
		navButtons.forEach((button) => {
			button.addEventListener("click", () => {
				if (this.previewGame)
					this.previewGame.destroy();
				if (!this.settings.isSaved)
					window.app.getUserPreferences();
			});
		});
	}

	addEventListeners() {
		window.app.addNavEventListeners();
		this.addCustomizationEventListeners();
		this.addRefreshOnNavEventListeners();
		window.addEventListener("popstate", () => {
			if (this.previewGame)
				this.previewGame.destroy();
			if (!this.settings.isSaved)
				window.app.getUserPreferences();
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
		if (!window.app.settings.fetched) await window.app.getUserPreferences();
		
		this.renderer = new Renderer(this.canvas, true);
		
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
				return "#447AFF";
			case 1:
				return "#00BDD1";
			case 2:
				return "#00AD06";
			case 3:
				return "#E67E00";
			case 4:
				return "#E6008F";
			case 5:
				return "#6900CC";
			case 6:
				return "#E71200";
			case 7:
				return "#0EC384";
			case 8:
				return "#E6E3E1";
			case 9:
				return "#D5DA2B";
			default:
				return "#00BDD1";
		}
	}

	destroy() {
		
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
					case "ButtonLeftInnerUp":
					case "ButtonLeftInnerDown":
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
