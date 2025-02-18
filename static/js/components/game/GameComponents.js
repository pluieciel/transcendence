export default class GameComponent {
	constructor(container) {
		this.container = container;

		this.countdownTime = 0;
		this.timerInterval = null;

		this.render();
		this.addEventListeners();
	}

	render() {
		this.container.innerHTML = `
			<div class="my-modal-background">
				<div id="search-game-modal" class="my-modal">
					<div class="modal-header">
						<h5 class="modal-title"><i class="fa-solid fa-magnifying-glass"></i>&nbsp; Matchmaking</h5>
						<i class="cancel-search-game modal-quit fa-solid fa-xmark fa-xl"></i>
					</div>
					<div class="my-modal-content">
						<div id="game-search-message">Searching for a game...</div>
						<div id="game-search-loading">
							<i id="paddle-left" class="fa-solid fa-minus fa-5x"></i>
							<i id="ball-spinner" class="fa-solid fa-circle-notch fa-2x"></i>
							<i id="paddle-right" class="fa-solid fa-minus fa-rotate-90 fa-5x"></i>
						</div>
						<div id="game-search-timer">0s</div>
						<button id="cancel-search-button" class="cancel-search-game" type="click"><i class="fa-solid fa-ban"></i>&nbsp; Cancel</button>
					</div>
				</div>
			</div>
		`;
	}

	addPlayButtonEventListeners() {		
		const playButton = document.getElementById("start-button");
		const gameModeCheckbox = document.getElementById("game-mode-checkbox");
		const gameTypeCheckbox = document.getElementById("game-type-checkbox");
		
		
		playButton.addEventListener("click", () => {
			const searchGameModal = document.getElementById('search-game-modal');
			searchGameModal.parentElement.style.display = 'flex';

			window.app.settings["game-mode"] = gameModeCheckbox.checked ? "rumble" : "classic";
			window.app.settings["game-type"] = gameTypeCheckbox.checked ? "ranked" : "ai";

			if (window.app.settings["game-type"] === "ai") {
				console.log(parseInt(window.app.settings["bot-difficulty"]));
				this.playBot(parseInt(window.app.settings["bot-difficulty"]));
			}
			else if (window.app.settings["game-type"] === "ranked")
				this.searchGame();
		});
	}

	addCancelSearchGameEventListener() {
		const cancelSearchGameButtons = document.querySelectorAll('.cancel-search-game');

		cancelSearchGameButtons.forEach((cancelSearchGame) => {
			cancelSearchGame.addEventListener("click", () => {
				if (window.app.gamews) {
					window.app.gamews.close();
				}
				this.stopTimerAndDismissModal();
			});
		});
	}

	addEventListeners() {
		window.app.addModalQuitButtonEventListener();
		this.addPlayButtonEventListeners();
		this.addCancelSearchGameEventListener();
	}

	searchGame() {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const host = window.location.host;
		const wsUrl = `${protocol}//${host}/ws/game/?mode=${window.app.settings["game-mode"]}`;

		this.initializeWebSocket(wsUrl);
		this.startSearchGameTimer();
	}

	playBot(difficulty) {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const host = window.location.host;
		const wsUrl = `${protocol}//${host}/ws/game/?bot=${difficulty}&mode=${window.app.settings["game-mode"]}`;

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
				this.redirectToGame(events);
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

	async redirectToGame(events) {
		await this.stopTimerAndDismissModal();
		window.app.router.navigateTo("/game");
		const gameView = window.app.router.currentComponent;
		if (gameView && gameView.initializeGame) {
			gameView.initializeGame(events);
		}
	}

	startSearchGameTimer() {
		this.countdownTime = 0;
		this.timerElement = document.getElementById("game-search-timer");
		if (this.timerElement) {
			this.timerElement.innerText = "0s";
		}

		clearInterval(this.timerInterval);
		this.timerInterval = setInterval(() => {
			this.countdownTime++;
			this.timerElement.innerText = `${this.countdownTime}s`;
		}, 1000);
	}

	async stopTimerAndDismissModal() {
		clearInterval(this.timerInterval);
		if (this.timerElement) {
			this.timerElement.innerText = "0s";
		}
		const searchGameModal = document.getElementById('search-game-modal');
		searchGameModal.parentElement.style.display = 'none';
	}
}
