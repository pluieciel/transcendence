import LoginView from "./components/pages/LoginView.js";
import MainView from "./components/pages/MainView.js";
import SettingsView from "./components/pages/SettingsView.js";
import LoginOAuth from "./components/login/LoginOAuth.js";
//import GameView from './components/GameView.js';
import Router from "./router.js";

class App {
    constructor() {
        this.routes = [
            { path: "/", component: LoginView },
            { path: "/index", component: MainView },
            //{ path: '/game', component: GameView },
            { path: "/settings", component: SettingsView },
            { path: "/login/oauth", component: LoginOAuth },
            { path: "*", component: LoginView },
        ];
        this.state = {
            isLoggedIn: sessionStorage.getItem("isLoggedIn") === "true",
            username: sessionStorage.getItem("username"),
        };
        this.avatarCache = {};
        this.ingame = sessionStorage.getItem("ingame") === "true";
        window.app = this;
        this.router = new Router(this.routes);
    }

    async getAvatar(username) {
        if (this.avatarCache[username]) {
            return this.avatarCache[username];
        }
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

    login(data) {
        this.state.isLoggedIn = true;
        this.state.username = data.username;
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("username", data.username);
        this.router.navigateTo("/index");
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

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded");
    window.app = new App();
});
