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
				<div class="outer" id="banner">
					<div class="title" id="bannerTitle">Title Placeholder</div>
					<div class="description" id="bannerDescription">Description placeholder that is long</div>
				</div>
				<div class="my-modal-background" style="display: flex">
					<div id="game-summary-modal" class="my-modal">
						<div class="modal-header">
							<h5 class="modal-title"><i class="fa-solid fa-clock-rotate-left"></i>&nbsp; Game Summary</h5>
							<i class="modal-quit fa-solid fa-xmark fa-xl"></i>
						</div>
						<div class="my-modal-content">
							<div id="game-summary-info">
								<div id="game-summary-mode"><i class="fa-solid fa-bolt"></i>&nbsp; Rumble</div>
								<div id="game-summary-type"><i class="fa-solid fa-ranking-star"></i>&nbsp; Ranked</div>
							</div>
							<div id="game-summary">
								<div id="player-left-summary-name">
									<button id="player-left-name-redirect" data-redirect-to="/profiles/user2">user2</button>
								</div>
								<div id="game-summary-middle">
									<div id="player-left-avatar">
										<button id="player-left-redirect" data-redirect-to="/profiles/user2">
											<img src="/imgs/default_avatar.png" class="avatar player-avatar">
											<div class="player-loser">LOSER</div>
										</button>
									</div>
									<div id="game-middle-info">
										<div id="game-summary-score">10 - 5</div>
										<div id="game-summary-elo"><i class="fa-solid fa-plus-minus fa-xs"></i>&nbsp; 15</div>
									</div>
									<div id="player-right-avatar">
										<button id="player-right-redirect" data-redirect-to="/profiles/user1">
											<img src="/imgs/default_avatar.png" class="avatar player-avatar">
											<div class="player-winner">WINNER</div>
										</button>
									</div>
								</div>
								<div id="player-right-summary-name">
									<button id="player-right-name-redirect" data-redirect-to="/profiles/user1">user1</button>
								</div>
							</div>
							<button id="return-button" type="submit"><i class="fa-solid fa-rotate-left"></i> Return to Menu</button>
						</div>
					</div>
				</div>
				<canvas id="gameCanvas"></canvas>
			</div>
		`;
	}

	addEventListeners() {
		const returnButton = document.getElementById("return-button");
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
		window.app.gamews.close();

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
