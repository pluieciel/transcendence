import LoginView from './components/LoginView.js';
import MainView from './components/MainView.js';
import Router from './router.js';

class App {
    constructor() {
        this.state = {
            isLoggedIn: false,
            username: '',
        };

        this.routes = [
            { path: '/', component: LoginView },
            { path: '/game', component: MainView },
            { path: '*', component: LoginView }  // Default route
        ];

        this.router = new Router(this.routes);
    }

    login(username) {
        this.state.isLoggedIn = true;
        this.state.username = username;
        this.router.navigateTo('/game');
    }

    logout() {
        this.state.isLoggedIn = false;
        this.state.username = '';
        this.router.navigateTo('/');
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});