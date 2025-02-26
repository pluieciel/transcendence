export default class AchievementsView {
	constructor(container, params = {}) {
		this.container = container;
		this.username = params.username;
		this.init();
	}

	async init() {
		await window.app.getSettings();
		await this.render();
		window.app.initChat();
		window.app.addNavEventListeners();
	}

	async getAchievements(username) {
		try {
			const response = await fetch(`/api/achievements/${username}/`);
			
			const data = await response.json();
			
			if (data.success) {
				return data;
			} else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
				window.app.logout();
			} else {
				console.error("Failed to fetch achievements:", data.message);
				return [];
			}
		} catch (error) {
			console.error("An error occurred: " + error);
			return [];
		}
	}

	async render() {
		await window.app.renderHeader(this.container, "achievements", true, false, false, this.username);
		const data = await this.getAchievements(this.username);

		if (!data)
			return;

		let colorArray = {
			0: 'Blue',
			1: 'Cyan',
			2: 'Green',
			3: 'Orange',
			4: 'Pink',
			5: 'Purple',
			6: 'Red',
			7: 'Soft Green',
			8: 'White',
			9: 'Yellow',
		};

		let achievementsHTML = '';
		data.achievements.forEach(achievement => {
			achievementsHTML += `
				<div class="cheevo ${achievement.unlocked ? 'success' : ''}">
					<div class="cheevo-icon"><i class="${achievement.icon}"></i></div>
					<div class="cheevo-container">
						<div class="cheevo-left">
							<div class="cheevo-title">${achievement.name}</div>
							<div class="cheevo-body">${achievement.description}</div>
							<div class="progress-bar">
								<div class="progress-bar-percentage" style="width: ${(achievement.progression / achievement.unlock_value * 100)}%">
									<span>${achievement.progression}/${achievement.unlock_value}</span>
								</div>
							</div>
						</div>
						<div class="cheevo-right">
							${achievement.color_unlocked  != -1? `
								<div class="cheevo-reward" style="background-color:${window.app.getColor(achievement.color_unlocked)}">
									<span class="tooltip">Reward:<br> <i class="fa-solid fa-palette fa-xl"></i> ${colorArray[achievement.color_unlocked]}</span>
								</div>
							` : ' '}
						</div>
					</div>
				</div>
			`;
		});

		this.container.innerHTML += `
			<main>
				<div id="achievements-card" class="card">
					<h2 id="card-title" class="achievements-card-title"><i class="fa-solid fa-trophy"></i>${window.app.state.username != this.username ? '&nbsp;' + this.username.toUpperCase() + (this.username.endsWith('s') ? '\'' : '\'S'): ''} ACHIEVEMENTS</h2>
					${window.app.state.username === this.username ? `
						<div id="achievements-info">
							<i class="fa-solid fa-circle-info"></i> Play ranked games to progress and earn special color rewards - available in Customize section
						</div>`: ''}
					<div id="cheevos-content">
						<div id="achievements-total-progress-bar" class="progress-bar">
							<div class="progress-bar-percentage" style="width: ${data.completion}">
								<span>${data.total_earned}</span>
							</div>
						</div>
						${achievementsHTML}
					</div>
				</div>
			</main>
			<div id="chatBoxContainer"></div>
		`;
	}
}