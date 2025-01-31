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
		this.setProfileFields();
		if (!window.app.settings.fetched)
			window.app.getPreferences();
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
    }

    render() {
        this.container.innerHTML = `
			<header>
				<h1 id="pong">PONG</h1>
					<button id="settingsBtn">Settings</button>
					<button id="logoutBtn">Log out</button>
			</header>

			<div id="mainPage">
				<div class="welcome">
					<p>Welcome to Pong! Get ready to play!</p>
				</div>
				<div class ="content">
					<div class="credits redHover">
						<h2>Credits</h2>
						<p>
							Welcome to <strong>ft_transcendence</strong>,<br>
							the final project of the 42 common core curriculum!<br>
							This project is our version of the classic <b>Pong</b> game<br><br>
							Ressources used:<br>
							The whole project is running in docker <i class="fab fa-docker"></i><br>
							We're using nginx as our webserv <i class="fas fa-server"></i><br>
							Javascript <i class="fab fa-js"></i> is used for the Frontend<br>
							The backend is built in python <i class="fa-brands fa-python"></i> with Django<br>
							PostgreSQL for the Database <i class="fas fa-database"></i><br><br>
							Created by:<br>
							<a href="https://github.com/jlefonde" target="_blank" rel="noopener noreferrer">Joris Lefondeur</a><br>
							<a href="https://github.com/pluieciel" target="_blank" rel="noopener noreferrer">Yue Zhao</a><br>
							<a href="https://github.com/siul008" target="_blank" rel="noopener noreferrer">Julien Nunes</a><br>
							<a href="https://github.com/neutrou" target="_blank" rel="noopener noreferrer">Victor Algranti</a><br><br>
							We hope you enjoy exploring our project!
						</p>
					</div>
					<div class="game-buttons redHover">
						<h2>PLAY!</h2>
						<div class="row game-selector">
							<button id="classic">classic</button>
							<button id="rumble" class="disabled">rumble</button>
						</div>
						<button id="playAI">AI</button>
						<button id="quickMatch" class="nav-link" data-view="game" data-bs-toggle="modal" data-bs-target="#matchSearch">Ranked</button>
						<button id="tournamentButton" data-bs-toggle="modal" data-bs-target="#tournamentModal">Tournament</button>
					</div>
					<div class="profile redHover">
						<h2>Profile</h2>
						<h3 id="p-name">${this.username}</h3>
						<h3 id="p-elo">Loading...</h3>
						<h3 id="p-winrate">Loading...</h3>
						<h3 id="p-wl">Loading...</h3>
						<h3 id="p-tourn">Loading...</h3>
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
        const logoutBtn = this.container.querySelector("#logoutBtn");
        const settings = this.container.querySelector("#settingsBtn");
        const selectorRumble = document.getElementById("rumble");
        const selectorClassic = document.getElementById("classic");

        logoutBtn.addEventListener("click", () => {
            window.app.chatBox.disconnect();
            window.app.logout();
        });

		settings.addEventListener("click", () => {
			window.app.router.navigateTo("/settings");
		});

		selectorRumble.addEventListener("click", () => {
			window.app.settings['game-selector'] = "rumble"
			this.addSelector();
		});
		
		selectorClassic.addEventListener("click", () => {
			window.app.settings['game-selector'] = "classic"
			this.addSelector();
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

	async setProfileFields() {
		var name = document.getElementById("p-name");
		var elo = document.getElementById("p-elo");
		var ratio = document.getElementById("p-wl");
		var winrate = document.getElementById("p-winrate");
		var tourn = document.getElementById("p-tourn");

		try {
			const response = await fetch("/api/get/profile", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});
			const data = await response.json();

            const avatarUrl = await window.app.getAvatar(this.username);
			if (avatarUrl)
				name.innerHTML = `<img id="avatarImg" src=${avatarUrl} alt="User Avatar" width="30" height="30"></img> ` + this.username;

			if (data.success) {
				elo.innerHTML = "Elo: " + data["elo"];
				winrate.innerHTML = "Winrate: " + data["winrate"];
				ratio.innerHTML = "Ratio: " + data["wins"] + "/" + data["looses"];
				tourn.innerHTML = "Tournaments won: " + data["tourn_won"] + " played: " + data["tourn_joined"];
				if (data['display']) {
					let toInsert = " (" + data['display'] + ")";
					name.insertAdjacentHTML('beforeend', toInsert);
				}
			} else
				throw new Error("Request failure");
		} catch (error) {
			elo.innerHTML = "Failed to load elo";
			winrate.innerHTML = "Failed to load winrate";
			ratio.innerHTML = "Failed to load ratio";
			tourn.innerHTML = "Failed to load tournaments";
			console.error("An error occurred: ", error);
		}
	}
	
	checkForBackdrop() {
		const el = document.querySelector(".modal-backdrop");
		if (el)
			el.remove();
	}
}
