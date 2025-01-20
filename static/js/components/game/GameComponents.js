import { Game } from "./Game.js";

export default class GameComponent {
	constructor(container) {
		this.container = container;

		//Search game timer
		this.countdownTime = 0;
		this.timerInterval = null;
		this.render();
		this.addEventListeners();
		this.timerElement = document.getElementById("timer");
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
			`;

			const button = document.getElementById("quickMatch");
			button.setAttribute("data-bs-toggle", "modal");
    		button.setAttribute("data-bs-target", "#matchSearch");
	}

	addEventListeners() {
		const quickMatch = document.getElementById("quickMatch");
		const playAI = document.getElementById("playAI");

		quickMatch.addEventListener("click", () => {
			this.searchGame();
		});

		playAI.addEventListener("click", () => {
			this.playBot(1); //TODO Choose difficulty
		});
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
			const canvas = document.querySelector("#gameCanvas");
			const game = new Game(canvas, window.app.gamews);
			const gameDiv = document.querySelector("#gameDiv");
			gameDiv.style.display = "block";
			console.log("Game initialization");

			// Pass onGameEnd callback to Game
			game.onGameEnd = () => {
				const returnButton = document.querySelector("#returnButton");
				returnButton.style.display = "block";

				returnButton.onclick = () => {
					gameDiv.style.display = "none";
					returnButton.style.display = "none";
					document.querySelector("#mainPage").style.display = "block";
					document.querySelector("#overlay").style.display = "none";
					gameDiv.style.display = "none";
					if (window.app.gamews) {
						window.app.gamews.close();
					}
					window.app.ingame = false;
					sessionStorage.setItem("ingame", "false");
				};
				window.app.router.currentComponent.setProfileFields().then();
			};

			game.initialize(events.data);
			document.querySelector("#mainPage").style.display = "none";
		}, 1000);
	}

	stopTimerAndDismissModal() {
		clearInterval(this.timerInterval); 
		this.timerElement.innerText = "0s"; 

		const matchSearchModal = bootstrap.Modal.getInstance(document.getElementById("matchSearch"));
		matchSearchModal.hide(); 
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
}
