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
		const el = document.querySelector(".modal-backdrop");
		if (el) el.remove();
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
					<h2 id="winner-name">Winner</h2>
					<img id="winner-avatar" src="" alt="Winner's Avatar" width="100" height="100">
					<p id="score-text">Score</p>
					<p id="elo-text">Elo</p>
					<button id="returnButton">Return to Main Menu</button>
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
			this.returnToMainMenu();
		};
	}

	returnToMainMenu() {
		const returnButton = document.querySelector("#returnButton");
		this.disposeGame();

		window.app.ingame = false;
		sessionStorage.setItem("ingame", "false");
		window.app.router.navigateTo("/index");
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
