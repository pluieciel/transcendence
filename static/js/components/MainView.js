import ChatBox from './chat/ChatBox.js';
import { gameinit } from './game/Main.js';

export default class MainView {
    constructor(container, appState) {
        this.container = container;
        this.username = appState.username;
        this.render();
        this.initComponents();
        this.addEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div>
                <!-- Logout button -->
                <button id="logoutBtn"
                    class="btn btn-danger position-absolute top-0 end-0 m-3 fw-bold">
                    Log Out
                </button>

                <!-- Navigation -->
                <nav class="nav-container">
                    <div class="nav-links d-flex justify-content-center">
                        <a href="#" class="nav-link" data-view="game">Game</a> |
                        <a href="#" class="nav-link" data-view="leaderboard">Leaderboard</a>
                    </div>
                </nav>

                <!-- Main content -->
                <div id="mainContent" class="position-relative w-100">
                    <h1>Welcome, ${this.username}</h1>
                </div>

                <!-- ChatBox container -->
                <div id="chatBoxContainer"></div>
            </div>
        `;
    }

    showGame() {
        const mainContent = this.container.querySelector('#mainContent');
        new gameinit(mainContent);
    }

    showLeaderboard() {
        const mainContent = this.container.querySelector('#mainContent');
        mainContent.innerHTML = '<h2>Leaderboard View</h2>';
        // Add any additional logic to initialize the leaderboard view
    }

    initComponents() {
        // Initialize ChatBox
        const chatBoxContainer = this.container.querySelector('#chatBoxContainer');
        this.chatBox = new ChatBox(chatBoxContainer, this.username);
    }

    addEventListeners() {
        // Logout button
        const logoutBtn = this.container.querySelector('#logoutBtn');
        logoutBtn.addEventListener('click', () => {
            window.app.logout();
        });

        // Navigation links
        const navLinks = this.container.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.dataset.view;
                if (view === 'game') {
                    this.showGame();
                } else if (view === 'leaderboard') {
                    this.showLeaderboard();
                }
            });
        });
    }
}