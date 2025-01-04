import ChatBox from '../chat/ChatBox.js';

export default class MainView {
    constructor(container, appState) {
		this.container = container;
        this.username = appState.username;
        this.render();
		this.setProfileFields();
        this.initComponents();
        this.addEventListeners();
    }

    render() {
        this.container.innerHTML = `
    <header>
        <h1>PONG</h1>
			<button id="settingsBtn">Settings</button>
			<button id="logoutBtn">Log out</button>
	</header>

	<div class="welcome">
        <p>Welcome to Pong! Get ready to play!</p>
    </div>
	<div class="content">
		<div class="credits">
			<h2>Credits</h2>
			<p>
				Welcome to <strong>ft_transcendence</strong>,<br>
				the final project of the 42 common core curriculum!<br>
				This project is our version of the classic <b>Pong</b> game<br><br>
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
			<h3 id="p-name">Loading...</h3>
			<h3 id="p-elo">Loading...</h3>
			<h3 id="p-winrate">Loading...</h3>
			<h3 id="p-tourn">Loading...</h3>
		</div>
	</div>
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
    }

    initComponents() {
        const chatBoxContainer = this.container.querySelector('#chatBoxContainer');
        this.chatBox = new ChatBox(chatBoxContainer, this.username);
    }

    addEventListeners() {
        const logoutBtn = this.container.querySelector('#logoutBtn');
        const settings = this.container.querySelector('#settingsBtn');
        
		logoutBtn.addEventListener('click', () => {
            window.app.logout();
        });

		settings.addEventListener('click', () => {
			window.app.router.navigateTo('/settings');
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

	async setProfileFields() {
		var	name_div = document.getElementById("p-name");
		var elo_div = document.getElementById("p-elo");
		var winrate_div = document.getElementById("p-winrate");
		var tourn_div = document.getElementById("p-tourn");

		if (this.username.slice(-2) === "42") {
			const img = document.createElement('img');
			img.src = '../../../imgs/42.png';
			img.alt = '42';
			img.style.width = '20px';
			img.style.marginLeft = '5px';
			name_div.innerHTML = this.username.substring(0, this.username.length - 2);
			name_div.appendChild(img);
		} else {
			name_div.innerHTML = this.username;
		}
		try {
            const response = await fetch('/api/get/profile', {
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
        
            if (data.success) {
				elo_div.innerHTML = "Elo: " + data['elo'];
				winrate_div.innerHTML = "Winrate: " + data['winrate'];
				tourn_div.innerHTML = "Tournaments won: " + data['tourn'];
			} else {
				elo_div.innerHTML = "Failed to load elo";
				winrate_div.innerHTML = "Failed to load winrate";
				tourn_div.innerHTML = "Failed to load tournaments";
            }
        } catch (error) {
			elo_div.innerHTML = "Failed to load elo";
			winrate_div.innerHTML = "Failed to load winrate";
			tourn_div.innerHTML = "Failed to load tournaments";
			console.error('An error occurred: ', error);
        }
	}
}