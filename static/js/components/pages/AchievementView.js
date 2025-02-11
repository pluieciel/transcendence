export default class AchievementView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.init();
	}

	async init() {
		await window.app.getSettings();
		this.render();
		window.app.checkForAdmin();
		window.app.addNavEventListeners();
		this.addContent();
	}
	
	render() {
		window.app.renderHeader(this.container, "achievements");
		this.container.innerHTML += `
		<main>
		<div id="achievements-card" class="card">
					<h2 id="card-title">ACHIEVEMENTS</h2>
					<div id="achievements-content">
						<div class="cheevo">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							<div class="cheevo-container">
								<div class="cheevo-title">Speed of light</div>
								<div class="cheevo-row">
									<div class="cheevo-body">Have a ball going to 400kph or more</div>
									<div class="cheevo-reward" style="background-color:#FFFFFF">
										<span class="tooltip">Reward:<br>White color</span>
									</div>
								</div>
									<div class="progress-bar">
										<div class="progress-bar-percentage" style="width: 0%"><span>0/1</span></div>
									</div>
							</div>
						</div>
						<div class="cheevo success">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							<div class="cheevo-container">
								<div class="cheevo-title">Survivor</div>
								<div class="cheevo-row">
									<div class="cheevo-body">Survive x seconds in killer ball in rumble</div>
									<div class="cheevo-reward" style="background-color:#E71200">
										<span class="tooltip">Reward:<br>Red color</span>
									</div>
								</div>
									<div class="progress-bar">
										<div class="progress-bar-percentage" style="width: 100%"><span>1/1</span></div>
									</div>
								</div>
						</div>
						<div class="cheevo">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							<div class="cheevo-container">
								<div class="cheevo-title">Clutch</div>
								<div class="cheevo-row">
									<div class="cheevo-body">Win a game where you were 6 points behind</div>
								</div>
									<div class="progress-bar">
										<div class="progress-bar-percentage" style="width: 0%"><span>0/1</span></div>
									</div>
							</div>
						</div>
						<div class="cheevo">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							<div class="cheevo-container">
								<div class="cheevo-title">God's Clutch</div>
								<div class="cheevo-row">
									<div class="cheevo-body">Win a game where you were 9 points behind</div>
									<div class="cheevo-reward" style="background-color:#00AD06">
										<span class="tooltip">Reward:<br>Green color</span>
									</div>
								</div>
									<div class="progress-bar">
										<div class="progress-bar-percentage" style="width: 0%"><span>0/1</span></div>
									</div>
							</div>
						</div>
						<div class="cheevo">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							<div class="cheevo-container">
								<div class="cheevo-title">Popular</div>
								<div class="cheevo-row">
									<div class="cheevo-body">Have five friends</div>
									<div class="cheevo-reward" style="background-color:#E6008F">
										<span class="tooltip">Reward:<br>Pink color</span>
									</div>
								</div>
									<div class="progress-bar">
										<div class="progress-bar-percentage" style="width: 20%"><span>1/5</span></div>
									</div>
								</div>
						</div>
						<div class="cheevo success">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							<div class="cheevo-container">
								<div class="cheevo-title">Flawless</div>
								<div class="cheevo-body">Win without losing a round</div>
								<div class="progress-bar">
									<div class="progress-bar-percentage" style="width: 100%"><span>1/1</span></div>
								</div>
							</div>
						</div>
						<div class="cheevo success">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							<div class="cheevo-container">
								<div class="cheevo-title">Beginner</div>
								<div class="cheevo-body">Win a game</div>
								<div class="progress-bar">
									<div class="progress-bar-percentage" style="width: 100%"><span>1/1</span></div>
								</div>
							</div>
						</div>
						<div class="cheevo">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							<div class="cheevo-container">
								<div class="cheevo-title">Challenger</div>
								<div class="cheevo-row">
									<div class="cheevo-body">Win ten games</div>
									<div class="cheevo-reward" style="background-color:#3E27F8">
										<span class="tooltip">Reward:<br>Blue color</span>
									</div>
								</div>
									<div class="progress-bar">
										<div class="progress-bar-percentage" style="width: 90%"><span>9/10</span></div>
									</div>
								</div>
						</div>
						<div class="cheevo">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							<div class="cheevo-container">
								<div class="cheevo-title">Champion</div>
								<div class="cheevo-row">
									<div class="cheevo-body">Win a tournament</div>
									<div class="cheevo-reward" style="background-color:#0EC384">
										<span class="tooltip">Reward:<br>Soft green color</span>
									</div>
								</div>
									<div class="progress-bar">
										<div class="progress-bar-percentage" style="width: 0%"><span>0/1</span></div>
									</div>
								</div>
						</div>
						<div class="cheevo success">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							<div class="cheevo-container">
								<div class="cheevo-title">Rumbler</div>
								<div class="cheevo-body">Win a rumble game</div>
								<div class="progress-bar">
									<div class="progress-bar-percentage" style="width: 100%"><span>1/1</span></div>
								</div>
							</div>
						</div>
						<div class="cheevo">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							<div class="cheevo-container">
								<div class="cheevo-title">Easter Egg</div>
								<div class="cheevo-row">
									<div class="cheevo-body">???</div>
									<div class="cheevo-reward" style="background-color:#6400C4">
										<span class="tooltip">Reward:<br>Purple color</span>
									</div>
								</div>
									<div class="progress-bar">
										<div class="progress-bar-percentage" style="width: 0%"><span>0/1</span></div>
									</div>
								</div>
						</div>
						<div class="cheevo">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							AAAAAAAAAAAAA

						</div>
					</div>
				</div>
			</main>
		`;
	}
}