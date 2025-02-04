import Router from './router.js';
import MainView from './components/pages/MainView.js';
import LoginView from './components/pages/LoginView.js';
import LoginOAuth from './components/login/LoginOAuth.js';
import ProfileView from './components/pages/ProfileView.js';
import CreditsView from './components/pages/CreditsView.js';
import CustomView from './components/pages/CustomView.js';

class App {
	constructor() {
		this.routes = [
			{ path: '/', component: LoginView },
			{ path: '/index', component: MainView },
			{ path: '/custom', component: CustomView },
			{ path: '/credits', component: CreditsView },
			{ path: '/profile', component: ProfileView },
			{ path: '/login/oauth', component: LoginOAuth },
			{ path: '*', component: LoginView },
		]
		this.state = {
			isLoggedIn: sessionStorage.getItem("isLoggedIn") === "true",
			username: sessionStorage.getItem("username"),
		};
		this.avatarCache = {};
		this.settings = {'fetched' : false};
		this.ingame = sessionStorage.getItem("ingame") === "true";
		window.app = this;
		this.router = new Router(this.routes);
	}

	setColor(color) {
		switch (color) {
			default: document.documentElement.style.setProperty("--user-color", "#00BDD1");break; 
			case 0: document.documentElement.style.setProperty("--user-color", "#3E27F8");break; //Blue
			case 1: document.documentElement.style.setProperty("--user-color", "#00BDD1");break; //Cyan
			case 2: document.documentElement.style.setProperty("--user-color", "#00AD06");break; //Green
			case 3: document.documentElement.style.setProperty("--user-color", "#E67E00");break; //Orrange
			case 4: document.documentElement.style.setProperty("--user-color", "#E6008F");break; //Pink
			case 5: document.documentElement.style.setProperty("--user-color", "#6400C4");break; //Purple
			case 6: document.documentElement.style.setProperty("--user-color", "#E71200");break; //Red
			case 7: document.documentElement.style.setProperty("--user-color", "#0EC384");break; //Pink
			case 8: document.documentElement.style.setProperty("--user-color", "#E6E3E1");break; //White
		}
	}

	async getAvatar(username) {
		// if (this.avatarCache[username]) {
		// 	return this.avatarCache[username];
		// }
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
		this.settings.fetched = true;
		this.setColor(this.settings.color);
	}

	login(data) {
		this.state.isLoggedIn = true;
		this.state.username = data.username;
		sessionStorage.setItem('isLoggedIn', 'true');
		sessionStorage.setItem('username', data.username);
		this.getPreferences();
		this.router.navigateTo('/index');
	}

	logout() {
		this.state.isLoggedIn = false;
		this.ingame = false;
		sessionStorage.clear();
		this.router.navigateTo("/");
	}

	getIsLoggedIn() {
		return this.state.isLoggedIn;
	}
}

document.addEventListener('DOMContentLoaded', () => {
	window.app = new App();
});
