export default class LeaderboardView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.init();
	}

	async init() {
		await window.app.getSettings();
		this.render();
		window.app.addNavEventListeners();
		this.addContent();
	}

	render() {
		window.app.renderHeader(this.container, "leaderboard");
		this.container.innerHTML += `
			<main>
				<div id="leaderboard-card" class="card">
					<h2 id="card-title"><i class="fa-solid fa-medal"></i> LEADERBOARD</h2>
					<div id="leaderboard-content">
						<div class="lb-card-header">
							<div class="lb-card-pos lb-card-att"><i class="fa-solid fa-ranking-star"></i> Rank</div>
							<div class="lb-card-user lb-card-att"><i class="fa-solid fa-user"></i> User</div>
							<div class="lb-card-elo lb-card-att"><i class="fa-solid fa-chart-line"></i> Elo</div>
							<div class="lb-card-winrate lb-card-att"><i class="fa-solid fa-percent"></i> Winrate</div>
							<div class="lb-card-games lb-card-att"><i class="fa-solid fa-gamepad"></i> Games</div>
						</div>
						<div id="leaderboard-table"></div>
					</div>
				</div>
			</main>
		`;
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
		let		card = "";
		const	lb = document.getElementById('leaderboard-table');
		
		card += "<div id=\"lb-card-" + place + "\"class=\"lb-card\">";
		card += "<div class=\"lb-card-pos lb-card-att\">" + place + "</div>";
		if (data['avatar'])
			card += "<div class=\"lb-card-user lb-card-att\"><img class=\"lb-card-avatar\" src=\"" + data['avatar'] + "\"></img> &nbsp;&nbsp;" + data['username'] + "</div>";
		else
			card += "<div class=\"lb-card-user lb-card-att\">" + data['username'] + "</div>";
		card += "<div class=\"lb-card-elo lb-card-att\">" + data['elo'] + "</div>";
		card += "<div class=\"lb-card-winrate lb-card-att\">" + data['winrate'] + "</div>";
		card += "<div class=\"lb-card-games lb-card-att\">" + data['games'] + "</div>";
		card += "</div>";

		lb.insertAdjacentHTML("beforeend", card);
	}
}
