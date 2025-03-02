import AdminView from './components/pages/AdminView.js';
import Router from './router.js';
import PlayView from './components/pages/PlayView.js';
import TournamentView from './components/pages/TournamentView.js';
import LoginView from './components/pages/LoginView.js';
import SignupView from './components/pages/SignupView.js';
import LoginOAuth from './components/login/LoginOAuth.js';
import ProfileView from './components/pages/ProfileView.js';
import SettingsView from './components/pages/SettingsView.js';
import CreditsView from './components/pages/CreditsView.js';
import CustomizeView from './components/pages/CustomizeView.js';
import LeaderboardView from './components/pages/LeaderboardView.js';
import GameView from './components/pages/GameView.js';
import AchievementsView from './components/pages/AchievementsView.js';
import ChatBox from "./components/chat/ChatBox.js";


class App {
	constructor() {
		this.routes = [
			{ path: '/', component: LoginView },
			{ path: '/login', component: LoginView },
			{ path: '/signup', component: SignupView },
			{ path: '/play', component: PlayView },
			{ path: '/tournament', component: TournamentView },
			{ path: '/customize', component: CustomizeView },
			{ path: '/credits', component: CreditsView },
			{ path: '/profiles/:username', component: ProfileView },
			{ path: '/settings', component: SettingsView },
			{ path: '/achievements/:username', component: AchievementsView},
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
			case 0: return "#447AFF";
			case 1: return "#00BDD1";
			case 2: return "#00AD06";
			case 3: return "#E67E00";
			case 4: return "#E6008F"; //Pink A
			case 5: return "#6900CC"; //Purple A
			case 6: return "#E71200"; // Red A
			case 7: return "#0EC384"; //Soft green A
			case 8: return "#E6E3E1"; //White A
			case 9: return "#D5DA2B"; //Yellow A
			default: return "#00BDD1";
		}
	}

	async getAvatar(username) {
		try {
			const response = await fetch(`/api/profiles/${username}/avatar/`);

			const data = await response.json();
			if (data.success) {
				return data.avatar_url;
			} else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
				window.app.logout();
			} else {
				console.error(data.message);
			}
		} catch (error) {
			console.error("An error occurred: " + error);
		}
	}

	async getUserPreferences() {
		try {
			const response = await fetch(`/api/settings/customize/`);

			const data = await response.json();
			if (data.success)
			{
				this.settings.color = data['color'];
				this.settings.quality = data['quality'];
				this.settings.fetched = true;
				this.setColor(this.settings.color);
			} else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
				window.app.logout();
			} else {
				console.error(data.message);
			}
		} catch (error) {
			console.error("An error occurred: " + error);
		}
	}

	showErrorMsg(errorSelector, msg, timeout = 10000) {
		const errorDiv = document.querySelector(errorSelector);
		if (errorDiv.timeoutId) {
			clearTimeout(errorDiv.timeoutId);
		}
		
		errorDiv.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${msg}`;
		errorDiv.style.backgroundColor = 'var(--input-error-color)';
		errorDiv.style.border = `1px solid var(--input-error-border-color)`;
		errorDiv.style.color = 'var(--input-error-text-color)';
		errorDiv.style.display = 'block';

		errorDiv.timeoutId = setTimeout(() => {
			errorDiv.style.display = 'none';
		}, timeout);
	}

	showSuccessMsg(successSelector, msg, timeout = 10000) {
		const successDiv = document.querySelector(successSelector);
		if (successDiv.timeoutId) {
			clearTimeout(successDiv.timeoutId);
		}

		successDiv.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${msg}`;
		successDiv.style.backgroundColor = 'var(--input-success-color)';
		successDiv.style.border = `1px solid var(--input-success-border-color)`;
		successDiv.style.color = 'var(--input-success-text-color)';
		successDiv.style.display = 'block';

		successDiv.timeoutId = setTimeout(() => {
			successDiv.style.display = 'none';
		}, timeout);
	}

	showWarningMsg(warningSelector, msg, timeout = 10000) {
		const warningDiv = document.querySelector(warningSelector);
		if (warningDiv.timeoutId) {
			clearTimeout(warningDiv.timeoutId);
		}

		warningDiv.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${msg}`;
		warningDiv.style.backgroundColor = 'var(--input-warning-color)';
		warningDiv.style.border = `1px solid var(--input-warning-border-color)`;
		warningDiv.style.color = 'var(--input-warning-text-color)';
		warningDiv.style.display = 'block';

		warningDiv.timeoutId = setTimeout(() => {
			warningDiv.style.display = 'none';
		}, timeout);
	}

	async renderHeader(container, disableBtn = null, withNav = true, creditsDisabled = false, inLogin = false, username = null) {
		let header = `
			<header>
				<h1 id="header-title">P
					<button id="${inLogin ? 'login-credits-button' : 'credits-button'}" class="nav-button" ${creditsDisabled ? 'disabled' : ''}>
						<i class="fa-solid fa-table-tennis-paddle-ball fa-xs"></i>
					</button>
					N G
				</h1>
		`;

		if (withNav)
		{
			try {
				const response = await fetch('/api/profiles/me/nav/');

				const data = await response.json();
				if (data.success) {
					header += `
						<nav>
							<ul>
								<li>
									<button id="play-button" class="nav-button" ${disableBtn === "play" ? 'disabled' : ''}>
										<i class="fa-solid fa-gamepad fa-xl"></i>Play
									</button>
								</li>
								<li>
									<button id="tournament-button" class="nav-button" ${disableBtn === "tournament" ? 'disabled' : ''}>
										<i class="fa-solid fa-crown fa-xl"></i>Tournament
									</button>
								</li>
								<li>
									<button id="leaderboard-button" class="nav-button" ${disableBtn === "leaderboard" ? 'disabled' : ''}>
										<i class="fa-solid fa-medal fa-xl"></i>Leaderboard
									</button>
								</li>
								<li>
									<button id="achievements-button" class="nav-button" ${disableBtn === "achievements" && (username && this.state.username == username) ? 'disabled' : ''}>
										<i class="fa-solid fa-trophy fa-xl"></i>Achievements
									</button>
								</li>
								<li>
									<button id="customize-button" class="nav-button" ${disableBtn === "customize" ? 'disabled' : ''}>
										<i class="fa-solid fa-palette fa-xl"></i>Customize
									</button>
								</li>
								<li>
									<div id="nav-profile">
										<div id="nav-user">
											<div id="nav-username">${data.username}</div>
											<div id="nav-display-name" style="display: ${data.display_name ? 'block' : 'none'}">${data.display_name}</div>
										</div>
										${data.is_42_avatar_used ? `<img src="${data.avatar_url}" id="nav-avatar" class="avatar">` : `<img src="${data.avatar_url}?t=${new Date().getTime()}" id="nav-avatar" class="avatar">`}
									</div>
								</li>
								<li style="display: ${data.is_admin ? 'block' : 'none'}">
									<button id="admin-button" class="nav-button" ${disableBtn === "admin" ? 'disabled' : ''}>
										<i class="fa-solid fa-user-tie fa-xl"></i>Admin
									</button>
								</li>
								<li>
									<button id="settings-button" class="nav-button" ${disableBtn === "settings" ? 'disabled' : ''}>
										<i class="fa-solid fa-gear fa-xl"></i>Settings
									</button>
								</li>
								<li>
									<button id="logout-button" class="nav-button">
										<i class="fa-solid fa-right-from-bracket fa-xl"></i>Log Out
									</button>
								</li>
							</ul>
						</nav>
					`;
				} else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
					window.app.logout();
				} else {
					console.error(data.message);
				}
			} catch (error) {
				console.error("An error occurred: " + error);
			}
		}
		header += `</header>`;
		container.innerHTML = header;
	}

	initChat() {
		const chatBoxContainer = document.querySelector("#chatBoxContainer");
		if (!this.chatBox) {
			this.chatBox = new ChatBox(chatBoxContainer);
		} else {
			this.chatBox.container = chatBoxContainer;
			this.chatBox.render(chatBoxContainer);
			this.chatBox.addEventListeners();
			this.chatBox.updateOnlineUsersList();
			this.chatBox.updatePublicChat();
		}
	}

	async addNavEventListeners() {
		const creditButton = document.getElementById("credits-button");
		const playButton = document.getElementById("play-button");
		const tournamentButton = document.getElementById("tournament-button");
		const leaderboardButton = document.getElementById("leaderboard-button");
		const achievementsButton = document.getElementById("achievements-button");
		const customizeButton = document.getElementById("customize-button");
		const navProfile = document.getElementById("nav-profile");
		const adminButton = document.getElementById("admin-button");
		const settingsButton = document.getElementById("settings-button");
		const logoutButton = document.getElementById("logout-button");

		if (creditButton) {
			creditButton.addEventListener("click", () => {
				window.app.router.navigateTo("/credits");
			});
		}

		playButton.addEventListener("click", () => {
			window.app.router.navigateTo("/play");
		});

		tournamentButton.addEventListener("click", () => {
			window.app.router.navigateTo("/tournament");
		});

		leaderboardButton.addEventListener("click", () => {
			window.app.router.navigateTo("/leaderboard");
		});
		
		achievementsButton.addEventListener("click", () => {
			window.app.router.navigateTo(`/achievements/${this.state.username}`);
		});
		
		customizeButton.addEventListener("click", () => {
			window.app.router.navigateTo("/customize");
		});

		navProfile.addEventListener("click", () => {
			window.app.router.navigateTo(`/profiles/${this.state.username}`);
		});

		adminButton.addEventListener("click", () => {
			window.app.router.navigateTo("/admin");
		});

		settingsButton.addEventListener("click", () => {
			window.app.router.navigateTo("/settings");
		});

		logoutButton.addEventListener("click", () => {
			if (window.app.chatBox)
				window.app.chatBox.disconnect();
			window.app.logout();
		});
	}

	addModalQuitButtonEventListener() {
		const modalQuits = document.querySelectorAll('.modal-quit');

		modalQuits.forEach(modalQuit => {
			modalQuit.addEventListener('click', () => {
				const modalBackgrounds = document.querySelectorAll('.my-modal-background');
				
				modalBackgrounds.forEach(modalBackground => {
					modalBackground.style.display = 'none';
				});
			});
		});
	}

	async getSettings() {
		if (!window.app.settings["fetched"]) 
			await window.app.getUserPreferences();
	}

	login(data) {
		this.state.isLoggedIn = true;
		this.state.username = data.username;
		sessionStorage.setItem("isLoggedIn", "true");
		sessionStorage.setItem("username", data.username);
		this.getUserPreferences();
		this.router.navigateTo("/play");
	}

	logout() {
		this.settings.fetched = false;
		this.state.isLoggedIn = false;
		this.ingame = false;
		sessionStorage.clear();
		this.router.navigateTo("/login");
	}

	getIsLoggedIn() {
		return this.state.isLoggedIn;
	}
}

document.addEventListener("DOMContentLoaded", () => {
	window.app = new App();
});
