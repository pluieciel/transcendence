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
								<div class="cheevo-body">Have a ball going to 400kph or more</div>
								<div class="cheevo-row">
									<div class="progress-bar">
										<div class="progress-bar-percentage" style="width: 0%"><span>0/1</span></div>
									</div>
									<span class="cheevo-unlock-txt">unlocks white color</span>
								</div>
							</div>
						</div>
						<div class="cheevo success">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							<div class="cheevo-container">
								<div class="cheevo-title">Speed of light</div>
								<div class="cheevo-body">Have a ball going to 400kph or more</div>
								<div class="cheevo-row">
									<div class="progress-bar">
										<div class="progress-bar-percentage" style="width: 100%"><span>1/1</span></div>
									</div>
									<span class="cheevo-unlock-txt">unlocks white color</span>
								</div>
							</div>
						</div>
						<div class="cheevo">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							<div class="cheevo-container">
								<div class="cheevo-title">Speed of light</div>
								<div class="cheevo-row">
									<div class="cheevo-body">Have a ball going to 400kph or more</div>
									<div class="cheevo-reward">
										<span class="tooltip">Reward:<br>white color</span>
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
								<div class="cheevo-title">Speed of light</div>
								<div class="cheevo-row">
									<div class="cheevo-body">Have a ball going to 400kph or more</div>
									<div class="cheevo-reward">
										<span class="tooltip">Reward:<br>white color</span>
									</div>
								</div>
									<div class="progress-bar">
										<div class="progress-bar-percentage" style="width: 100%"><span>1/1</span></div>
									</div>
								</div>
						</div>
						<div class="cheevo">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							AAAAAAAAAAAAA

						</div>
						<div class="cheevo">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							AAAAAAAAAAAAA

						</div>
						<div class="cheevo">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							AAAAAAAAAAAAA

						</div>
						<div class="cheevo">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							AAAAAAAAAAAAA

						</div>
						<div class="cheevo">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							AAAAAAAAAAAAA

						</div>
						<div class="cheevo">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							AAAAAAAAAAAAA

						</div>
						<div class="cheevo">
							<div class="cheevo-icon"><i class="fa-solid fa-trophy fa-xl"></i></div>
							AAAAAAAAAAAAA

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