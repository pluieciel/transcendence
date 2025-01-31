export default class ProfileView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.render();
		this.setProfileFields();
		if (!window.app.settings.fetched)
			window.app.getPreferences();
	}

	render() {
		this.container.innerHTML = `
			<header>
				<h1 id="pong">PONG</h1>
					<button id="settingsBtn">Settings</button>
					<button id="logoutBtn">Log out</button>
			</header>

			<div id="mainPage">
				<div class="welcome">
					<p>Welcome to Pong! Get ready to play!</p>
				</div>
				<div class ="content">
					<div class="profile redHover">
						<h2>Profile</h2>
						<h3 id="p-name">${this.username}</h3>
						<h3 id="p-elo">Loading...</h3>
						<h3 id="p-winrate">Loading...</h3>
						<h3 id="p-wl">Loading...</h3>
						<h3 id="p-tourn">Loading...</h3>
					</div>
				</div>
			</div>

        `;
    }

	async setProfileFields() {
		var name = document.getElementById("p-name");
		var elo = document.getElementById("p-elo");
		var ratio = document.getElementById("p-wl");
		var winrate = document.getElementById("p-winrate");
		var tourn = document.getElementById("p-tourn");

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
				name.innerHTML = `<img id="avatarImg" src=${avatarUrl} alt="User Avatar" width="30" height="30"></img> ` + this.username;

			if (data.success) {
				elo.innerHTML = "Elo: " + data["elo"];
				winrate.innerHTML = "Winrate: " + data["winrate"];
				ratio.innerHTML = "Ratio: " + data["wins"] + "/" + data["looses"];
				tourn.innerHTML = "Tournaments won: " + data["tourn_won"] + " played: " + data["tourn_joined"];
				if (data['display']) {
					let toInsert = " (" + data['display'] + ")";
					name.insertAdjacentHTML('beforeend', toInsert);
				}
			} else
				throw new Error("Request failure");
		} catch (error) {
			elo.innerHTML = "Failed to load elo";
			winrate.innerHTML = "Failed to load winrate";
			ratio.innerHTML = "Failed to load ratio";
			tourn.innerHTML = "Failed to load tournaments";
			console.error("An error occurred: ", error);
		}
	}
}
