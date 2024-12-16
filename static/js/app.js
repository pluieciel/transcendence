import LoginView from './components/LoginView.js';
import MainView from './components/MainView.js';
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
			{ path: '*', component: LoginView },  // Default route
		]
        this.state = {
            isLoggedIn: sessionStorage.getItem('isLoggedIn') === 'true',
            username: sessionStorage.getItem('username') || '',
        };
        
		window.app = this;
        this.router = new Router(this.routes, this.state);

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