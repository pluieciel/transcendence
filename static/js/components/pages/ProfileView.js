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
						
					</div>
					<div id="profile-card-body">
						<div id="profile-card-body-left">
							<div id="profile-card-tournaments" class="profile-card-content">
								<h5 id="card-title"><i class="fa-solid fa-crown"></i> Tournaments</h5>
								<div id="profile-card-tournaments-stats">
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
											<div class="stat-label">Max streak</div>
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