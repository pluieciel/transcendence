import ChatBox from "../chat/ChatBox.js";
import Tournament from "../tournament/Tournament.js";
import { Game } from "../game/Game.js";

export default class MainView {
	constructor(container) {
		this.container = container;
		const decodedPayload = jwt_decode(window.app.getToken());

		//Search game timer
		this.countdownTime = 0;
		this.timerInterval = null;

		this.username = decodedPayload.username;
		this.render();
		this.setProfileFields();
		this.initComponents();
		this.addEventListeners();
		if (window.app.ingame) {
			console.log("Reconnecting to game");
			const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
			const host = window.location.host;
			const token = window.app.getToken();
			const wsUrl = `${protocol}//${host}/ws/game/?token=${token}&reconnect=true`;
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
        <h1>PONG</h1>
			<button id="settingsBtn">Settings</button>
			<button id="logoutBtn">Log out</button>
	</header>

	<div id="mainPage">
		<div class="welcome">
	        <p>Welcome to Pong! Get ready to play!</p>
	    </div>
		<div class ="content">
			<div class="credits">
				<h2>Credits</h2>
				<p>
					Welcome to <strong>ft_transcendence</strong>,<br>
					the final project of the 42 common core curriculum!<br>
					This project is our version of the classic <b>Pong</b> game<br><br>
					Ressources used:<br>
					The whole project is running in docker <i class="fab fa-docker"></i><br>
					We're using nginx as our webserv <i class="fas fa-server"></i><br>
					Javascript <i class="fab fa-js"></i> is used for the Frontend<br>
					PostgreSQL for the Database <i class="fas fa-database"></i><br><br>
					Created by:<br>
					<a href="https://github.com/jlefonde" target="_blank" rel="noopener noreferrer">Joris Lefondeur</a><br>
					<a href="https://github.com/pluieciel" target="_blank" rel="noopener noreferrer">Yue Zhao</a><br>
					<a href="https://github.com/siul008" target="_blank" rel="noopener noreferrer">Julien Nunes</a><br>
					<a href="https://github.com/neutrou" target="_blank" rel="noopener noreferrer">Victor Algranti</a><br><br>
					We hope you enjoy exploring our project!
				</p>

			</div>
					<div class="game-buttons">
					<h2>PLAY!</h2>
					<button id="playAI">AI</button>
					<button id="rankedMatch">Ranked</button>
					<button id="quickMatch" class="nav-link" data-view="game" data-bs-toggle="modal" data-bs-target="#matchSearch">Quick Match</button>
					<button id="tournamentButton" data-bs-toggle="modal" data-bs-target="#tournamentModal">Tournament</button>
			</div>
			<div class="profile">
				<h2>Profile</h2>
				<div id="p-avatar"></div>
				<h3 id="p-name">${this.username}</h3>
				<h3 id="p-elo">Loading...</h3>
				<h3 id="p-winrate">Loading...</h3>
				<h3 id="p-tourn">Loading...</h3>
			</div>
		</div>
	</div>
	<!-- ChatBox container -->
	<div id="chatBoxContainer"></div>

	<!-- Tournament container -->
	<div id="tournamentContainer"></div>

	<!-- Quick Match Timer container -->
	<div class="modal fade" id="matchSearch" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
		<div class="modal-dialog modal-dialog-centered">
			<div class="modal-content modal-content-game d-flex flex-column align-items-center justify-content-center text-center">
				<h5 class="modal-title w-70 mt-3 mb-3" id="staticBackdropLabel">Searching for a game</h5>
				<h2 id="timer">0s</h2> <!-- Timer below the header -->
				<button type="button" class="btn btn-secondary m-3" id="gameSearchCancel" data-bs-dismiss="modal">Cancel</button>
			</div>
		</div>
	</div>

	<div id=gameDiv style="display :none:">
		<div id="nameLeft"></div>
		<div id="scoreLeft"></div>
		<div id="nameRight"></div>
		<div id="scoreRight"></div>
		<div id="overlay">
		    <button id="returnButton" style="display: none;">Return to Main Menu</button>
		</div>
        <canvas id="gameCanvas"></canvas>
        </div>
		</canvas>
	</div>

        `;
		this.timerElement = document.getElementById("timer");
	}

	searchGame() {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const host = window.location.host;
		const token = window.app.getToken();

		//if (!token) this.handleUnrecognizedToken();
		const wsUrl = `${protocol}//${host}/ws/game/?token=${token}`;

		window.app.gamews = new WebSocket(wsUrl);
		this.startSearchGameTimer();

		window.app.gamews.onmessage = (event) => {
			console.log(event.data);
			setTimeout(() => {
				this.stopTimerAndDismissModal();
			}, 1000);

			const events = JSON.parse(event.data);
			if (events.message_type === "init") {
				this.displayGame(events);
			}
		};

		window.app.gamews.onopen = () => {
			console.log("Connected to server");
			window.app.ingame = true;
			sessionStorage.setItem("ingame", "true");
		};

		window.app.gamews.onclose = () => {
			console.log("Disconnected from server");
			window.app.ingame = false;
			sessionStorage.setItem("ingame", "false");
		};

		window.app.gamews.onerror = (error) => {
			console.error("WebSocket error:", error);
		};
	}

	playBot(difficulty) {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const host = window.location.host;
		const token = window.app.getToken();

		//if (!token) this.handleUnrecognizedToken();
		const wsUrl = `${protocol}//${host}/ws/game/?token=${token}&bot=` + difficulty;

		window.app.gamews = new WebSocket(wsUrl);

		window.app.gamews.onmessage = (event) => {
			const events = JSON.parse(event.data);
			if (events.message_type === "init") {
				this.displayGame(events);
			}
		};

		window.app.gamews.onopen = () => {
			console.log("Connected to server");
			window.app.ingame = true;
			sessionStorage.setItem("ingame", "true");
		};

		window.app.gamews.onclose = () => {
			console.log("Disconnected from server");
			window.app.ingame = false;
			sessionStorage.setItem("ingame", "false");
		};

		window.app.gamews.onerror = (error) => {
			console.error("WebSocket error:", error);
		};
	}

	displayGame(events) {
		setTimeout(() => {
			const canvas = this.container.querySelector("#gameCanvas");
			const game = new Game(canvas, window.app.gamews);
			const gameDiv = this.container.querySelector("#gameDiv");
			gameDiv.style.display = "block";
			console.log("Game initialization");

			// Pass onGameEnd callback to Game
			game.onGameEnd = () => {
				const returnButton = this.container.querySelector("#returnButton");
				returnButton.style.display = "block";

				returnButton.onclick = () => {
					canvas.style.display = "none";
					returnButton.style.display = "none";
					this.container.querySelector("#mainPage").style.display = "block";
					this.container.querySelector("#overlay").style.display = "none";
					gameDiv.style.display = "none";
					if (window.app.gamews) {
						window.app.gamews.close();
					}
					window.app.ingame = false;
					sessionStorage.setItem("ingame", "false");
				};
			};

			game.initialize(events.data);
			this.container.querySelector("#mainPage").style.display = "none";
		}, 1000);
	}

	stopTimerAndDismissModal() {
		clearInterval(this.timerInterval); // Stop the timer
		this.timerElement.innerText = "0s"; // Reset the timer display

		// Hide the modal using Bootstrap
		const matchSearchModal = bootstrap.Modal.getInstance(document.getElementById("matchSearch"));
		console.log("Hiding " + matchSearchModal);
		matchSearchModal.hide(); // Hide the modal

		// Optionally reset other modal states if needed
	}

	startSearchGameTimer() {
		this.countdownTime = 0; // Reset countdown time
		this.timerElement.innerText = this.countdownTime + "s"; // Reset display

		// Clear any existing interval before starting a new one
		clearInterval(this.timerInterval);

		// Start the timer
		this.timerInterval = setInterval(() => {
			this.countdownTime++; // Increment time
			this.timerElement.innerText = this.countdownTime + "s"; // Update display
		}, 1000); // Update every second

		// Event listener for when the modal is shown (Bootstrap 5 uses 'shown.bs.modal')
		const matchSearchModal = document.getElementById("matchSearch");
		matchSearchModal.addEventListener("shown.bs.modal", () => {
			this.startSearchGameTimer(); // Start timer when modal is shown
		});

		// Event listener for when the modal is hidden (clear the timer)
		matchSearchModal.addEventListener("hidden.bs.modal", () => {
			clearInterval(this.timerInterval); // Clear interval when modal is closed
			this.timerElement.innerText = "0s"; // Reset timer display
		});

		// Event listener for cancel button (stop timer and hide modal)
		const cancelGameSearch = this.container.querySelector("#gameSearchCancel");
		cancelGameSearch.addEventListener("click", () => {
			this.stopTimerAndDismissModal(); // Stop timer and dismiss modal
		});
	}

	showLeaderboard() {
		const mainContent = this.container.querySelector("#mainContent");
		mainContent.innerHTML = "<h2>Leaderboard View</h2>";
		// Add any additional logic to initialize the leaderboard view
	}

	initComponents() {
		// Initialize Tournament
		const tournamentContainer = this.container.querySelector("#tournamentContainer");
		window.app.tournament = new Tournament(tournamentContainer);

		// Initialize ChatBox
		const chatBoxContainer = this.container.querySelector("#chatBoxContainer");
		window.app.chatBox = new ChatBox(chatBoxContainer);
	}

	addEventListeners() {
		// Logout button
		const logoutBtn = this.container.querySelector("#logoutBtn");
		const settings = this.container.querySelector("#settingsBtn");
		const quickMatch = this.container.querySelector("#quickMatch");
		const playAI = this.container.querySelector("#playAI");

		logoutBtn.addEventListener("click", () => {
			window.app.chatBox.disconnect();
			window.app.logout();
		});

		settings.addEventListener("click", () => {
			window.app.router.navigateTo("/settings");
		});

		quickMatch.addEventListener("click", () => {
			this.searchGame();
		});

		playAI.addEventListener("click", () => {
			this.playBot(1); //TODO Choose difficulty
		});
	}

	async setProfileFields() {
		var elo_div = document.getElementById("p-elo");
		var winrate_div = document.getElementById("p-winrate");
		var tourn_div = document.getElementById("p-tourn");
		var avatar_div = document.getElementById("p-avatar");
		try {
			const response = await fetch("/api/get/profile", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `${window.app.getToken()}`,
				},
			});
			const data = await response.json();

			const avatarUrl = await window.app.getAvatar(this.username);

			if (data.success) {
				elo_div.innerHTML = "Elo: " + data["elo"];
				winrate_div.innerHTML = "Winrate: " + data["winrate"] + "%";
				tourn_div.innerHTML = "Tournaments won: " + data["tourn"];
			} else {
				elo_div.innerHTML = "Failed to load elo";
				winrate_div.innerHTML = "Failed to load winrate";
				tourn_div.innerHTML = "Failed to load tournaments";
			}
			if (avatarUrl) {
				avatar_div.innerHTML = `<img src=${avatarUrl} alt="User Avatar" width="60" height="60"></img>`;
			}
		} catch (error) {
			elo_div.innerHTML = "Failed to load elo";
			winrate_div.innerHTML = "Failed to load winrate";
			tourn_div.innerHTML = "Failed to load tournaments";
			console.error("An error occurred: ", error);
		}
	}
}
