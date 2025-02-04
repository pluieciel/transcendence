import ChatBox from "../chat/ChatBox.js";
import Tournament from "../tournament/Tournament.js";
import GameComponent from "../game/GameComponents.js";

export default class MainView {
	constructor(container) {
		this.container = container;

		this.countdownTime = 0;
		this.timerInterval = null;

		this.username = window.app.state.username;

		this.render();
		this.initComponents();
		if (!window.app.settings['fetched']) window.app.getPreferences();
		this.checkForBackdrop();
        this.addEventListeners();
        if (window.app.ingame) {
            console.log("Reconnecting to game");
            const protocol =
                window.location.protocol === "https:" ? "wss:" : "ws:";
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}/ws/game/reconnect=true`;
            window.app.gamews = new WebSocket(wsUrl);
            window.app.gamews.onmessage = (event) => {
                const events = JSON.parse(event.data);
                if (events.message_type === "init") {
                    this.displayGame(events);
                }
            };

            window.app.gamews.onclose = () => {
                console.log("Disconnected from server");
                window.app.ingame = false;
                sessionStorage.setItem("ingame", "false");
            };
        }
		if (!window.app.settings['fetched'])
			window.app.getPreferences();
    }





	render() {
		this.container.innerHTML = `
			<header>
				<h1 id="pong">PONG</h1>
					<button id="indexBtn" class="nav-btn disabledBtn">Index</button>
					<button id="customBtn" class="nav-btn">Custom</button>
					<button id="profileBtn" class="nav-btn">Profile</button>
					<button id="creditsBtn" class="nav-btn">Credits</button>
					<button id="logoutBtn" class="nav-btn">Log out</button>
					<button id="adminBtn">Admin</button>
			</header>

			<div id="mainPage">
				<div class="content">
					<div class="game-buttons userOutline">
						<h2 id="play">PLAY!</h2>
						<div class="row game-selector">
							<button id="classic" class="game-btn">classic</button>
							<button id="rumble" class="disabled game-btn">rumble</button>
						</div>
						<button id="playAI">AI</button>
						<button id="quickMatch" class="nav-link" data-view="game" data-bs-toggle="modal" data-bs-target="#matchSearch">Ranked</button>
						<button id="tournamentButton" data-bs-toggle="modal" data-bs-target="#tournamentModal">Tournament</button>
					</div>

				</div>
			</div>
			<!-- ChatBox container -->
			<div id="chatBoxContainer"></div>

			<!-- Tournament container -->
			<div id="tournamentContainer"></div>

			<!-- Game container -->
			<div id="gameContainer"></div>

        `;
	}

    showLeaderboard() {
        const mainContent = this.container.querySelector("#mainContent");
        mainContent.innerHTML = "<h2>Leaderboard View</h2>";
    }

    initComponents() {
        const tournamentContainer = this.container.querySelector("#tournamentContainer",);
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
		const selectorRumble = document.getElementById("rumble");
        const selectorClassic = document.getElementById("classic");
		const adminBtn = this.container.querySelector("#adminBtn");
		const customBtn = this.container.querySelector("#customBtn");
		const logoutBtn = this.container.querySelector("#logoutBtn");
		
		this.addNavEventListeners();

		selectorRumble.addEventListener("click", () => {
			window.app.settings['game-selector'] = "rumble"
			this.addSelector();
		});
		
		selectorClassic.addEventListener("click", () => {
			window.app.settings['game-selector'] = "classic"
			this.addSelector();
		});

		adminBtn.addEventListener("click", () => {
			window.app.router.navigateTo("/admin");
		});

		logoutBtn.addEventListener("click", () => {
			window.app.chatBox.disconnect();
			window.app.logout();
		});

		customBtn.addEventListener("click", () => {
			window.app.router.navigateTo("/custom");
		});

        logoutBtn.addEventListener("click", () => {
            window.app.chatBox.disconnect();
            window.app.logout();
        });
	}

	addSelector() {
		const selectorRumble = document.getElementById("rumble");
        const selectorClassic = document.getElementById("classic");

		if (window.app.settings['game-selector'] == "rumble") {
			selectorRumble.classList.remove("disabled");
			selectorClassic.classList.add("disabled");
		}
		else {
			selectorRumble.classList.add("disabled");
			selectorClassic.classList.remove("disabled");
		}
	}

	checkForBackdrop() {
		const el = document.querySelector(".modal-backdrop");
		if (el) el.remove();
	}

	addNavEventListeners() {
		const	profile = document.getElementById('profileBtn');
		const	custom = document.getElementById('customBtn');
		const	credits = document.getElementById('creditsBtn');
		const	logoutBtn = document.getElementById('logoutBtn');

		logoutBtn.addEventListener("click", () => {
            window.app.chatBox.disconnect();
            window.app.logout();
        });

		custom.addEventListener("click", () => {
			window.app.router.navigateTo("/custom");
		});

		profile.addEventListener("click", () => {
			window.app.router.navigateTo("/profile");
		});

		credits.addEventListener("click", () => {
			window.app.router.navigateTo("/credits");
		});
	}
}
