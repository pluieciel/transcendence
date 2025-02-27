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
		window.app.initChat();
		this.addEventListeners();
		
		new GameComponent(this.container.querySelector("#gameContainer"));
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
						<button id="selector-left-arrow"><i class="fa-solid fa-arrow-left fa-lg"></i></button>
						<div id="selector-middle">
							<span id="game-type-span"></span>
						</div>
						<button id="selector-right-arrow"><i class="fa-solid fa-arrow-right fa-lg"></i></button>
					</div>
					<div id="bot-difficulty">
						<button id="selector-left-arrow"><i class="fa-solid fa-arrow-left fa-lg"></i></button>
						<div id="selector-middle">
							<span id="bot-difficulty-span"></span>
						</div>
						<button id="selector-right-arrow"><i class="fa-solid fa-arrow-right fa-lg"></i></button>
					</div>
					<div id="input-message"></div>
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
			<div id="gameContainer"></div>
		`;
	}

	addEventListeners() {
		window.app.addNavEventListeners();
		this.addGameModeCheckboxEventListeners();
		this.addGameTypeSelectorEventListeners();
		this.addBotDifficultySelectorEventListeners();
	}

	addGameModeCheckboxEventListeners() {
		const gameModeCheckbox = document.getElementById("game-mode-checkbox");
		gameModeCheckbox.addEventListener("change", () => {
			window.app.settings["game-mode"] = gameModeCheckbox.checked ? "rumble" : "classic";
		});
	}

	addGameTypeSelectorEventListeners() {
		const leftGameType = document.querySelector("#game-type #selector-left-arrow");
		const rightGameType = document.querySelector("#game-type #selector-right-arrow");
		const gameTypeSpan = document.querySelector("#game-type-span");

		const gameTypes = ["Ranked", "Local", "AI"];
		const gameTypeIcons = ["fa-ranking-star", "fa-house-user", "fa-robot"];
		let currentGameType = 0;

		gameTypeSpan.innerHTML = `<i class="fa-solid ${gameTypeIcons[currentGameType]}"></i> ${gameTypes[currentGameType]}`;
		window.app.settings["game-type"] = gameTypes[currentGameType];
		leftGameType.disabled = true;

		leftGameType.addEventListener("click", () => {
			rightGameType.disabled = false;
			if (currentGameType > 0) {
				currentGameType--;
				if (currentGameType == 0)
					leftGameType.disabled = true;
				gameTypeSpan.innerHTML = `<i class="fa-solid ${gameTypeIcons[currentGameType]}"></i> ${gameTypes[currentGameType]}`;
				window.app.settings["game-type"] = gameTypes[currentGameType];
				document.getElementById('bot-difficulty').style.display = currentGameType == 2 ? 'flex' : 'none';
			}
		});

		rightGameType.addEventListener("click", () => {
			leftGameType.disabled = false;
			if (currentGameType < gameTypes.length - 1) {
				currentGameType++;
				if (currentGameType == gameTypes.length - 1)
					rightGameType.disabled = true;
				gameTypeSpan.innerHTML = `<i class="fa-solid ${gameTypeIcons[currentGameType]}"></i> ${gameTypes[currentGameType]}`;
				window.app.settings["game-type"] = gameTypes[currentGameType];
				document.getElementById('bot-difficulty').style.display = currentGameType == 1 ? 'none' : 'flex';
			}
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
