import LoginView from './components/LoginView.js';
import MainView from './components/pages/MainView.js';
import SettingsView from './components/pages/SettingsView.js';
import SignUpAuthView from './components/login/SignUpOAuth.js';
import GameView from './components/GameView.js';
import Router from './router.js';

class App {
    constructor() {
		this.state = {
			isLoggedIn: sessionStorage.getItem('isLoggedIn') === 'true',
			username: sessionStorage.getItem('username') || '',
		};
		
		this.routes = [
			{ path: '/', component: LoginView },
            { path: '/index', component: MainView },
            { path: '/game', component: GameView },
            { path: '/settings', component: SettingsView },
            { path: '/signup/oauth', component: SignUpAuthView },
			{ path: '*', component: LoginView },
		]
        this.router = new Router(this.routes, this.state);
		window.app = this;
    }
    
    login(username) {
        this.state.isLoggedIn = true;
        this.state.username = username;
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('username', username);
        this.router.navigateTo('/index');
    }

    logout() {
        this.state.isLoggedIn = false;
        this.state.username = '';
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('username');
        this.router.navigateTo('/');
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});