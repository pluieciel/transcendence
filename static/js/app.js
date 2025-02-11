import AdminView from './components/pages/AdminView.js';
import Router from './router.js';
import MainView from './components/pages/MainView.js';
import LoginView from './components/pages/LoginView.js';
import SignupView from './components/pages/SignupView.js';
import LoginOAuth from './components/login/LoginOAuth.js';
import ProfileView from './components/pages/ProfileView.js';
import CreditsView from './components/pages/CreditsView.js';
import CustomizeView from './components/pages/CustomizeView.js';
import LeaderboardView from './components/pages/LeaderboardView.js';
import GameView from './components/pages/GameView.js';


class App {
	constructor() {
		this.routes = [
			{ path: '/', component: LoginView },
			{ path: '/login', component: LoginView },
			{ path: '/signup', component: SignupView },
			{ path: '/index', component: MainView },
			{ path: '/customize', component: CustomizeView },
			{ path: '/credits', component: CreditsView },
			{ path: '/profile', component: ProfileView },
			{ path: '/leaderboard', component: LeaderboardView },
			{ path: '/admin', component: AdminView },
			{ path: '/login/oauth', component: LoginOAuth },
			{ path: '*', component: LoginView },
			{ path: "/game", component: GameView },
		]
		this.state = {
			isLoggedIn: sessionStorage.getItem("isLoggedIn") === "true",
			username: sessionStorage.getItem("username"),
		};
		this.avatarCache = {};
		this.settings = { fetched: false };
		this.ingame = sessionStorage.getItem("ingame") === "true";
		window.app = this;
		this.router = new Router(this.routes);
	}

	setColor(color) {
		document.documentElement.style.setProperty("--user-color", this.getColor(color));
	}

	getColor(color) {
		switch (color) {
			case 0:
				return "#3E27F8"; //Blue
			case 1:
				return "#00BDD1"; //Cyan
			case 2:
				return "#00AD06"; //Green
			case 3:
				return "#E67E00"; //Orange
			case 4:
				return "#E6008F"; //Pink
			case 5:
				return "#6400C4"; //Purple
			case 6:
				return "#E71200"; //Red
			case 7:
				return "#0EC384"; //Soft Green
			case 8:
				return "#E6E3E1"; //White
			default:
				return "#00BDD1";
		}
	}

	async getAvatar(username) {
		const response = await fetch(`/api/get/avatar/${username}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		});
		const data = await response.json();
		this.avatarCache[username] = data.avatar_url;
		return data.avatar_url;
	}

	async getPreferences() {
		const response = await fetch(`/api/settings/get/preferences`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		});
		const data = await response.json();
		if (data.success)
		{
			this.settings.color = data['color'];
			this.settings.quality = data['quality'];
			this.settings.is_2fa_enabled = data['is_2fa_enabled'];
			this.settings.is_admin = data['is_admin'];
			this.settings.fetched = true;
			this.setColor(this.settings.color);
		}
		else
			// TODO: add error handling
		;
	}

	showErrorMsg(selector, msg) {
		const errorDiv = document.querySelector(selector);
		errorDiv.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${msg}`;
		errorDiv.style.display = 'block';
	}

	async renderHeader(container, disableBtn = null, withNav = true, creditsDisabled = false, inLogin = false) {
		let header = `
			<header>
				<h1 id="header-title">P
					<button id="${inLogin ? 'login-credits-button' : 'credits-button'}" ${creditsDisabled ? 'disabled' : ''}>
						<i class="fa-solid fa-table-tennis-paddle-ball fa-xs"></i>
					</button>
					N G
				</h1>
		`;

		if (withNav)
		{
			try {
				const response = await fetch('/api/get/nav/profile', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
				});
				const data = await response.json();
				
				if (data.success) {
					header += `
						<nav>
							<ul>
								<li>
									<button id="play-button" ${disableBtn === "play" ? 'disabled' : ''}>
										<i class="fa-solid fa-gamepad fa-xl"></i>Play
									</button>
								</li>
								<li>
									<button id="tournament-button" ${disableBtn === "tournament" ? 'disabled' : ''}>
										<i class="fa-solid fa-crown fa-xl"></i>Tournament
									</button>
								</li>
								<li>
									<button id="leaderboard-button" ${disableBtn === "leaderboard" ? 'disabled' : ''}>
										<i class="fa-solid fa-medal fa-xl"></i>Leaderboard
									</button>
								</li>
								<li>
									<button id="achievements-button" ${disableBtn === "achievements" ? 'disabled' : ''}>
										<i class="fa-solid fa-trophy fa-xl"></i>Achievements
									</button>
								</li>
								<li>
									<button id="customize-button" ${disableBtn === "customize" ? 'disabled' : ''}>
										<i class="fa-solid fa-palette fa-xl"></i>Customize
									</button>
								</li>
								<li>
									<button id="profile-button" ${disableBtn === "profile" ? 'disabled' : ''}>
										<i class="fa-solid fa-user fa-xl"></i>Profile
									</button>
								</li>
								<li style="display: ${this.settings.is_admin ? 'block' : 'none'}">
									<button id="admin-button" ${disableBtn === "admin" ? 'disabled' : ''}>
										<i class="fa-solid fa-user-tie fa-xl"></i>Admin
									</button>
								</li>
								<li>
									<div id="nav-user-avatar-container">
										<div id="nav-username-container">
											<div id="nav-username">${data.username}</div>
											<div id="nav-display-name" style="display: ${data.display_name ? 'block' : 'none'}">${data.display_name}</div>
										</div>
										<img src="${data.avatar_url}" alt="User Avatar" id="nav-user-avatar">
									</div>
								</li>
								<li>
									<button id="logout-button">
										<i class="fa-solid fa-right-from-bracket fa-xl"></i>Log Out
									</button>
								</li>
							</ul>
						</nav>
					`;
				} else if (response.status == 401 && !data.is_jwt_valid) {
					window.app.logout();
					window.app.router.navigateTo("/login");
				} else 
					window.app.showErrorMsg('#input-error', data.message);
			} catch (error) {
				window.app.showErrorMsg('#input-error', 'An error occurred: ' + error);
			}
		}
			header += `</header>`;
			container.innerHTML = header;
			if (withNav)
				this.checkForAdmin();
	}

	async addNavEventListeners() {
		const creditButton = document.getElementById("credits-button");
		const playButton = document.getElementById("play-button");
		const tournamentButton = document.getElementById("tournament-button");
		const leaderboardButton = document.getElementById("leaderboard-button");
		const achievementsButton = document.getElementById("achievements-button");
		const customizeButton = document.getElementById("customize-button");
		const profileButton = document.getElementById("profile-button");
		const adminButton = document.getElementById("admin-button");
		const logoutButton = document.getElementById("logout-button");

		if (creditButton) {
			creditButton.addEventListener("click", () => {
				window.app.router.navigateTo("/credits");
			});
		}

		playButton.addEventListener("click", () => {
			window.app.router.navigateTo("/index");
		});

		tournamentButton.addEventListener("click", () => {
			window.app.router.navigateTo("/tournament");
		});

		leaderboardButton.addEventListener("click", () => {
			window.app.router.navigateTo("/leaderboard");
		});
		
		achievementsButton.addEventListener("click", () => {
			window.app.router.navigateTo("/achievements");
		});
		
		customizeButton.addEventListener("click", () => {
			window.app.router.navigateTo("/customize");
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

	async getSettings() {
		if (!window.app.settings["fetched"]) 
			await window.app.getPreferences();
	}

	checkForAdmin() {
		if (window.app.settings.is_admin) {
			const adminButton = document.querySelector("li:has(button[id='admin-button'])");
			adminButton.style.display = "block";
		}
	}

	login(data) {
		this.state.isLoggedIn = true;
		this.state.username = data.username;
		sessionStorage.setItem("isLoggedIn", "true");
		sessionStorage.setItem("username", data.username);
		this.getPreferences();
		this.router.navigateTo("/index");
	}

	logout() {
		this.settings.fetched = false;
		this.state.isLoggedIn = false;
		this.ingame = false;
		sessionStorage.clear();
		this.router.navigateTo("/");
	}

	getIsLoggedIn() {
		return this.state.isLoggedIn;
	}
}

document.addEventListener("DOMContentLoaded", () => {
	window.app = new App();
});
