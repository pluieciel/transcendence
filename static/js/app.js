import LoginView from './components/LoginView.js';
import MainView from './components/pages/MainView.js';
import SettingsView from './components/pages/SettingsView.js';
import SignUpAuthView from './components/login/SignUpOAuth.js';
import GameView from './components/GameView.js';
import Router from './router.js';

class App {
    constructor() {
		
		this.routes = [
			{ path: '/', component: LoginView },
            { path: '/index', component: MainView },
            { path: '/game', component: GameView },
            { path: '/settings', component: SettingsView },
            { path: '/signup/oauth', component: SignUpAuthView },
			{ path: '*', component: LoginView },
		]
        this.state = {
            isLoggedIn: sessionStorage.getItem('isLoggedIn') === 'true',
            token: sessionStorage.getItem('token') || '',
        };
        
		window.app = this;
        this.router = new Router(this.routes);

    }
    
    login(data) {
        this.state.isLoggedIn = true;
        this.state.token = data.token;
        //console.log(this.state.token);
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('token', this.state.token);
        this.router.navigateTo('/index');
    }

    logout() {
        this.state.isLoggedIn = false;
        this.state.username = '';
        sessionStorage.clear();
        this.router.navigateTo('/');
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});