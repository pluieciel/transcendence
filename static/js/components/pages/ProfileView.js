export default class ProfileView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.init();
	}

	async init() {
		await this.render();
		this.addEventListeners();
	}

	async render() {
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
										<div class="stat-value">63</div>
										<div class="stat-label">Total Games</div>
									</li>
									<li>
										<div class="stat-value">41</div>
										<div class="stat-label">Win</div>
									</li>
									<li>
										<div class="stat-value">65%</div>
										<div class="stat-label">Winrate</div>
									</li>
									<li>
										<div class="stat-value">1781</div>
										<div class="stat-label">Elo</div>
									</li>
									<li>
										<div class="stat-value">#3</div>
										<div class="stat-label">Rank</div>
									</li>
								</ul>
							</div>
						</div>
						<div id="profile-card-header-middle">
							<img src="/imgs/default_avatar.png" id="profile-card-avatar" class="avatar">
							<div id="profile-card-username">user1</div>
							<div id="profile-card-display-name">Joris</div>
						</div>
						<div id="profile-card-header-right">
							<h5 id="card-title"><i class="fa-solid fa-bolt"></i> Rumble</h5>
							<div class="profile-card-stats">
								<ul>
									<li>
										<div class="stat-value">#3</div>
										<div class="stat-label">Rank</div>
									</li>
									<li>
										<div class="stat-value">1781</div>
										<div class="stat-label">Elo</div>
									</li>
									<li>
										<div class="stat-value">65%</div>
										<div class="stat-label">Winrate</div>
									</li>
									<li>
										<div class="stat-value">41</div>
										<div class="stat-label">Win</div>
									</li>
									<li>
										<div class="stat-value">63</div>
										<div class="stat-label">Total Games</div>
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
											<div class="stat-value">11</div>
											<div class="stat-label">Total Participated</div>
										</li>
										<li>
											<div class="stat-value">1</div>
											<div class="stat-label">Top 1</div>
										</li>
										<li>
											<div class="stat-value">2</div>
											<div class="stat-label">Top 2</div>
										</li>
										<li>
											<div class="stat-value">18%</div>
											<div class="stat-label">Winrate</div>
										</li>
										<li>
											<div class="stat-value">1</div>
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
							<div id="profile-card-game-history-content">
								<div class="profile-card-game-history-item">
									<i class="fa-solid fa-star"></i>
									<div id="player-left-history">
										<div id="player-left-history-name"><i class="fa-solid fa-medal"></i> user1</div>
										<img src="/imgs/default_avatar.png" id="player-left-history-avatar" class="avatar">
									</div>
									<div id="game-history-middle">
										<div id="game-history-score">10 - 5</div>
										<div id="game-history-date">14/02/2025</div>
									</div>
									<div id="player-right-history">
										<img src="/imgs/default_avatar.png" id="player-right-history-avatar" class="avatar">
										<div id="player-right-history-name">user2</div>
									</div>
									<div id="game-history-elo-change"><i class="fa-solid fa-plus-minus"></i> 20</div>
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
}