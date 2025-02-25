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
								<div id="player-left-summary-name">
									<button id="player-left-name-redirect">user2</button>
								</div>
								<div id="game-summary-middle">
									<div id="player-left-avatar">
										<button id="player-left-redirect">
											<img src="/imgs/default_avatar.png" class="avatar player-avatar">
										</button>
									</div>
									<div id="game-middle-info">
										<div id="game-summary-score"></div>
										<div id="game-summary-elo"></div>
									</div>
									<div id="player-right-avatar">
										<button id="player-right-redirect">
											<img src="/imgs/default_avatar.png" class="avatar player-avatar">
										</button>
									</div>
								</div>
								<div id="player-right-summary-name">
									<button id="player-right-name-redirect">user1</button>
								</div>
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
		const playerLeftName = document.getElementById('player-left-name-redirect');
		const playerRightName = document.getElementById('player-right-name-redirect');
		const playerLeftAvatar = document.querySelector('#player-left-redirect .player-avatar');
		const playerRightAvatar = document.querySelector('#player-right-redirect .player-avatar');
		const playerLeft = document.querySelector('#player-left-redirect');
		const playerRight = document.querySelector('#player-right-redirect');
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

		playerLeftName.innerHTML = event.playerLeftName;
		playerRightName.innerHTML = event.playerRightName;
		playerLeftAvatar.src = event.playerLeftAvatar;
		playerRightAvatar.src = event.playerRightAvatar;
		score.innerHTML = event.scoreLeft + " - " + event.scoreRight;

		if (event.winner === "RIGHT")
		{
			const playerLeftDiv = document.createElement('div');
			playerLeftDiv.classList.add('player-loser');
			playerLeftDiv.textContent = 'LOSER';
			playerLeft.appendChild(playerLeftDiv);

			const playerRightDiv = document.createElement('div');
			playerRightDiv.classList.add('player-winner');
			playerRightDiv.textContent = 'WINNER';
			playerRight.appendChild(playerRightDiv);
		}
		else
		{
			const playerLeftDiv = document.createElement('div');
			playerLeftDiv.classList.add('player-winner');
			playerLeftDiv.textContent = 'WINNER';
			playerLeft.appendChild(playerLeftDiv);

			const playerRightDiv = document.createElement('div');
			playerRightDiv.classList.add('player-loser');
			playerRightDiv.textContent = 'LOSER';
			playerRight.appendChild(playerRightDiv);
		}

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
			this.returnToMainMenu(tournament);
		};

		playerLeftName.onclick = () => {
			window.app.router.navigateTo(`/profiles/${event.playerLeftUsername}`);
		};

		playerRightName.onclick = () => {
			window.app.router.navigateTo(`/profiles/${event.playerRightUsername}`);
		};

		playerLeft.onclick = () => {
			window.app.router.navigateTo(`/profiles/${event.playerLeftUsername}`);
		};

		playerRight.onclick = () => {
			window.app.router.navigateTo(`/profiles/${event.playerRightUsername}`);
		};
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
