import { Game } from "../game/Game.js";

export default class GameView {
	constructor(container) {
		this.container = container;
		this.game = null;
		this.render();
		window.app.getSettings();
		this.settings = {
			color: window.app.settings.color,
			quality: window.app.settings.quality,
		};
		this.addEventListeners();
		this.handlePopState = this.handlePopState.bind(this);
		window.addEventListener("popstate", this.handlePopState);
		this.checkForBackdrop();
	}

	checkForBackdrop() {
		const els = document.querySelector(".modal-backdrop");
		if (els) els.remove();
	}

	render() {
		this.container.innerHTML = `
			<div id="gameDiv">
				<div id="waitingMessage" class="waiting-message">No game found</div>
				<div class="outer" id="banner">
					<div class="title" id="bannerTitle">Title Placeholder</div>
					<div class="description" id="bannerDescription">Description placeholder that is long</div>
				</div>
				<div id="overlay">
					<div id="card-end">
						<div class="card-end-column">
							<img class="card-end-avatar" src="https://cdn.intra.42.fr/users/6256bf3b76f8634f1e0df573022b0b72/valgrant.JPG" alt="Winner's Avatar" width="100" height="100">
							<span class="card-end-username">neutrou</span>
						</div>
						<div class="card-end-column">
							<span class="card-end-mode"><i class="fa-solid fa-star"></i> CLASSIC <i class="fa-solid fa-star"></i></span>
							<span class="card-end-row card-end-text">
								<span class="card-end-score">10</span>
								<span class="card-end-separator">-</span>
								<span class="card-end-score">2</span>
							</span>
							<button id="returnButton">Return to Main Menu</button>
						</div>
						<div class="card-end-column">
							<img class="card-end-avatar" src="https://cdn.intra.42.fr/users/6256bf3b76f8634f1e0df573022b0b72/valgrant.JPG" alt="Winner's Avatar" width="100" height="100">
							<span class="card-end-username">neutrou</span>
						</div>
					</div>
				</div>
				<canvas id="gameCanvas"></canvas>
			</div>
						`;
	}

	addEventListeners() {
		const returnButton = document.getElementById("returnButton");
		const gameDiv = document.getElementById("gameDiv");

		if (returnButton) {
			returnButton.addEventListener("click", () => {
				this.returnToMainMenu(gameDiv, returnButton);
			});
		}
	}

	initializeGame(events) {
		const canvas = document.querySelector("#gameCanvas");
		const gameDiv = document.querySelector("#gameDiv");
		const waitingMessage = document.getElementById("waitingMessage");
		waitingMessage.innerHTML = "Waiting for game start...";

		this.game = new Game(canvas, window.app.gamews);
		gameDiv.style.display = "block";
		window.addEventListener("beforeunload", () => {
			this.disposeGame();
		});
		this.game.onGameEnd = this.onGameEnd.bind(this);
		this.game.showBanner = this.showBanner.bind(this);

		this.game.initialize(events.data).then(() => {
			canvas.style.display = "block";
			this.hideWaitingMessage();
		});
	}

	showBanner(icon, title, description) {
		const banner = document.getElementById("banner");
		const bannerTitle = document.getElementById("bannerTitle");
		const bannerDescription = document.getElementById("bannerDescription");

		bannerTitle.innerHTML = `<i class="${icon}"></i> ${title}`;
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

	onGameEnd(winnerName, winnerUser, winnerAvatar, scoreLeft, scoreRight, eloChange, tournament) {
		console.log("game end called");
		const overlay = document.querySelector("#overlay");
		let username = sessionStorage.getItem("username");
		overlay.style.display = "flex";
		document.querySelector("#winner-name").textContent = `Winner: ${winnerName}`;
		document.querySelector("#winner-avatar").src = winnerAvatar;
		document.querySelector("#score-text").textContent = `Final Score: ${scoreLeft} - ${scoreRight}`;
		if (eloChange > 0)
		{
			document.querySelector("#elo-text").style.display = 'block';
			document.querySelector("#elo-text").textContent = `ELO Change: ${winnerUser == username ? "+" : "-"}${eloChange}`;
		}
		else
		{
			document.querySelector("#elo-text").style.display = 'none';
		}

		const returnButton = document.querySelector("#returnButton");
		returnButton.style.display = "block";
		returnButton.onclick = () => {
			this.returnToMainMenu(tournament);
		};
	}

	returnToMainMenu(tournament = false) {
		const returnButton = document.querySelector("#returnButton");
		this.disposeGame();

		window.app.ingame = false;
		sessionStorage.setItem("ingame", "false");
		if (tournament)
		{
			returnButton.innerHTML = "Return to Tournament";
			window.app.router.navigateTo("/tournament");
		}
		else
		{
			returnButton.innerHTML = "Return to Main Menu";
			window.app.router.navigateTo("/play");
		}
	}

	hideWaitingMessage() {
		const waitingMessage = document.getElementById("waitingMessage");
		if (waitingMessage) {
			waitingMessage.style.display = "none";
		}
	}

	handlePopState() {
		this.disposeGame();
	}

	disposeGame() {
		if (this.game) {
			this.game.dispose();
			this.game = null;
		}
		if (window.app.gamews) {
			window.app.gamews.close();
		}
		window.removeEventListener("popstate", this.handlePopState);
	}
}
