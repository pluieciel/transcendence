import LoginView from './components/LoginView.js';
import MainView from './components/pages/MainView.js';
import SettingsView from './components/pages/SettingsView.js';
import SignUpAuthView from './components/login/SignUpOAuth.js';
import ProfileView from './components/pages/ProfileView.js';
import GameView from './components/GameView.js';
import Router from './router.js';

class App {
    // Private
    #state;

    constructor() {
		this.routes = [
			{ path: '/', component: LoginView },
            { path: '/index', component: MainView },
            { path: '/game', component: GameView },
            { path: '/settings', component: SettingsView },
            { path: '/signup/oauth', component: SignUpAuthView },
            { path: '/profile', component: ProfileView },
			{ path: '*', component: LoginView },
		]
        this.#state = {
            isLoggedIn: sessionStorage.getItem('isLoggedIn') === 'true',
            token: sessionStorage.getItem('token') || '',
        };
        
		window.app = this;
		window.onload = this.applyTheme();
        this.router = new Router(this.routes);

    }
	
	applyTheme() {
		if (this.#state.theme === "light") {
			document.documentElement.style.setProperty('--primary-color', '#FAEBD7');
			document.documentElement.style.setProperty('--secondary-color', '#353535');
			document.documentElement.style.setProperty('--accent-color', '#E8C4A2');
			document.documentElement.style.setProperty('--hover-color', '#FFE4C4');
			document.documentElement.style.setProperty('--header-color', '#E8C4A2');
			document.documentElement.style.setProperty('--button-box-color', 'rgba(0, 0, 0, 0.5)');
		} else if (this.#state.theme === "dark") { 
			document.documentElement.style.setProperty('--primary-color', '#121212');
			document.documentElement.style.setProperty('--secondary-color', '#fff');
			document.documentElement.style.setProperty('--accent-color', '#353535');
			document.documentElement.style.setProperty('--hover-color', '#666');
			document.documentElement.style.setProperty('--header-color', '#0a0a0a');
			document.documentElement.style.setProperty('--button-box-color', 'rgba(255, 255, 255, 0.5)');
		}
	}

    login(data) {
		this.#state.isLoggedIn = true;
        this.#state.token = data.token;
		this.applyTheme();
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('token', this.#state.token);
        this.router.navigateTo('/index');
    }
	
	login42(username, token, theme) {
		this.#state.isLoggedIn = true;
        this.#state.token = token;
		this.#state.theme = theme;
		this.applyTheme();
		sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('token', this.#state.token);
        this.router.navigateTo('/index');
	}

    logout() {
        this.#state.isLoggedIn = false;
        this.#state.token = '';
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

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});