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
										<div class="stat-value">#${profile.classic.rank}</div>
										<div class="stat-label">Rank</div>
									</li>
								</ul>
							</div>
						</div>
						<div id="profile-card-header-middle">
							<img src="${profile.avatar_url}" id="profile-card-avatar" class="avatar">
							<div id="profile-card-username">${profile.username}</div>
							<div id="profile-card-display-name" style="display: ${profile.display_name ? 'block' : 'none'}">${profile.display_name || ''}</div>
						</div>
						<div id="profile-card-header-right">
							<h5 id="card-title"><i class="fa-solid fa-bolt"></i> Rumble</h5>
							<div class="profile-card-stats">
								<ul>
									<li>
										<div class="stat-value">#${profile.rumble.rank}</div>
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
								<div id="game-history-item-container">
									<div class="game-history-item">
											<div id="game-history-game-type">
												<i class="fa-solid fa-star"></i>
										</div>
										<div id="player-left-history-name">user1</div>
										<div id="game-history-middle">
											<img src="/imgs/default_avatar.png" id="player-left-history-avatar" class="avatar">
											<div id="game-middle-info">
												<div id="game-history-date">14/02/2025</div>
												<div id="game-history-score">10 - 5</div>
												<div id="game-history-time">14:00</div>
											</div>
											<img src="/imgs/default_avatar.png" id="player-right-history-avatar" class="avatar">
										</div>
										<div id="player-right-history-name">user2</div>
										<div id="game-history-elo-change"><i class="fa-solid fa-plus-minus"></i> 20</div>
									</div>
								</div>
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
}