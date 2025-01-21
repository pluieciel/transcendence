import LoginView from './components/pages/LoginView.js';
import MainView from './components/pages/MainView.js';
import SettingsView from './components/pages/SettingsView.js';
import LoginOAuth from './components/login/LoginOAuth.js';
import Router from './router.js';

class App {

    constructor() {
		this.routes = [
			{ path: '/', component: LoginView },
            { path: '/index', component: MainView },
            { path: '/settings', component: SettingsView },
            { path: '/login/oauth', component: LoginOAuth },
			{ path: '*', component: LoginView },
		]
        this.state = {
            isLoggedIn: sessionStorage.getItem('isLoggedIn') === 'true',
            token: sessionStorage.getItem('token') || '',
        };
        this.avatarCache = {};
        this.ingame = sessionStorage.getItem('ingame') === 'true';
		window.app = this;
        this.router = new Router(this.routes);

    }

    async getAvatar(username) {
        if (this.avatarCache[username]) {
            return this.avatarCache[username];
        }
        const response = await fetch(`/api/get/avatar/${username}`,{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${this.state.token}`,
            },
        });
        const data = await response.json();
        this.avatarCache[username] = data.avatar;
		console.log(data.avatar);
        return data.avatar;
    }
    
    login(data) {
        this.state.isLoggedIn = true;
        this.state.token = data.token;
        console.log("sessionStorageingame", sessionStorage.getItem('ingame'));
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('token', this.state.token);
        this.router.navigateTo('/index');
    }
	
	login42(username, token, theme) {
		this.state.isLoggedIn = true;
        this.state.token = token;
		this.state.theme = theme;
		sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('token', this.state.token);
        this.router.navigateTo('/index');
	}

    logout() {
        this.state.isLoggedIn = false;
        this.state.token = '';
        this.ingame = false;
        sessionStorage.clear();
        this.router.navigateTo('/');
    }

    getIsLoggedIn() {
        return this.state.isLoggedIn;
    }

    getToken() {
        return this.state.token;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded");
    window.app = new App();
});