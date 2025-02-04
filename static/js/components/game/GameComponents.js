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
		`;
	}

	addEventListeners() {
		const quickMatch = document.getElementById("quickMatch");
		const playAI = document.getElementById("playAI");
		const matchSearchModal = document.getElementById("matchSearch");
		const cancelGameSearch = document.getElementById("gameSearchCancel");

		if (quickMatch) {
			quickMatch.setAttribute("data-bs-toggle", "modal");
			quickMatch.setAttribute("data-bs-target", "#matchSearch");
			quickMatch.addEventListener("click", () => this.searchGame());
		}

		if (playAI) {
			playAI.addEventListener("click", () => this.playBot(1)); // TODO: Select difficulty
		}

		if (cancelGameSearch) {
			cancelGameSearch.addEventListener("click", () => {
				if (window.app.gamews) {
					window.app.gamews.close();
				}
				this.stopTimerAndDismissModal();
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

	async stopTimerAndDismissModal() {
		clearInterval(this.timerInterval);
		if (this.timerElement) {
			this.timerElement.innerText = "0s";
		}
		const matchSearchModal = bootstrap.Modal.getInstance(document.getElementById("matchSearch"));
		if (matchSearchModal) {
			matchSearchModal.hide();
			await new Promise((resolve) => setTimeout(resolve, 300)); // Wait for the modal to fully close
		}
	}
}
