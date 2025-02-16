export default class LeaderboardView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.init();
	}

	async init() {
		await window.app.getSettings();
		await this.render();
		await window.app.addNavEventListeners();
		this.addContent();
	}

	async render() {
		await window.app.renderHeader(this.container, "leaderboard");
		this.container.innerHTML += `
			<main>
				<div id="leaderboard-card" class="card">
					<h2 id="card-title"><i class="fa-solid fa-medal"></i> LEADERBOARD</h2>
					<div id="leaderboard-content">
						<div class="lb-card-header">
							<div class="lb-card-pos lb-card-att"><i class="fa-solid fa-ranking-star"></i> Rank</div>
							<div class="lb-card-user lb-card-att"><i class="fa-solid fa-user"></i> User</div>
							<div class="lb-card-elo lb-card-att"><i class="fa-solid fa-chart-line"></i> Elo</div>
							<div class="lb-card-winrate lb-card-att"><i class="fa-solid fa-percent"></i> Winrate</div>
							<div class="lb-card-games lb-card-att"><i class="fa-solid fa-gamepad"></i> Games</div>
						</div>
						<div id="classic-leaderboard-table"></div>
						<div id="rumble-leaderboard-table"></div>
					</div>
				</div>
			</main>
		`;
	}

	async addContent() {
		try {
			const response = await fetch('/api/leaderboard/classic/');
	
			const data = await response.json();
	
			if (data.success) {
				let i = 0;
				while (i < data.leaderboard.length) {
					this.addUserToLB(data.leaderboard[i], ++i, "classic");
				}	
			}
			else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
				window.app.logout();
			}
			else {
				// TODO: handle error msg
			}
		}
		catch (e) {
			console.error(e);
		}
	}

	addUserToLB(user, rank, game_mode) {
		let		row = "";
		const	lb = document.getElementById(game_mode + "-leaderboard-table");
		
		row += "<div id=\"" + game_mode + "-lb-card-" + rank + "\"class=\"lb-card\">";
		row += "<div class=\"lb-card-pos lb-card-att\">" + rank + "</div>";
		row += "<div class=\"lb-card-user lb-card-att\"><img class=\"lb-card-avatar avatar\" src=\"" + user.avatar + "\"></img> &nbsp;&nbsp;" + user.username + "</div>";
		row += "<div class=\"lb-card-elo lb-card-att\">" + user.elo + "</div>";
		row += "<div class=\"lb-card-winrate lb-card-att\">" + user.winrate + "</div>";
		row += "<div class=\"lb-card-games lb-card-att\">" + user.games + "</div>";
		row += "</div>";

		lb.insertAdjacentHTML("beforeend", row);
	}
}
