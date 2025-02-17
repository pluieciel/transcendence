export default class ProfileView {
	constructor(container, params = {}) {
		this.container = container;
		if (window.location.pathname === "/profile")
			this.username = window.app.state.username;
		else
			this.username = params.username;
		this.init();
	}

	async init() {
		await window.app.getSettings();
		const profile = await this.getProfile();
		if (profile) {
			await this.render(profile);
			await this.getGameHistory();
			this.addEventListeners();
		}
	}

	async render(profile) {
		await window.app.renderHeader(this.container, "profile");
		this.container.innerHTML += `
			<main>
				<div id="profile-card" class="card">
					<div id="profile-card-header" class="profile-card-content">
						<div id="profile-card-header-left" class="profile-card-content">
							<h5 id="card-title"><i class="fa-solid fa-star"></i> Classic</h5>
							<div class="profile-card-stats">
								<ul>
									<li>
										<div class="stat-value">${profile.classic.total_played}</div>
										<div class="stat-label">Total Played</div>
									</li>
									<li>
										<div class="stat-value">${profile.classic.wins}</div>
										<div class="stat-label">Win</div>
									</li>
									<li>
										<div class="stat-value">${profile.classic.winrate}</div>
										<div class="stat-label">Winrate</div>
									</li>
									<li>
										<div class="stat-value">${profile.classic.elo}</div>
										<div class="stat-label">Elo</div>
									</li>
									<li>
										<div class="stat-value">${this.getRankField(profile.classic.rank)}</div>
										<div class="stat-label">Rank</div>
									</li>
								</ul>
							</div>
						</div>
						<div id="profile-card-header-middle">
							<img src="${profile.avatar_url}" id="profile-card-avatar" class="avatar">
							<div id="profile-card-username">${profile.username}${profile.is_42_user ? "&nbsp;<img src=\"/imgs/42_logo.png\" id=\"oauth-logo\"></img>" : ""}</div>
							<div id="profile-card-display-name" style="display: ${profile.display_name ? 'block' : 'none'}">${profile.display_name || ''}</div>
						</div>
						<div id="profile-card-header-right">
							<h5 id="card-title"><i class="fa-solid fa-bolt"></i> Rumble</h5>
							<div class="profile-card-stats">
								<ul>
									<li>
										<div class="stat-value">${this.getRankField(profile.rumble.rank)}</div>
										<div class="stat-label">Rank</div>
									</li>
									<li>
										<div class="stat-value">${profile.rumble.elo}</div>
										<div class="stat-label">Elo</div>
									</li>
									<li>
										<div class="stat-value">${profile.rumble.winrate}</div>
										<div class="stat-label">Winrate</div>
									</li>
									<li>
										<div class="stat-value">${profile.rumble.wins}</div>
										<div class="stat-label">Win</div>
									</li>
									<li>
										<div class="stat-value">${profile.rumble.total_played}</div>
										<div class="stat-label">Total Played</div>
									</li>
								</ul>
							</div>
						</div>
					</div>
					<div id="profile-card-body">
						<div id="profile-card-body-left">
							<div id="profile-card-tournaments" class="profile-card-content">
								<h5 id="card-title"><i class="fa-solid fa-crown"></i> Tournaments</h5>
								<div class="profile-card-stats">
									<ul>
										<li>
											<div class="stat-value">${profile.tournament.total_participated}</div>
											<div class="stat-label">Total Participated</div>
										</li>
										<li>
											<div class="stat-value">${profile.tournament.top_1}</div>
											<div class="stat-label">Top 1</div>
										</li>
										<li>
											<div class="stat-value">${profile.tournament.top_2}</div>
											<div class="stat-label">Top 2</div>
										</li>
										<li>
											<div class="stat-value">${profile.tournament.winrate}</div>
											<div class="stat-label">Winrate</div>
										</li>
										<li>
											<div class="stat-value">${profile.tournament.max_streak}</div>
											<div class="stat-label">Max Streak</div>
										</li>
									</ul>
								</div>
							</div>
							<div id="profile-card-achievements" class="profile-card-content">
								<h5 id="card-title"><i class="fa-solid fa-trophy"></i> Achievements</h5>
							</div>
						</div>
						<div id="profile-card-game-history" class="profile-card-content">
							<h5 id="card-title"><i class="fa-solid fa-clock-rotate-left"></i> Game History</h5>
							<div id="game-history-content">
								<div id="game-history-item-container"></div>
							</div>
						</div>
					</div>
				</div>
			</main>
		`;
	}

	addEventListeners() {
		window.app.addNavEventListeners();
	}

	getRankField(rank) {
		switch (rank) {
			case 1:
				return `<i class="fa-solid fa-medal" style="color: #FFD700"></i> ` + rank;
			case 2:
				return `<i class="fa-solid fa-medal" style="color: #C0C0C0"></i> ` + rank;
			case 3:
				return `<i class="fa-solid fa-medal" style="color: #CD7F32"></i> ` + rank;
			default:
				return "#" + rank;
		}
	}

	async getProfile() {
		try {
			const response = await fetch(`/api/profiles/${this.username}/`);
	
			const data = await response.json();
			if (data.success) {
				return data;
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

	async getGameHistory() {
		try {
			const response = await fetch(`/api/profiles/${this.username}/history/`);
	
			const data = await response.json();
			console.log(data);
			if (data.success) {
				Object.keys(data).forEach(key => {
					if (key.startsWith('game_history_'))
						this.addGameHistoryToGameHistories(data[key]);
				});
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

	addGameHistoryToGameHistories(gameHistory) {
		const itemContainer = document.getElementById('game-history-item-container');
		const item = `
			<div class="game-history-item">
				<div id="game-history-game-type">
					${gameHistory['game_mode'] == "classic" ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-solid fa-bolt"></i>'}
				</div>
				<div id="player-left-history-name">${gameHistory['player_left']['is_winner'] ? '<i class="fa-solid fa-medal"></i>' : ''} ${gameHistory['player_left']['name']}</div>
				<div id="game-history-middle">
					<img src="${gameHistory['player_left']['avatar_url']}" id="player-left-history-avatar" class="avatar">
					<div id="game-middle-info">
						<div id="game-history-score">${gameHistory['score_left']} - ${gameHistory['score_right']}</div>
						<div id="game-history-time">${gameHistory['time_since_game']}</div>
					</div>
					<img src="${gameHistory['player_right']['avatar_url']}" id="player-right-history-avatar" class="avatar">
				</div>
				<div id="player-right-history-name">${gameHistory['player_right']['name']} ${gameHistory['player_right']['is_winner'] ? '<i class="fa-solid fa-medal"></i>' : ''}</div>
				<div id="game-history-elo-change"><i class="fa-solid fa-plus-minus"></i> ${gameHistory['elo_change']}</div>
			</div>`
		itemContainer.insertAdjacentHTML("beforeend", item);
	}
}