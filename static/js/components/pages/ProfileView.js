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
					
				</div>
			</main>
		`;
	}

	addEventListeners() {
		window.app.addNavEventListeners();
	}
}