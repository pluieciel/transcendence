import ChatBox from "../chat/ChatBox.js";
import Tournament from "../tournament/Tournament.js";
import GameComponent from "../game/GameComponents.js";

export default class MainView {
	constructor(container) {
		this.container = container;

		this.countdownTime = 0;
		this.timerInterval = null;

		this.username = window.app.state.username;
		window.app.settings["game-selector"] = "classic";
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
					<div id="game-mode-selector">
						<div class="button-cover">
							<div class="button b2" id="button-10">
							<input type="checkbox" class="checkbox">
							<div class="knobs">
								<span id="classic"><i class="fa-solid fa-star"></i> Classic</span>
								<span id="rumble"><i class="fa-solid fa-bolt"></i> Rumble</span>
							</div>
							<div class="layer"></div>
							</div>
						</div>
					</div>
				</div>
			</main>
			<!-- ChatBox container -->
			<div id="chatBoxContainer"></div>

			<!-- Tournament container -->
			<div id="tournamentContainer"></div>

			<!-- Game container -->
			<div id="gameContainer"></div>
        `;
	}

// 	<div class="game-buttons userOutline">
// 	<div class="row game-selector">
// 		<button id="classic" class="game-btn">classic</button>
// 		<button id="rumble" class="disabled game-btn">rumble</button>
// 	</div>
// 	<button id="playAI">AI</button>
// 	<button id="quickMatch" class="nav-link" data-view="game" data-bs-toggle="modal" data-bs-target="#matchSearch">Ranked</button>
// 	<button id="tournamentButton" data-bs-toggle="modal" data-bs-target="#tournamentModal">Tournament</button>
// </div>

	showLeaderboard() {
		const mainContent = this.container.querySelector("#mainContent");
		mainContent.innerHTML = "<h2>Leaderboard View</h2>";
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

	addEventListeners() {
		window.app.addNavEventListeners();
		const selectorRumble = document.getElementById("rumble");
		const selectorClassic = document.getElementById("classic");

		selectorRumble.addEventListener("click", () => {
			window.app.settings["game-selector"] = "rumble";
			this.addSelector();
		});

		selectorClassic.addEventListener("click", () => {
			window.app.settings["game-selector"] = "classic";
			this.addSelector();
		});
	}

	addSelector() {
		const selectorRumble = document.getElementById("rumble");
		const selectorClassic = document.getElementById("classic");

		if (window.app.settings["game-selector"] == "rumble") {
			selectorRumble.classList.remove("disabled");
			selectorClassic.classList.add("disabled");
		} else {
			selectorRumble.classList.add("disabled");
			selectorClassic.classList.remove("disabled");
		}
	}

	checkForBackdrop() {
		const el = document.querySelector(".modal-backdrop");
		if (el) el.remove();
	}
}
