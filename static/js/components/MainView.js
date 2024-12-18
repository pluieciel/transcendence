import ChatBox from './chat/ChatBox.js';
import Router from '../router.js';
import { gameinit } from './game/Main.js';

export default class MainView {
    constructor(container, appState) {
		this.container = container;
        this.username = appState.username;
        this.render();
        this.initComponents();
        this.addEventListeners();
		this.getElo();
    }

    render() {
        this.container.innerHTML = `
    <header>
        <h1>PONG</h1>
			<button id="settings">Settings</button>
			<button id="logoutBtn">Log out</button>
	</header>

	<div class="welcome">
        <p>Welcome to Pong! Get ready to play!</p>
    </div>
	<div class ="content">
		<div class="credits">
			<h2>Credits</h2>
			<p>
				Welcome to <strong>ft_transcendence</strong>,<br>
				the final project of the 42 common core curriculum!<br>
				This project is our version of the classic <em>Pong</em> game<br><br>
				Ressources used:<br>
				The whole project is running in docker <i class="fab fa-docker"></i><br>
				We're using nginx as our webserv <i class="fas fa-server"></i><br>
				Javascript <i class="fab fa-js"></i> is used for the Frontend<br>
				PostgreSQL for the Database <i class="fas fa-database"></i><br><br>
				Created by:<br>
				<a href="https://github.com/jlefonde" target="_blank" rel="noopener noreferrer">Joris Lefondeur</a><br>
				<a href="https://github.com/pluieciel" target="_blank" rel="noopener noreferrer">Yue Zhao</a><br>
				<a href="https://github.com/siul008" target="_blank" rel="noopener noreferrer">Julien Nunes</a><br>
				<a href="https://github.com/neutrou" target="_blank" rel="noopener noreferrer">Victor Algranti</a><br><br>
				We hope you enjoy exploring our project!
			</p>
			
		</div>
		<div class="game-buttons">
			<h2>PLAY!</h2>
			<button id="playAI">AI</button>
			<button id="rankedMatch">Ranked</button>
			<button id="quickMatch" class="nav-link" data-view="game">Quick Match</button>
			<button id="joinTournament">Join Tournament</button>
			<button id="createTournament">Create Tournament</button>
		</div>
		<div class="profile">
			<h2>Profile</h2>
			<h3 id="p-name"></h3>
			<h3 id="p-elo"></h3>
			<h3 id="p-winrate"></h3>
			<h3>Tournaments wins: 0</h3>
			</div>
			</div>
		<!-- ChatBox container -->
		<div id="chatBoxContainer"></div>
	</div>
        `;
    }

    showGame() {
		window.app.router.navigateTo('/game');
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

	async getElo() {
		try {
            // This is an async operation - waits for server response
            const response = await fetch('/api/get/elo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `${window.app.state.token}`
                },
                body: JSON.stringify({
                    username: this.username,
                })
            });
        
            const data = await response.json();
        
			var div = document.getElementById("p-elo");
            if (data.success) {
				div.innerHTML = "Elo: " + data.elo;
            } else {
				div.innerHTML = "Failed to load elo";
            }
        } catch (error) {
            // Handles any errors during the async operation
			console.error('An error occurred:', error);
        }
	}
}