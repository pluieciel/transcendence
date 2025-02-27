import { Game } from "../game/Game.js";

export default class GameView {
	constructor(container) {
		this.container = container;
		this.game = null;
		this.render();
		window.app.getSettings();
		this.username = window.app.state.username;
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
				<div class="my-modal-background">
					<div id="game-summary-modal" class="my-modal">
						<div class="modal-header">
							<h5 class="modal-title"><i class="fa-solid fa-clock-rotate-left"></i>&nbsp; Game Summary</h5>
						</div>
						<div class="my-modal-content">
							<div id="game-summary-info">
								<div id="game-summary-mode"></div>
								<div id="game-summary-type"></div>
							</div>
							<div id="game-summary">
								<div id="player-left-summary-name"></div>
								<div id="game-summary-middle">
									<div id="player-left-avatar"></div>
									<div id="game-middle-info">
										<div id="game-summary-score"></div>
										<div id="game-summary-elo"></div>
									</div>
									<div id="player-right-avatar"></div>
								</div>
								<div id="player-right-summary-name"></div>
							</div>
							<button id="return-button" type="submit"></button>
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

	onGameEnd(event) {
		const gameSummaryModal = document.getElementById('game-summary-modal');
		gameSummaryModal.parentElement.style.display = 'flex';
		
		const gameMode = document.getElementById('game-summary-mode');
		const gameType = document.getElementById('game-summary-type');
		const playerLeftSummaryName = document.getElementById('player-left-summary-name');
		const playerRightSummaryName = document.getElementById('player-right-summary-name');
		const playerLeftAvatar = document.getElementById('player-left-avatar');
		const playerRightAvatar = document.getElementById('player-right-avatar');
		const score = document.getElementById('game-summary-score');
		const elo = document.getElementById('game-summary-elo');
		gameMode.innerHTML = event.gameMode === "classic" ? '<i class="fa-solid fa-star"></i>&nbsp; Classic' : '<i class="fa-solid fa-bolt"></i>&nbsp; Rumble';

		if (event.bot)
			gameType.innerHTML = '<i class="fa-solid fa-robot"></i>&nbsp; AI';
		else if (event.ranked)
			gameType.innerHTML = '<i class="fa-solid fa-ranking-star"></i>&nbsp; Ranked';
		else if (event.tournament)
			gameType.innerHTML = '<i class="fa-solid fa-crown"></i>&nbsp; Tournament';
		else
			gameType.innerHTML = '<i class="fa-solid fa-user-check"></i>&nbsp; Invite';

		score.innerHTML = event.scoreLeft + " - " + event.scoreRight;

		playerLeftAvatar.insertAdjacentHTML("beforeend", `
			<button id="player-left-redirect">
				<img src="${event.playerLeftAvatar}" class="avatar player-avatar">
				${this.getPlayerWinner(event.winner, "LEFT")}
			</button}>`);

		playerRightAvatar.insertAdjacentHTML("beforeend", `
			<${event.bot ? 'div' : 'button'} id="player-right-redirect">
				<img src="${event.playerRightAvatar}" class="avatar player-avatar">
				${this.getPlayerWinner(event.winner, "RIGHT")}
			</${event.bot ? 'div' : 'button'}>`);

		playerLeftSummaryName.insertAdjacentHTML("beforeend", `
			<button id="player-left-name-redirect">
				${event.playerLeftName}
			</button}>`);

		playerRightSummaryName.insertAdjacentHTML("beforeend", `
			<${event.bot ? 'div' : 'button'} id="player-right-name-redirect">
				${event.playerRightName}
			</${event.bot ? 'div' : 'button'}>`);

		if (event.eloChange > 0)
		{
			elo.style.display = 'block';
			elo.innerHTML = `${event.winnerUser == this.username ? "+" : "-"}${event.eloChange}`;
		}
		else
			elo.style.display = 'none';
		window.app.gamews.close();

		const returnButton = document.querySelector("#return-button");
		if (event.tournament)
			returnButton.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Return to Tournament';
		else
			returnButton.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Return to Menu';

		returnButton.onclick = () => {
			this.returnToMainMenu(event.tournament);
		};

		const playerLeftNameRedirect = document.getElementById('player-left-name-redirect');
		const playerLeftRedirect = document.getElementById('player-left-redirect');

		playerLeftNameRedirect.onclick = () => {
			window.app.router.navigateTo(`/profiles/${event.playerLeftUsername}`);
		};

		playerLeftRedirect.onclick = () => {
			window.app.router.navigateTo(`/profiles/${event.playerLeftUsername}`);
		};

		if (!event.bot) {
			const playerRightNameRedirect = document.getElementById('player-right-name-redirect');
			const playerRightRedirect = document.getElementById('player-right-redirect');

			playerRightNameRedirect.onclick = () => {
				window.app.router.navigateTo(`/profiles/${event.playerRightUsername}`);
			};

			playerRightRedirect.onclick = () => {
				window.app.router.navigateTo(`/profiles/${event.playerRightUsername}`);
			};
		}
	}

	getPlayerWinner(winnerSide, playerSide) {
		if (winnerSide === playerSide)
			return '<div class="player-winner">WINNER</div>';
		else
			return '<div class="player-loser">LOSER</div>';
	}

	returnToMainMenu(tournament = false) {
		this.disposeGame();

		window.app.ingame = false;
		sessionStorage.setItem("ingame", "false");
		if (tournament)
			window.app.router.navigateTo("/tournament");
		else
			window.app.router.navigateTo("/play");
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
