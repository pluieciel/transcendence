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
		switch (color) {
			case 0:
				document.documentElement.style.setProperty("--user-color", "#3E27F8");
				break; //Blue
			case 1:
				document.documentElement.style.setProperty("--user-color", "#00BDD1");
				break; //Cyan
			case 2:
				document.documentElement.style.setProperty("--user-color", "#00AD06");
				break; //Green
			case 3:
				document.documentElement.style.setProperty("--user-color", "#E67E00");
				break; //Orrange
			case 4:
				document.documentElement.style.setProperty("--user-color", "#E6008F");
				break; //Pink
			case 5:
				document.documentElement.style.setProperty("--user-color", "#6400C4");
				break; //Purple
			case 6:
				document.documentElement.style.setProperty("--user-color", "#E71200");
				break; //Red
			case 7:
				document.documentElement.style.setProperty("--user-color", "#0EC384");
				break; //Soft Green
			case 8:
				document.documentElement.style.setProperty("--user-color", "#E6E3E1");
				break; //White
			default:
				document.documentElement.style.setProperty("--user-color", "#00BDD1");
				break;
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
		this.avatarCache[username] = data.avatar;
		return data.avatar;
	}

	async getPreferences() {
		const response = await fetch(`/api/settings/get/preferences`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		});
		const data = await response.json();
		if (!data.success)
			return;
		this.settings.color = data['color'];
		this.settings.quality = data['quality'];
		this.settings.is_2fa_enabled = data['is_2fa_enabled'];
		this.settings.is_admin = data['is_admin'];
		this.settings.fetched = true;
		this.setColor(this.settings.color);
	}

	showErrorMsg(selector, msg) {
		const errorDiv = document.querySelector(selector);
		errorDiv.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${msg}`;
		errorDiv.style.display = 'block';
	}

	renderHeader(container, disableBtn = null, withNav = true, creditsDisabled = false) {
		let header = `
			<header>
				<h1 id="header-title">P
					<button id="credit-button" ${creditsDisabled ? 'disabled' : ''}>
						<i class="fa-solid fa-table-tennis-paddle-ball fa-xs"></i>
					</button>
					N G
				</h1>
		`;

		if (withNav)
		{
			header += `
				<nav>
					<ul>
						<li>
							<button id="play-button" ${disableBtn === "play" ? 'disabled' : ''}>
								<i class="fa-solid fa-gamepad fa-xl"></i>Play
							</button>
						</li>
						<li>
							<button id="customize-button" ${disableBtn === "customize" ? 'disabled' : ''}>
								<i class="fa-solid fa-palette fa-xl"></i>Customize
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
							<button id="logout-button">
								<i class="fa-solid fa-right-from-bracket fa-xl"></i>Log Out
							</button>
						</li>
					</ul>
				</nav>
			`;
		}
		header += `</header>`;
		container.innerHTML = header;
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
