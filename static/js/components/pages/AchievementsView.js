export default class AchievementsView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.init();
	}

	async init() {
		await window.app.getSettings();
		await this.render();
		window.app.addNavEventListeners();
	}

	async getAchievements(username) {
		try {
			const response = await fetch(`/api/profiles/${username}/achievement/`);
			console.log(response);
			const data = await response.json();
			console.log(data);
			if (data.success)
				return data.achievements;
			else {
				console.error("Failed to fetch achievements:", data.message);
				return [];
			}
		} catch (error) {
			console.error("An error occurred: " + error);
			return [];
		}
	}
	
	async render() {
		await window.app.renderHeader(this.container, "achievements");
		const achievements = await this.getAchievements(this.username);
		
		let achievementsHTML = '';
		achievements.forEach(achievement => {
			achievementsHTML += `
				<div class="cheevo ${achievement.unlocked ? 'success' : ''}">
					<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
					<div class="cheevo-container">
						<div class="cheevo-title">${achievement.name}</div>
						<div class="cheevo-row">
							<div class="cheevo-body">${achievement.description}</div>
							${achievement.color_unlocked ? `
								<div class="cheevo-reward" style="background-color:#${achievement.color_unlocked.toString(16).padStart(6, '0')}">
									<span class="tooltip">Reward:<br>Color #${achievement.color_unlocked.toString(16).padStart(6, '0')}</span>
								</div>
							` : ''}
						</div>
						<div class="progress-bar">
							<div class="progress-bar-percentage" style="width: ${(achievement.progression / achievement.unlock_value * 100)}%">
								<span>${achievement.progression}/${achievement.unlock_value}</span>
							</div>
						</div>
					</div>
				</div>
			`;
		});

		this.container.innerHTML += `
			<main>
				<div id="achievements-card" class="card">
					<h2 id="card-title">ACHIEVEMENTS</h2>
					<div id="achievements-content">
						${achievementsHTML}
					</div>
				</div>
			</main>
		`;
	}
}