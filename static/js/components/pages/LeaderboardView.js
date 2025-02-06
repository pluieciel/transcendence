export default class LeaderboardView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.init();
	}

	async init() {
		this.render();
		this.addEventListeners();
		await this.getSettings();
		this.addContent();
	}
	
	async getSettings() {
		if (!window.app.settings['fetched'])
			await window.app.getPreferences();
		if (window.app.settings.is_admin) {
			const adminButton = document.getElementById("admin-button");
			adminButton.style.display = "block";
		}
	}

	render() {
		this.container.innerHTML = `
				<header>
				<h1 id="pong">P 
					<button id="credit-button">
						<i class="fa-solid fa-table-tennis-paddle-ball fa-xs"></i>
					</button>
					 N G
				</h1>
				<div id="nav-buttons">
					<button class="nav-button" id="play-button">
						<i class="fa-solid fa-gamepad fa-xl"></i>Play
					</button>
					<button class="nav-button" id="customize-button">
						<i class="fa-solid fa-palette fa-xl"></i>Customize
					</button>
					<button class="nav-button nav-button-disabled" id="leaderboard-button">
						<i class="fa-solid fa-medal fa-xl"></i>Leaderboard
					</button>
					<button class="nav-button" id="achievements-button">
						<i class="fa-solid fa-trophy fa-xl"></i>Achievements
					</button>
					<button class="nav-button" id="profile-button">
						<i class="fa-solid fa-user fa-xl"></i>Profile
					</button>
					<button class="nav-button" id="admin-button">
						<i class="fa-solid fa-user-tie fa-xl"></i>Admin
					</button>
					<button class="nav-button" id="logout-button">
						<i class="fa-solid fa-right-from-bracket fa-xl"></i>Log Out
					</button>
				</div>
			</header>
			<div id="leaderboard-page-container">
				<div id="leaderboard-content" class="userOutline">
					<h2 id="leaderboard-title">Leaderboard</h2>
						<div class="lb-card-header">
							<div class="lb-card-pos lb-card-att round-left">Rank</div>
							<div class="lb-card-user lb-card-att">User</div>
							<div class="lb-card-elo lb-card-att">Elo</div>
							<div class="lb-card-winrate lb-card-att">Winrate</div>
							<div class="lb-card-games lb-card-att">Games</div>
							<div class="lb-card-icon lb-card-att round-right">Profile</div>
						</div>
						<div id="leaderboard-table">
						</div>
						</div>
						</div>
						`;
	}
						// <div class="lb-card">
						// 	<div class="lb-card">
						// 	<div class="lb-card-pos lb-card-att">1</div>
						// 	<div class="lb-card-user lb-card-att"><img class="lb-card-avatar" src="https://cdn.intra.42.fr/users/6256bf3b76f8634f1e0df573022b0b72/valgrant.JPG"></img> valgrant</div>
						// 	<div class="lb-card-elo lb-card-att">9999</div>
						// 	<div class="lb-card-winrate lb-card-att">100%</div>
						// 	<div class="lb-card-games lb-card-att">69420</div>
						// 	<div class="lb-card-icon lb-card-att"><i class="fa-solid fa-user fa-xs"></i></div>
						// </div>

	addNavEventListeners() {
		const creditButton = document.getElementById("credit-button");
		const playButton = document.getElementById("play-button");
		const customizeButton = document.getElementById("customize-button");
		const leaderboardButton = document.getElementById("leaderboard-button");
		const achievementsButton = document.getElementById("achievements-button");
		const profileButton = document.getElementById("profile-button");
		const adminButton = document.getElementById("admin-button");
		const logoutButton = document.getElementById("logout-button");

		creditButton.addEventListener("click", () => {
			window.app.router.navigateTo("/credits");
		});

		playButton.addEventListener("click", () => {
			window.app.router.navigateTo("/index");
		});

		customizeButton.addEventListener("click", () => {
			window.app.router.navigateTo("/customize");
		});
		
		leaderboardButton.addEventListener("click", () => {
			window.app.router.navigateTo("/leaderboard");
		});

		achievementsButton.addEventListener("click", () => {
			window.app.router.navigateTo("/achievements");
		});

		profileButton.addEventListener("click", () => {
			window.app.router.navigateTo("/profile");
		});

		adminButton.addEventListener("click", () => {
			window.app.router.navigateTo("/admin");
		});

		logoutButton.addEventListener("click", () => {
			window.app.chatBox.disconnect();
			window.app.logout();
		});
	}


	addEventListeners() {
		this.addNavEventListeners();
	}

	async addContent() {
		try {
			const response = await fetch(`/api/get/leaderboard`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});
	
			const data = await response.json();
	
			if (data['success']) {
				console.log(data['users']);
				let i = 0;
				while (i < data.users.length)
					this.addUserToLB(data.users[i], ++i);
				document.getElementById('lb-card-1').classList.add('lb-card-first');
				let cardid = "lb-card-" + i;
				document.getElementById(cardid).classList.add('lb-card-last');
				
			}
			else {
				console.log(data['message']);
			}
		}
		catch (e) {
			console.error(e);
		}
	}

	addUserToLB(data, place) {
		let	card = "";
		const	lb = document.getElementById('leaderboard-table');
		
		card += "<div id=\"lb-card-" + place + "\"class=\"lb-card\">";
		card += "<div class=\"lb-card-pos lb-card-att\">" + place + "</div>";
		if (data['avatar'])
			card += "<div class=\"lb-card-user lb-card-att\"><img class=\"lb-card-avatar\" src=\"" + data['avatar'] + "\"></img>  " + data['username'] + "</div>";
		else
			card += "<div class=\"lb-card-user lb-card-att\">" + data['username'] + "</div>";
		card += "<div class=\"lb-card-elo lb-card-att\">" + data['elo'] + "</div>";
		card += "<div class=\"lb-card-winrate lb-card-att\">" + data['winrate'] + "</div>";
		card += "<div class=\"lb-card-games lb-card-att\">" + data['games'] + "</div>";
		card += "<div class=\"lb-card-icon lb-card-att\"><i class=\"fa-solid fa-user fa-xl\"></i></div>";
		card += "</div>";

		lb.innerHTML += card;
	}
}
