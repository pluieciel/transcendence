import LoginView from './components/LoginView.js';
import MainView from './components/pages/MainView.js';
import SettingsView from './components/pages/SettingsView.js';
import SignUpAuthView from './components/login/SignUpOAuth.js';
//import GameView from './components/GameView.js';
import Router from './router.js';

class App {
    // Private
    #state;

    constructor() {
		
		this.routes = [
			{ path: '/', component: LoginView },
            { path: '/index', component: MainView },
            //{ path: '/game', component: GameView },
            { path: '/settings', component: SettingsView },
            { path: '/signup/oauth', component: SignUpAuthView },
			{ path: '*', component: LoginView },
		]
        this.#state = {
            isLoggedIn: sessionStorage.getItem('isLoggedIn') === 'true',
            token: sessionStorage.getItem('token') || '',
        };
        this.avatarCache = {};
        this.ingame = sessionStorage.getItem('ingame') === 'true';
        console.log("ingame", this.ingame);
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
                'Authorization': `${this.#state.token}`,
            },
        });
        const data = await response.json();
        this.avatarCache[username] = data.avatar;
        return data.avatar;
    }
    
    login(data) {
        this.#state.isLoggedIn = true;
        this.#state.token = data.token;
        console.log("sessionStorageingame", sessionStorage.getItem('ingame'));
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('token', this.#state.token);
        this.router.navigateTo('/index');
    }

    logout() {
        this.#state.isLoggedIn = false;
        this.#state.token = '';
        this.ingame = false;
        sessionStorage.clear();
        this.router.navigateTo('/');
    }

    getIsLoggedIn() {
        return this.#state.isLoggedIn;
    }

    getToken() {
        return this.#state.token;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded");
    window.app = new App();
});