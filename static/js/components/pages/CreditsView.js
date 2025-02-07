export default class CreditsView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.init();
	}

	async init() {
		this.render();
		this.addNavEventListeners();
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
		this.container.innerHTML = `
			<header>
				<h1 id="pong">P 
					<button id="credit-button">
						<i class="fa-solid fa-table-tennis-paddle-ball fa-xs"></i>
					</button>
					 N G
				</h1>
				<div id="nav-buttons">
					<button class="nav-button" id="play-button">
						<i class="fa-solid fa-gamepad fa-2xl"></i>Play
					</button>
					<button class="nav-button" id="customize-button">
						<i class="fa-solid fa-palette fa-2xl"></i>Customize
					</button>
					<button class="nav-button" id="leaderboard-button">
						<i class="fa-solid fa-medal fa-2xl"></i>Leaderboard
					</button>
					<button class="nav-button" id="achievements-button">
						<i class="fa-solid fa-trophy fa-2xl"></i>Achievements
					</button>
					<button class="nav-button" id="profile-button">
						<i class="fa-solid fa-user fa-2xl"></i>Profile
					</button>
					<button class="nav-button" id="admin-button">
						<i class="fa-solid fa-user-tie fa-2xl"></i>Admin
					</button>
					<button class="nav-button" id="logout-button">
						<i class="fa-solid fa-right-from-bracket fa-2xl"></i>Log Out
					</button>
				</div>
			</header>

			<div id="mainPage">
				<div class="credits-container">
					<div class="credits userOutline">
						<h2>Credits</h2>
						<p>
							Welcome to <strong>ft_transcendence</strong>,<br>
							the final project of the 42 common core curriculum!<br>
							This project is our version of the classic <b>Pong</b> game<br><br>
							The main goal was to build a full-stack application running as a Single Page Application [SPA]<br><br>
							Ressources used:<br>
							The whole project is running in docker <i class="fab fa-docker"></i><br>
							We're using nginx as our webserv <i class="fas fa-server"></i><br>
							Javascript <i class="fab fa-js"></i> is used for the Frontend<br>
							The backend is built in python <i class="fa-brands fa-python"></i> with Django<br>
							PostgreSQL for the Database <i class="fas fa-database"></i><br><br>
							What to do for the best user experience:<br>Check out our user customization options,<br>invite a few friends to play with you,<br>and have fun.<br><br>
							We hope you enjoy exploring our project!
						</p>
					</div>
					<div class="col-container">
						<div class="github-links userOutline">
							Created by:<br>
							<p id="tooltip-github">click on the links to check out our own githubs profiles<p>
							<a href="https://github.com/jlefonde" target="_blank" rel="noopener noreferrer">Joris Lefondeur</a><br>
							<a href="https://github.com/pluieciel" target="_blank" rel="noopener noreferrer">Yue Zhao</a><br>
							<a href="https://github.com/siul008" target="_blank" rel="noopener noreferrer">Julien Nunes</a><br>
							<a href="https://github.com/neutrou" target="_blank" rel="noopener noreferrer">Victor Algranti</a><br>
						</div>
						<iframe id="pdf" class="userOutline"
						src=
						"https://cdn.intra.42.fr/pdf/pdf/134058/en.subject.pdf#toolbar=0&navpanes=0">
					</div>
				</div>
			</div>
						`;
	};

	addNavEventListeners() {
		const creditButton = document.getElementById("credit-button");
		const playButton = document.getElementById("play-button");
		const customizeButton = document.getElementById("customize-button");
		const leaderboardButton = document.getElementById("leaderboard-button");
		const achievementsButton = document.getElementById("achievements-button");
		const profileButton = document.getElementById("profile-button");
		const adminButton = document.getElementById("admin-button");
		const logoutButton = document.getElementById("logout-button");

		creditButton.addEventListener("click", () => {
			window.app.router.navigateTo("/credits");
		});

		playButton.addEventListener("click", () => {
			window.app.router.navigateTo("/index");
		});

		customizeButton.addEventListener("click", () => {
			window.app.router.navigateTo("/customize");
		});
		
		leaderboardButton.addEventListener("click", () => {
			window.app.router.navigateTo("/leaderboard");
		});

		achievementsButton.addEventListener("click", () => {
			window.app.router.navigateTo("/achievements");
		});

		profileButton.addEventListener("click", () => {
			window.app.router.navigateTo("/profile");
		});

		adminButton.addEventListener("click", () => {
			window.app.router.navigateTo("/admin");
		});

		logoutButton.addEventListener("click", () => {
			window.app.chatBox.disconnect();
			window.app.logout();
		});
	}
}