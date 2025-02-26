export default class CreditsView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.init();
	}

	async init() {

		await window.app.getSettings();
		await this.render();
		window.app.initChat();
		window.app.addNavEventListeners();
		await this.unlockEasterEgg();
	}

	async unlockEasterEgg() {
		try {
			const response = await fetch(`/api/credits/`);
			const data = await response.json();
			if (data.success) {
				return;
			} else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
				window.app.logout();
			} else {
				console.error("Failed to unlock easter egg:", data.message);
				return [];
			}
		} catch (error) {
			console.error("An error occurred: " + error);
			return [];
		}
	}

	async render() {
		await window.app.renderHeader(this.container, "credits", true, true);
		this.container.innerHTML += `
			<div id="chatBoxContainer"></div>
			<main id="credits-view">
				<div id="credits-card" class="card">
					<h2 id="card-title"><i class="fa-solid fa-table-tennis-paddle-ball"></i> CREDITS</h2>
					<div id="credits-content">
						<p>
							Welcome to <strong>ft_transcendence</strong>,<br>
							the final project of the <img src="imgs/42_logo.png" id="oauth-logo"> common core curriculum!<br>
							This project is our version of the classic <b>Pong</b> game<br><br>
							The main goal was to build a full-stack application running as a Single Page Application [SPA]<br><br>
							<strong>Ressources used:</strong><br>
							The whole project is running in Docker <i class="fab fa-docker"></i><br>
							We're using Nginx as our webserv <i class="fas fa-server"></i><br>
							Javascript <i class="fab fa-js"></i> is used for the Frontend<br>
							The backend is built in Python <i class="fa-brands fa-python"></i> with Django and<br>
							PostgreSQL for the Database <i class="fas fa-database"></i><br>
							<div id="github-links">
								You can find the source code of the project on <a href="https://github.com/pluieciel/transcendence" target="_blank" rel="noopener noreferrer"><i class="fab fa-github"></i> GitHub</a>
							</div>
						</p>
						<div id="github-links">
							<strong>Created by:</strong><br>
							<p id="tooltip-github">click on the links to check out our own github profiles</p>
							<a href="https://github.com/jlefonde" target="_blank" rel="noopener noreferrer"><i class="fab fa-github"></i> Joris Lefondeur</a><br>
							<a href="https://github.com/pluieciel" target="_blank" rel="noopener noreferrer"><i class="fab fa-github"></i> Yue Zhao</a><br>
							<a href="https://github.com/siul008" target="_blank" rel="noopener noreferrer"><i class="fab fa-github"></i> Julien Nunes</a><br>
							<a href="https://github.com/neutrou" target="_blank" rel="noopener noreferrer"><i class="fab fa-github"></i> Victor Algranti</a><br>
						</div>
						<br>
						<p>
							We hope you enjoy exploring our project!
						</p>
					</div>
				</div>
				<div id="subject-card" class="card">
					<iframe id="subject-pdf" src="/pdf/subject.pdf#toolbar=0&navpanes=0">
				</div>
			</main>
		`;
	};
}
