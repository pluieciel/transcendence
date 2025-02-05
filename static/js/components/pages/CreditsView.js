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
			const adminBtn = this.container.querySelector("#adminBtn");
			adminBtn.style.display = "block";
		}
	}

	render() {
		this.container.innerHTML = `
			<header>
				<h1 id="pong">PONG</h1>
					<button id="adminBtn" class="nav-btn">Admin</button>
					<button id="indexBtn" class="nav-btn">Index</button>
					<button id="customBtn" class="nav-btn">Custom</button>
					<button id="profileBtn" class="nav-btn">Profile</button>
					<button id="creditsBtn" class="nav-btn disabledBtn">Credits</button>
					<button id="logoutBtn" class="nav-btn">Log out</button>
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
		const	index = document.getElementById('indexBtn');
		const	custom = document.getElementById('customBtn');
		const	profile = document.getElementById('profileBtn');
		const	logoutBtn = document.getElementById('logoutBtn');
		const	adminBtn = document.getElementById('adminBtn');
		logoutBtn.addEventListener("click", () => {
            window.app.chatBox.disconnect();
            window.app.logout();
        });

		custom.addEventListener("click", () => {
			window.app.router.navigateTo("/custom");
		});

		index.addEventListener("click", () => {
			window.app.router.navigateTo("/index");
		});

		profile.addEventListener("click", () => {
			window.app.router.navigateTo("/profile");
		});

		adminBtn.addEventListener("click", () => {
			window.app.router.navigateTo("/admin");
		});
	}
}