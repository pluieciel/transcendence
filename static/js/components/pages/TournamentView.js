export default class CustomizeView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.init();
	}

	async init() {
		await window.app.getSettings();
		await this.render();
		this.addEventListeners();
		window.app.settings["tournament-game-size"] = "4";
		window.app.settings["tournament-game-mode"] = "classic";
	}

	async render() {
		await window.app.renderHeader(this.container, "tournament");
		this.container.innerHTML += `
			<main>
				<div id="tournament-card" class="card">
					<h2 id="card-title"><i class="fa-solid fa-crown"></i> TOURNAMENT</h2>
					<div id="game-size">
						<div class="checkbox-button">
							<input type="checkbox" id="game-size-checkbox" class="checkbox">
							<div class="knobs">
								<span id="game-size-4"><i class="fa-solid fa-user"></i> 4</span>
								<span id="game-size-8"><i class="fa-solid fa-user"></i> 8</span>
							</div>
							<div class="layer"></div>
						</div>
					</div>
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
					<button type="submit" id="create-button"><i class="fa-solid fa-sitemap"></i> Create</button>
				</div>
				<div id="tournament-tree" class="card"></div>
			</main>
		`;
	}

	addEventListeners() {
		window.app.addNavEventListeners();
		this.addGameSizeCheckboxEventListeners();
		this.addGameModeCheckboxEventListeners();
		this.addCreateTournamentEventListeners();
	}

	addGameSizeCheckboxEventListeners() {
		const gameSizeCheckbox = document.getElementById("game-size-checkbox");
		gameSizeCheckbox.addEventListener("change", () => {
			window.app.settings["tournament-game-size"] = gameSizeCheckbox.checked ? "8" : "4";
		});
	}

	addGameModeCheckboxEventListeners() {
		const gameModeCheckbox = document.getElementById("game-mode-checkbox");
		gameModeCheckbox.addEventListener("change", () => {
			window.app.settings["tournament-game-mode"] = gameModeCheckbox.checked ? "rumble" : "classic";
		});
	}

	addCreateTournamentEventListeners() {
		const createButton = document.getElementById("create-button");
		createButton.addEventListener("click", () => {
			alert(`Created a ${window.app.settings["tournament-game-mode"]} tournament with ${window.app.settings["tournament-game-size"]} players`);
		});
	}
}