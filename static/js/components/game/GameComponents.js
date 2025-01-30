import { Game } from "./Game.js";

export default class GameComponent {
	constructor(container) {
		this.container = container;

		//Search game timer
		this.countdownTime = 0;
		this.timerInterval = null;

		this.render();
		this.addEventListeners();
		//this.timerElement = document.getElementById("timer");
	}

	render() {
		this.container.innerHTML = `
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
				<div id="gameDiv" style="display: none; position: relative;">
	   				<div class="outer" id="banner">
					    <div class="title" id="bannerTitle">Title Placeholder</div>
					    <div class="description" id="bannerDescription">Description placeholder that is long</div>
					</div>
                    <div id="overlay">
                        <h2 id="winner-name">Winner</h2>
                        <img id="winner-avatar" src="" alt="Winner's Avatar" width="100" height="100">
                        <p id="score-text">Score</p>
                        <p id="elo-text">Elo</p>
                        <button id="returnButton">Return to Main Menu</button>
                    </div>
                    <canvas id="gameCanvas"></canvas>
                </div>
			`;

		const button = document.getElementById("quickMatch");
		button.setAttribute("data-bs-toggle", "modal");
		button.setAttribute("data-bs-target", "#matchSearch");
	}

	addEventListeners() {
		const quickMatch = document.getElementById("quickMatch");
		const playAI = document.getElementById("playAI");
		const matchSearchModal = document.getElementById("matchSearch");
		const cancelGameSearch = document.getElementById("gameSearchCancel");
		const returnButton = document.getElementById("returnButton");
		const gameDiv = document.getElementById("gameDiv");

		if (quickMatch) {
			quickMatch.setAttribute("data-bs-toggle", "modal");
			quickMatch.setAttribute("data-bs-target", "#matchSearch");
			quickMatch.addEventListener("click", () => this.searchGame());
		}

		if (playAI) {
			playAI.addEventListener("click", () => this.playBot(1)); // TODO: Select difficulty
		}

		if (matchSearchModal) {
			matchSearchModal.addEventListener("hidden.bs.modal", () => {
				this.stopTimerAndDismissModal();
			});
		}

		if (cancelGameSearch) {
			cancelGameSearch.addEventListener("click", () => {
				this.stopTimerAndDismissModal();
			});
		}

		if (returnButton) {
			returnButton.addEventListener("click", () => {
				this.returnToMainMenu(gameDiv, returnButton);
			});
		}
	}

	searchGame() {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const host = window.location.host;
		const wsUrl = `${protocol}//${host}/ws/game/`;

		this.initializeWebSocket(wsUrl);
		this.startSearchGameTimer();
	}

	playBot(difficulty) {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const host = window.location.host;
		const wsUrl = `${protocol}//${host}/ws/game/?bot=${difficulty}`;

		this.initializeWebSocket(wsUrl);
	}

	initializeWebSocket(wsUrl) {
		if (window.app.gamews) {
			window.app.gamews.close(); // Ensure previous connection is closed
		}

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
			alert("Connection error! Please try again.");
		};
	}

	displayGame(events) {
		setTimeout(() => {
			const canvas = document.querySelector("#gameCanvas");
			const game = new Game(canvas, window.app.gamews);
			game.onGameEnd = this.onGameEnd.bind(this);
			game.showBanner = this.showBanner.bind(this);
			console.log("game.showBanner assigned:", game.showBanner); // Verify assignment
			const gameDiv = document.querySelector("#gameDiv");
			const mainPage = document.querySelector("#mainPage");
			gameDiv.style.display = "block";
			mainPage.style.display = "none";
			this.stopTimerAndDismissModal();
			game.initialize(events.data);
		}, 1000);
	}

	showBanner(title, description) {
		const banner = document.getElementById("banner");
		const bannerTitle = document.getElementById("bannerTitle");
		const bannerDescription = document.getElementById("bannerDescription");

		bannerTitle.textContent = title;
		bannerDescription.textContent = description;

		banner.style.opacity = 0;
		banner.style.display = "flex";
		setTimeout(() => {
			banner.style.opacity = 1;
		}, 10);

		setTimeout(() => {
			banner.style.opacity = 0;
			setTimeout(() => {
				banner.style.display = "none";
			}, 1000); // Duration of the fade-out transition
		}, 3000 + 1000); // 2 seconds + duration of the fade-in transition
	}

	onGameEnd(winnerName, winnerAvatar, scoreLeft, scoreRight, eloChange) {
		console.log("game end called");
		const overlay = document.querySelector("#overlay");
		let username = sessionStorage.getItem("username");
		overlay.style.display = "flex";
		document.querySelector("#winner-name").textContent = `Winner: ${winnerName}`;
		document.querySelector("#winner-avatar").src = winnerAvatar;
		document.querySelector("#score-text").textContent = `Final Score: ${scoreLeft} - ${scoreRight}`;
		document.querySelector("#elo-text").textContent = `ELO Change: ${winnerName == username ? "+" : "-"}${eloChange}`;
		const returnButton = document.querySelector("#returnButton");
		returnButton.style.display = "block";
		returnButton.onclick = () => {
			this.returnToMainMenu(gameDiv, returnButton);
		};
	}

	returnToMainMenu(gameDiv, returnButton) {
		gameDiv.style.display = "none";
		returnButton.style.display = "none";
		document.querySelector("#overlay").style.display = "none";
		document.querySelector("#mainPage").style.display = "block";

		if (window.app.gamews) {
			window.app.gamews.close();
		}

		window.app.ingame = false;
		sessionStorage.setItem("ingame", "false");
		window.app.router.currentComponent.setProfileFields().then();
	}

	startSearchGameTimer() {
		this.countdownTime = 0;
		this.timerElement = document.getElementById("timer");
		if (this.timerElement) {
			this.timerElement.innerText = "0s";
		}

		clearInterval(this.timerInterval);
		this.timerInterval = setInterval(() => {
			this.countdownTime++;
			this.timerElement.innerText = `${this.countdownTime}s`;
		}, 1000);
	}

	stopTimerAndDismissModal() {
		clearInterval(this.timerInterval);
		if (this.timerElement) {
			this.timerElement.innerText = "0s";
		}
		const matchSearchModal = bootstrap.Modal.getInstance(document.getElementById("matchSearch"));
		if (matchSearchModal) {
			matchSearchModal.hide();
		}
	}
}
