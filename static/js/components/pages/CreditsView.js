export default class CreditsView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.init();
	}

	async init() {
		this.render();
		window.app.addNavEventListeners();
		await this.getSettings();
	}
	
	async getSettings() {
		if (!window.app.settings['fetched'])
			await window.app.getPreferences();
		if (window.app.settings.is_admin) {
			const adminButton = document.getElementById("admin-button");
			adminButton.style.display = "block";
		}
	}

	render() {
		window.app.renderHeader(this.container, "credits", true, true);
		this.container.innerHTML += `
			<main>
				<div id="credits-card" class="card">
					<h2 id="card-title">CREDITS</h2>
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
							PostgreSQL for the Database <i class="fas fa-database"></i><br><br>
							<strong>Two Ways to Play:</strong><br>
							<i class="fa-solid fa-star"></i> <strong>Classic Mode</strong><br>
								Master the fundamentals of speed and precision<br>
								Experience pure, competitive Pong action<br>
								Perfect your paddle control and timing<br>
							<br>
							<i class="fa-solid fa-bolt"></i> <strong>Rumble Mode</strong><br>
								Unleash chaos with random events<br>
								Test your reaction time and adaptability<br>
								Enjoy a more dynamic and unpredictable game<br>
							<br>
							<i class="fa-solid fa-medal"></i> Climb the ranks in both modes<br>
							<i class="fa-solid fa-users"></i> Challenge friends or compete globally<br>
							<i class="fa-solid fa-palette"></i> Pick your style and dominate the game!<br>
							<i class="fa-solid fa-trophy"></i> Earn achievements and show off your skills!<br>
						</p>
					</div>
				</div>
				<div id="about-us-card" class="card">
					<h2 id="card-title">ABOUT US</h2>
					<div id="about-us-content">
						<p>
							The team behind <strong>ft_transcendence</strong>!<br>
							As students at <img src="imgs/42_logo.png" id="oauth-logo"> <strong>Luxembourg</strong>, we united our<br>
							skills and creativity to bring you this modern<br>
							take on a classic game.<br>
						</p>
						<div id="github-links">
							Created by:<br>
							<p id="tooltip-github">click on the links to check out our own github profiles</p>
							<a href="https://github.com/jlefonde" target="_blank" rel="noopener noreferrer">Joris Lefondeur</a><br>
							<a href="https://github.com/pluieciel" target="_blank" rel="noopener noreferrer">Yue Zhao</a><br>
							<a href="https://github.com/siul008" target="_blank" rel="noopener noreferrer">Julien Nunes</a><br>
							<a href="https://github.com/neutrou" target="_blank" rel="noopener noreferrer">Victor Algranti</a><br>
						</div>
						<br>
						<p>
							We hope you enjoy exploring our project!
						</p>
					</div>
				</div>
			</main>
		`;
	};
}