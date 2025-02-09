import ChatBox from "../chat/ChatBox.js";
import Tournament from "../tournament/Tournament.js";
import GameComponent from "../game/GameComponents.js";

export default class MainView {
	constructor(container) {
		this.container = container;

		this.countdownTime = 0;
		this.timerInterval = null;

		this.username = window.app.state.username;
		window.app.settings["game-type"] = "classic";
		this.init();
	}

	async init() {
		this.render();
		this.initComponents();
		if (!window.app.settings["fetched"]) window.app.getPreferences();
		this.checkForBackdrop();
		this.addEventListeners();
		await this.getSettings();
	}

	async getSettings() {
		if (!window.app.settings["fetched"]) await window.app.getPreferences();
		if (window.app.settings.is_admin) {
			const adminButton = document.getElementById("admin-button");
			adminButton.style.display = "block";
		}
	}

	render() {
		window.app.renderHeader(this.container, "play");
		this.container.innerHTML += `
			<main>
				<div id="play-card" class="card">
					<h2 id="card-title">PLAY</h2>
					<div id="game-mode">
						<div class="checkbox-button">
							<input type="checkbox" id="game-mode-checkbox" class="checkbox">
							<div class="knobs">
								<span id="game-mode-classic"><i class="fa-solid fa-star"></i> Classic</span>
								<span id="game-mode-rumble"><i class="fa-solid fa-bolt"></i> Rumble</span>
							</div>
							<div class="layer"></div>
						</div>
					</div>
					<div id="game-type">
						<button id="selector-left-arrow"><i class="fa-solid fa-arrow-left fa-lg"></i></button>
						<div id="selector-middle">
							<span id="game-type-ai" data-game-type="ai"><i class="fa-solid fa-robot"></i> AI</span>
							<span id="game-type-ranked" data-game-type="ranked"><i class="fa-solid fa-ranking-star"></i> Ranked</span>
							<span id="game-type-tournament" data-game-type="tournament"><i class="fa-solid fa-crown"></i> Tournament</span>
						</div>
						<button id="selector-right-arrow"><i class="fa-solid fa-arrow-right fa-lg"></i></button>
					</div>
					<button id="start-button" type="submit"><i class="fa-solid fa-gamepad"></i> Play</button>
				</div>
				<div id="chatBoxContainer"></div>
				<div id="tournamentContainer"></div>
				<div id="gameContainer"></div>
			</main>
		`;
	}

	initComponents() {
		const tournamentContainer = this.container.querySelector("#tournamentContainer");
		if (!window.app.tournament) {
			window.app.tournament = new Tournament(tournamentContainer);
		} else {
			window.app.tournament.container = tournamentContainer;
			window.app.tournament.render();
			window.app.tournament.addEventListeners();
			window.app.tournament.updateContent();
		}

		const chatBoxContainer = this.container.querySelector("#chatBoxContainer");
		if (!window.app.chatBox) {
			window.app.chatBox = new ChatBox(chatBoxContainer);
		} else {
			window.app.chatBox.container = chatBoxContainer;
			window.app.chatBox.render(chatBoxContainer);
			window.app.chatBox.addEventListeners();
			window.app.chatBox.updateOnlineUsersList();
		}

		new GameComponent(this.container.querySelector("#gameContainer"));

		const quickMatchButton = this.container.querySelector("#quickMatch");
		if (quickMatchButton) {
			quickMatchButton.setAttribute("data-bs-toggle", "modal");
			quickMatchButton.setAttribute("data-bs-target", "#matchSearch");
		}
	}

	addGameTypeSelectorEventListeners() {
		const playButton = document.getElementById("start-button");
		const leftArrow = document.getElementById("selector-left-arrow");
		const rightArrow = document.getElementById("selector-right-arrow");

		const gameTypes = [
			document.getElementById("game-type-ai"),
			document.getElementById("game-type-ranked"),
			document.getElementById("game-type-tournament")
		];

		let currentIndex = 0;
		window.app.settings["game-type"] = "ai";

		gameTypes.forEach((type, index) => {
			type.style.display = index === currentIndex ? "block" : "none";
		});

		const updateDisplay = (newIndex) => {
			gameTypes[currentIndex].style.display = "none";
			currentIndex = newIndex;
			gameTypes[currentIndex].style.display = "block";

			switch (currentIndex) {
				case 0:
					window.app.settings["game-type"] = "ai";
					playButton.removeAttribute("data-bs-toggle");
					playButton.removeAttribute("data-bs-target");
					playButton.removeAttribute("data-view");
					break;
				case 1:
					window.app.settings["game-type"] = "ranked";
					playButton.setAttribute("data-bs-toggle", "modal");
					playButton.setAttribute("data-bs-target", "#matchSearch");
					playButton.setAttribute("data-view", "game");
					break;
				case 2:
					window.app.settings["game-type"] = "tournament";
					playButton.setAttribute("data-bs-toggle", "modal");
					playButton.setAttribute("data-bs-target", "#tournamentModal");
					playButton.removeAttribute("data-view");
					break;
				default:
					break;
			}
		};

		leftArrow.addEventListener("click", () => {
			const newIndex = (currentIndex - 1 + gameTypes.length) % gameTypes.length;
			updateDisplay(newIndex);
		});

		rightArrow.addEventListener("click", () => {
			const newIndex = (currentIndex + 1) % gameTypes.length;
			updateDisplay(newIndex);
		});
	}

	addEventListeners() {
		window.app.addNavEventListeners();
		this.addGameTypeSelectorEventListeners();
	}

	checkForBackdrop() {
		const el = document.querySelector(".modal-backdrop");
		if (el) el.remove();
	}
}
