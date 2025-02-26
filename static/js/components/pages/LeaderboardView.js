export default class LeaderboardView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.init();
	}

	async init() {
		await window.app.getSettings();
		await this.render();
		window.app.initChat();
		this.addContent("classic");
		this.addEventListeners();
	}

	async render() {
		await window.app.renderHeader(this.container, "leaderboard");
		this.container.innerHTML += `
			<main>
				<div id="leaderboard-card" class="card">
					<h2 id="card-title"><i class="fa-solid fa-medal"></i> LEADERBOARD</h2>
					<div id="leaderboard-content">
						<div id="game-mode">
							<div class="checkbox-button">
								<input type="checkbox" id="game-mode-checkbox" class="checkbox">
								<div class="knobs">
									<span id="game-mode-classic"><i class="fa-solid fa-star"></i> Classic</span>
									<span id="game-mode-rumble"><i class="fa-solid fa-bolt"></i> Rumble</span>
								</div>
								<div class="layer"></div>
							</div>
						</div>
						<div class="lb-card-header">
							<div class="lb-card-pos lb-card-att"><i class="fa-solid fa-ranking-star"></i> Rank</div>
							<div class="lb-card-user lb-card-att"><i class="fa-solid fa-user"></i> User</div>
							<div class="lb-card-elo lb-card-att"><i class="fa-solid fa-chart-line"></i> Elo</div>
							<div class="lb-card-winrate lb-card-att"><i class="fa-solid fa-percent"></i> Winrate</div>
							<div class="lb-card-games lb-card-att"><i class="fa-solid fa-gamepad"></i> Games</div>
						</div>
						<div id="leaderboard-table">
							<div id="leaderboard-table-container"></div>
						</div>
					</div>
				</div>
			</main>
			<div id="chatBoxContainer"></div>
		`;
	}

	addEventListeners() {
		window.app.addNavEventListeners();
		this.addGameModeCheckboxEventListeners();
	}

	addGameModeCheckboxEventListeners() {
		const gameModeCheckbox = document.getElementById("game-mode-checkbox");
		gameModeCheckbox.addEventListener("change", async () => {
			const gameMode = gameModeCheckbox.checked ? "rumble" : "classic";
			await this.addContent(gameMode);
		});
	}

	async addContent(gameMode)
	{
		try {
			const response = await fetch(`/api/leaderboard/${gameMode}/`);
	
			const data = await response.json();
	
			if (data.success) {
				const leaderboardTable = document.getElementById("leaderboard-table-container");
				leaderboardTable.innerHTML = "";
				let i = 0;
				while (i < data.leaderboard.length) {
					this.addUserToLB(data.leaderboard[i], ++i);
				}	
			}
			else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
				window.app.logout();
			}
			else {
				console.error(data.message);
			}
		}
		catch (e) {
			console.error(e);
		}
	}

	addUserToLB(user, rank) {
		const lb = document.getElementById("leaderboard-table-container");
		const name = user.display_name == null ? user.username : user.display_name;
		let profileButtonId = `lb-card-redirect-profile-${rank}`;
		const row = `
			<div id="lb-card-${rank}" class="lb-card">
			<div class="lb-card-pos lb-card-att">${rank}</div>
			<div class="lb-card-user lb-card-att">
				<button id="${profileButtonId}">
					<img class="lb-card-avatar avatar" src="${user.avatar}"></img> &nbsp;&nbsp; ${name}
					${user.is_42_user ? "&nbsp;<img src=\"/imgs/42_logo.png\" id=\"oauth-logo\"></img>" : ""}
				</button>
			</div>
			<div class="lb-card-elo lb-card-att">${user.elo}</div>
			<div class="lb-card-winrate lb-card-att">${user.winrate}</div>
			<div class="lb-card-games lb-card-att">${user.games}</div>
			</div>`
		lb.insertAdjacentHTML("beforeend", row);
		const profileButton = document.getElementById(profileButtonId);
		profileButton.addEventListener('click', () => {
			window.app.router.navigateTo(`/profiles/${user.username}`);
		});
	}
}
