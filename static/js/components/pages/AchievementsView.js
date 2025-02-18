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

		achievements.sort((a, b) => a.order - b.order);
		let achievementsHTML = '';
		achievements.forEach(achievement => {
			achievementsHTML += `
				<div class="cheevo ${achievement.unlocked ? 'success' : ''}">
					<div class="cheevo-icon"><i class="${achievement.icon}"></i></div>
					<div class="cheevo-container">
						<div class="cheevo-title">${achievement.name}</div>
						<div class="cheevo-row">
							<div class="cheevo-body">${achievement.description}</div>
							${achievement.color_unlocked  != -1? `
								<div class="cheevo-reward" style="background-color:${window.app.getColor(achievement.color_unlocked)}">
									<span class="tooltip">Reward:<br> <i class="fa-solid fa-palette fa-xl"></i> ${colorArray[achievement.color_unlocked]}</span>
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