import ChatBox from "../chat/ChatBox.js";
//import Tournament from "../tournament/Tournament.js";
import GameComponent from "../game/GameComponents.js";

export default class PlayView {
	constructor(container) {
		this.container = container;

		this.countdownTime = 0;
		this.timerInterval = null;

		this.username = window.app.state.username;
		window.app.settings["bot-difficulty"] = 1;
		this.init();
	}

	async init() {
		await window.app.getSettings();
		await this.render();
		this.initComponents();
		this.checkForBackdrop();
		this.addEventListeners();
	}

	async render() {
		await window.app.renderHeader(this.container, "play");
		this.container.innerHTML += `
			<main id="main-view">
				<div id="left-filler"></div>
				<div id="play-card" class="card">
					<h2 id="card-title"><i class="fa-solid fa-gamepad"></i> PLAY</h2>
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
						<div class="checkbox-button">
							<input type="checkbox" id="game-type-checkbox" class="checkbox">
							<div class="knobs">
								<span id="game-type-ai"><i class="fa-solid fa-robot"></i> AI</span>
								<span id="game-type-ranked"><i class="fa-solid fa-ranking-star"></i> Ranked</span>
							</div>
							<div class="layer"></div>
						</div>
					</div>
					<div id="bot-difficulty">
						<button id="selector-left-arrow"><i class="fa-solid fa-arrow-left fa-lg"></i></button>
						<div id="selector-middle">
							<span id="bot-difficulty-span"></span>
						</div>
						<button id="selector-right-arrow"><i class="fa-solid fa-arrow-right fa-lg"></i></button>
					</div>
					<button type="submit" id="start-button"><i class="fa-solid fa-gamepad"></i> Play</button>
				</div>
				<div id="how-to-play-card" class="card">
					<h2 id="card-title"><i class="fa-regular fa-circle-question"></i> HOW TO PLAY</h2>
					<div id="how-to-play-content">
						<p>
							<i class="fa-solid fa-star"></i> <strong>Classic Mode</strong><br>
								Master the fundamentals of speed and precision<br>
								Experience pure, competitive Pong action<br>
								Perfect your paddle control and timing<br>
							<br>
							<i class="fa-solid fa-bolt"></i> <strong>Rumble Mode</strong><br>
								Unleash chaos with random events<br>
								Test your reaction time and adaptability<br>
								Enjoy a more dynamic and unpredictable game<br>
							<br>
							<i class="fa-solid fa-crown"></i> Join epic tournaments and compete for glory<br>
							<i class="fa-solid fa-medal"></i> Climb the ranks in both modes<br>
							<i class="fa-solid fa-trophy"></i> Earn achievements and show off your skills<br>
							<i class="fa-solid fa-palette"></i> Pick your style and dominate the game<br>
							<i class="fa-solid fa-users"></i> Challenge friends or compete globally<br>
						</p>
					</div>
				</div>
			</main>
			<div id="chatBoxContainer"></div>
			<div id="tournamentContainer"></div>
			<div id="gameContainer"></div>
		`;
	}

	initComponents() {
		// const tournamentContainer = this.container.querySelector("#tournamentContainer");
		// if (!window.app.tournament) {
		// 	window.app.tournament = new Tournament(tournamentContainer);
		// } else {
		// 	window.app.tournament.container = tournamentContainer;
		// 	window.app.tournament.render();
		// 	window.app.tournament.addEventListeners();
		// 	window.app.tournament.updateContent();
		// }

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
	}

	checkForBackdrop() {
		const el = document.querySelector(".modal-backdrop");
		if (el) el.remove();
	}

	addEventListeners() {
		window.app.addNavEventListeners();
		this.addGameModeCheckboxEventListeners();
		this.addGameTypeCheckboxEventListeners();
		this.addBotDifficultySelectorEventListeners();
	}

	addGameModeCheckboxEventListeners() {
		const gameModeCheckbox = document.getElementById("game-mode-checkbox");
		gameModeCheckbox.addEventListener("change", () => {
			window.app.settings["game-mode"] = gameModeCheckbox.checked ? "rumble" : "classic";
		});
	}

	addGameTypeCheckboxEventListeners() {
		const gameTypeCheckbox = document.getElementById("game-type-checkbox");
		gameTypeCheckbox.addEventListener("change", () => {
			window.app.settings["game-type"] = gameTypeCheckbox.checked ? "ranked" : "ai";
			document.getElementById("bot-difficulty").style.display = gameTypeCheckbox.checked ? "none" : "";
		});
	}

	addBotDifficultySelectorEventListeners() {
		const leftDifficulty = document.querySelector("#bot-difficulty #selector-left-arrow");
		const rightDifficulty = document.querySelector("#bot-difficulty #selector-right-arrow");
		const difficultySpan = document.querySelector("#bot-difficulty-span");

		const difficulties = ["Easy", "Medium", "Hard"];
		const difficultyIcons = ["fa-smile", "fa-meh", "fa-frown"];
		const difficultyValues = [1, 2, 5];
		let currentDifficulty = 0;

		difficultySpan.innerHTML = `<i class="fa-solid ${difficultyIcons[currentDifficulty]}"></i> ${difficulties[currentDifficulty]}`;
		window.app.settings["bot-difficulty"] = difficultyValues[currentDifficulty];
		leftDifficulty.disabled = true;

		leftDifficulty.addEventListener("click", () => {
			rightDifficulty.disabled = false;
			if (currentDifficulty > 0) {
				currentDifficulty--;
				if (currentDifficulty == 0)
					leftDifficulty.disabled = true;
				difficultySpan.innerHTML = `<i class="fa-solid ${difficultyIcons[currentDifficulty]}"></i> ${difficulties[currentDifficulty]}`;
				window.app.settings["bot-difficulty"] = difficultyValues[currentDifficulty];
			}
		});

		rightDifficulty.addEventListener("click", () => {
			leftDifficulty.disabled = false;
			if (currentDifficulty < difficulties.length - 1) {
				currentDifficulty++;
				if (currentDifficulty == difficulties.length - 1)
					rightDifficulty.disabled = true;
				difficultySpan.innerHTML = `<i class="fa-solid ${difficultyIcons[currentDifficulty]}"></i> ${difficulties[currentDifficulty]}`;
				window.app.settings["bot-difficulty"] = difficultyValues[currentDifficulty];
			}
		});
	}
}
