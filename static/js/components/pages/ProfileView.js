export default class ProfileView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.render();
		this.setButtons();
		this.addEventListeners();
		this.setProfileFields();
		if (!window.app.settings.fetched)
			window.app.getPreferences();
	}

	render() {
		this.container.innerHTML = `
			<header>
				<h1 id="pong">PONG</h1>
					<button id="customBtn" class="nav-btn">Custom</button>
					<button id="indexBtn" class="nav-btn">Index</button>
					<button id="creditsBtn" class="nav-btn">Credits</button>
					<button id="logoutBtn" class="nav-btn">Log out</button>
			</header>

			<div id="mainPage">
				<div class="profile-container">
					<div id="profile-content" class="profile userOutline">
						<h3 id="p-name">${this.username}</h3>
						<h3 id="p-elo">Loading...</h3>
						<h3 id="p-winrate">Loading...</h3>
						<h3 id="p-wl">Loading...</h3>
						<h3 id="p-tourn">Loading...</h3>
					</div>
					<div id="profile-settings" class="profile userOutline">
					</div>
				</div>
			</div>
			
			`;
		}

	async setProfileFields() {
		var	div = document.getElementById('profile-content');
		var name = document.getElementById("p-name");
		var elo = document.getElementById("p-elo");
		var ratio = document.getElementById("p-wl");
		var winrate = document.getElementById("p-winrate");
		var tourn = document.getElementById("p-tourn");
		let	avatarImg;
		
		try {
			const response = await fetch("/api/get/profile", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});
			
			const data = await response.json();
			


            const avatarUrl = await window.app.getAvatar(this.username);
			if (avatarUrl)
				avatarImg = `<img id="avatarImg" class="userOutline" src=${avatarUrl} alt="User Avatar" width="150" height="150"></img> `;

			if (data.success) {
				elo.innerHTML = "Elo: " + data["elo"];
				winrate.innerHTML = "Winrate: " + data["winrate"];
				ratio.innerHTML = "Ratio: " + data["wins"] + "/" + data["looses"];
				tourn.innerHTML = "Trophies: " + data["tourn_won"] + "<br>Tournaments played: " + data["tourn_joined"];
				if (data['display']) {
					let toInsert = " (" + data['display'] + ")";
					name.insertAdjacentHTML('beforeend', toInsert);
				}
			} else
				throw new Error("Request failure");
			if (avatarImg) {
				div.innerHTML = avatarImg + div.innerHTML;
			}
		} catch (error) {
			elo.innerHTML = "Failed to load elo";
			winrate.innerHTML = "Failed to load winrate";
			ratio.innerHTML = "Failed to load ratio";
			tourn.innerHTML = "Failed to load tournaments";
			console.error("An error occurred: ", error);
		}
	}

	setButtons() {
		const	index = document.getElementById('indexBtn');
		const	custom = document.getElementById('customBtn');
		const	credits = document.getElementById('creditsBtn');

		index.style['right'] = '295px';
		custom.style['right'] = '440px';
		credits.style['right'] = '150px';
	}

	addNavEventListeners() {
		const	index = document.getElementById('indexBtn');
		const	custom = document.getElementById('customBtn');
		const	credits = document.getElementById('creditsBtn');
		const	logoutBtn = document.getElementById('logoutBtn');

		logoutBtn.addEventListener("click", () => {
            window.app.chatBox.disconnect();
            window.app.logout();
        });

		custom.addEventListener("click", () => {
			window.app.router.navigateTo("/custom");
		});

		index.addEventListener("click", () => {
			window.app.router.navigateTo("/index");
		});

		credits.addEventListener("click", () => {
			window.app.router.navigateTo("/credits");
		});
	}
	
	addEventListeners() {
		this.addNavEventListeners();
	}
}
