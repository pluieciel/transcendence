export default class ProfileView {
	constructor(container, params = {}) {
		this.container = container;
		this.username = params.username;
		this.init();
	}

	async init() {
		await window.app.getSettings();
		await this.render();
		window.app.initChat();
		await this.setProfile();
		await this.setGameHistory();
		await this.setAchievements();
		this.addEventListeners();
	}

	async render() {
		await window.app.renderHeader(this.container, "profile");
		this.container.innerHTML += `
			<main>
				<div id="profile-card" class="card">
					<div id="profile-card-header" class="profile-card-content">
						<div id="profile-card-header-left" class="profile-card-content">
							<h5 id="card-title"><i class="fa-solid fa-star"></i> Classic</h5>
							<div class="profile-card-stats">
								<ul>
									<li>
										<div id="classic-total-played" class="stat-value"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
										<div class="stat-label">Total Played</div>
									</li>
									<li>
										<div id="classic-wins" class="stat-value"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
										<div class="stat-label">Wins</div>
									</li>
									<li>
										<div id="classic-winrate" class="stat-value"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
										<div class="stat-label">Winrate</div>
									</li>
									<li>
										<div id="classic-elo" class="stat-value"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
										<div class="stat-label">Elo</div>
									</li>
									<li>
										<div id="classic-rank" class="stat-value"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
										<div class="stat-label">Rank</div>
									</li>
								</ul>
							</div>
						</div>
						<div id="profile-card-header-middle"></div>
						<div id="profile-card-header-right">
							<h5 id="card-title"><i class="fa-solid fa-bolt"></i> Rumble</h5>
							<div class="profile-card-stats">
								<ul>
									<li>
										<div id="rumble-rank" class="stat-value"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
										<div class="stat-label">Rank</div>
									</li>
									<li>
										<div id="rumble-elo" class="stat-value"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
										<div class="stat-label">Elo</div>
									</li>
									<li>
										<div id="rumble-winrate" class="stat-value"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
										<div class="stat-label">Winrate</div>
									</li>
									<li>
										<div id="rumble-wins" class="stat-value"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
										<div class="stat-label">Wins</div>
									</li>
									<li>
										<div id="rumble-total-played" class="stat-value"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
										<div class="stat-label">Total Played</div>
									</li>
								</ul>
							</div>
						</div>
					</div>
					<div id="profile-card-body">
						<div id="profile-card-body-left">
							<div id="profile-card-tournaments" class="profile-card-content">
								<h5 id="card-title"><i class="fa-solid fa-crown"></i> Tournaments</h5>
								<div class="profile-card-stats">
									<ul>
										<li>
											<div id="tournament-total-participated" class="stat-value"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
											<div class="stat-label">Total Participated</div>
										</li>
										<li>
											<div id="tournament-top-1" class="stat-value"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
											<div class="stat-label">Top 1</div>
										</li>
										<li>
											<div id="tournament-winrate" class="stat-value"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
											<div class="stat-label">Winrate</div>
										</li>
										<li>
											<div id="tournament-max-streak" class="stat-value"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
											<div class="stat-label">Max Streak</div>
										</li>
									</ul>
								</div>
							</div>
							<div id="profile-card-achievements" class="profile-card-content">
								<div id="achievements-header">
									<h5 id="card-title"><i class="fa-solid fa-trophy"></i> Achievements</h5>
									<i id="profile-to-achievements" class="fa-solid fa-arrow-up-right-from-square"></i>
								</div>
								<div id="profile-achievements-content">
									<div id="achievements-content">
										<div id="achievements-item-container"></div>
									</div>
									<div id="achievements-stats" class="profile-card-stats">
										<ul>
											<li>
												<div id="achievements-total-earned" class="stat-value"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
												<div class="stat-label">Total Earned</div>
											</li>
											<li>
												<div id="achievements-completion" class="stat-value"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
												<div class="stat-label">Completion</div>
											</li>
										</ul>
									</div>
								</div>
							</div>
						</div>
						<div id="profile-card-game-history" class="profile-card-content">
							<h5 id="card-title"><i class="fa-solid fa-clock-rotate-left"></i> Game History</h5>
							<div id="game-history-content">
								<div id="game-history-item-container"></div>
							</div>
						</div>
					</div>
				</div>
			</main>
			<div id="chatBoxContainer"></div>
		`;
	}

	addEventListeners() {
		window.app.addNavEventListeners();
		this.addRedirectToAchievementsListener();
	}

	addRedirectToAchievementsListener() {
		const redirectToAchievements = document.getElementById('profile-to-achievements');

		redirectToAchievements.addEventListener('click', () => {
			window.app.router.navigateTo(`/achievements/${this.username}`);
		});
	}

	getRankField(rank) {
		switch (rank) {
			case 1:
				return `<i class="fa-solid fa-medal" style="color: #FFD700"></i> ` + rank;
			case 2:
				return `<i class="fa-solid fa-medal" style="color: #C0C0C0"></i> ` + rank;
			case 3:
				return `<i class="fa-solid fa-medal" style="color: #CD7F32"></i> ` + rank;
			default:
				return "#" + rank;
		}
	}

	async setProfile() {
		try {
			const response = await fetch(`/api/profiles/${this.username}/`);
	
			const data = await response.json();
			if (data.success) {
				const profileCardHeaderMiddle = document.getElementById('profile-card-header-middle');
				const classicTotalPlayed = document.getElementById('classic-total-played');
				const classicWins = document.getElementById('classic-wins');
				const classicWinrate = document.getElementById('classic-winrate');
				const classicElo = document.getElementById('classic-elo');
				const classicRank = document.getElementById('classic-rank');
				const rumbleTotalPlayed = document.getElementById('rumble-total-played');
				const rumbleWins = document.getElementById('rumble-wins');
				const rumbleWinrate = document.getElementById('rumble-winrate');
				const rumbleElo = document.getElementById('rumble-elo');
				const rumbleRank = document.getElementById('rumble-rank');
				const tournamentTotalParticipated = document.getElementById('tournament-total-participated');
				const tournamentTop1 = document.getElementById('tournament-top-1');
				const tournamentWinrate = document.getElementById('tournament-winrate');
				const tournamentMaxStreak = document.getElementById('tournament-max-streak');

				let middleInfo = `
					<img src="${data.avatar_url}" id="profile-card-avatar" class="avatar">
					<div id="profile-card-username">${data.username}${data.is_42_user ? "&nbsp;<img src=\"/imgs/42_logo.png\" id=\"oauth-logo\"></img>" : ""}</div>`
				if (data.display_name)
					middleInfo += `<div id="profile-card-display-name">${data.display_name}</div>`
				profileCardHeaderMiddle.insertAdjacentHTML('beforeend', middleInfo);

				classicTotalPlayed.innerHTML = data.classic.total_played;
				classicWins.innerHTML = data.classic.wins;
				classicWinrate.innerHTML = data.classic.winrate;
				classicElo.innerHTML = data.classic.elo;
				classicRank.innerHTML = this.getRankField(data.classic.rank);
				rumbleTotalPlayed.innerHTML = data.rumble.total_played;
				rumbleWins.innerHTML = data.rumble.wins;
				rumbleWinrate.innerHTML = data.rumble.winrate;
				rumbleElo.innerHTML = data.rumble.elo;
				rumbleRank.innerHTML = this.getRankField(data.rumble.rank);
				tournamentTotalParticipated.innerHTML = data.tournament.total_participated;
				tournamentTop1.innerHTML = data.tournament.top_1;
				tournamentWinrate.innerHTML = data.tournament.winrate;
				tournamentMaxStreak.innerHTML = data.tournament.max_streak;
			}
			else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
				window.app.logout();
			}
			else {
				console.error(data.message);
			}
		}
		catch (e) {
			console.error(e);
		}
	}

	async setGameHistory() {
		try {
			const response = await fetch(`/api/profiles/${this.username}/history/`);
	
			const data = await response.json();
			if (data.success) {
				Object.keys(data).forEach(key => {
					if (key.startsWith('game_history_'))
						this.addGameHistoryToGameHistories(data[key]);
				});
			}
			else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
				window.app.logout();
			}
			else {
				console.error(data.message);
			}
		}
		catch (e) {
			console.error(e);
		}
	}

	async setAchievements() {
		try {
			const response = await fetch(`/api/profiles/${this.username}/achievements/`);
	
			const data = await response.json();
			if (data.success) {
				const totalEarned = document.getElementById('achievements-total-earned');
				const completion = document.getElementById('achievements-completion');

				totalEarned.innerHTML = data.total_earned
				completion.innerHTML = data.completion

				data.achievements.forEach(achievement => this.addAchievementToAchievements(achievement));
			}
			else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
				window.app.logout();
			}
			else {
				console.error(data.message);
			}
		}
		catch (e) {
			console.error(e);
		}
	}

	addAchievementToAchievements(achievement) {
		const itemContainer = document.getElementById('achievements-item-container');
		
		const item = `
			<div class="achievement-item">
				<div class="achievement-icon"><i class="${achievement.icon}"></i></div>	
				<div class="achievement-title">${achievement.name}</div>
			</div>`

		itemContainer.insertAdjacentHTML("beforeend", item);
	}

	getHistoryAvatar(player) {
		let history_avatar = `<img src="${player['avatar_url']}" class="avatar player-avatar">`
		if (player['is_winner'])
			history_avatar += `<div class="player-winner">WINNER</div>`
		else
			history_avatar += `<div class="player-loser">LOSER</div>`
		return history_avatar;
	}

	getEloChangeIcon(gameHistory) {
		if ((gameHistory['player_left']['is_winner'] && gameHistory['player_left']['username'] === this.username) || 
			(gameHistory['player_right']['is_winner'] && gameHistory['player_right']['username'] === this.username))
			return `+ `
		else
			return `- `
	}

	addGameHistoryToGameHistories(gameHistory) {
		const itemContainer = document.getElementById('game-history-item-container');
		const leftProfileButtonId = `game-history-${gameHistory['id']}-left-name`;
		const rightProfileButtonId = `game-history-${gameHistory['id']}-right-name`;
		const leftAvatarButtonId = `game-history-${gameHistory['id']}-left-avatar`;
		const rightAvatarButtonId = `game-history-${gameHistory['id']}-right-avatar`;
		
		const item = `
			<div class="game-history-item">
				<div id="game-history-game-type">
					${gameHistory['game_mode'] == "classic" ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-solid fa-bolt"></i>'}
				</div>
				<div id="player-left-history-name">
					${gameHistory['player_left']['is_opponent'] ? 
						`<button id="${leftProfileButtonId}" data-redirect-to="${gameHistory['player_left']['username']}">${gameHistory['player_left']['name']}</button>` :
						gameHistory['player_left']['name']}
				</div>
				<div id="game-history-middle">
					<div id="player-left-avatar">
						${gameHistory['player_left']['is_opponent'] ? 
							`<button id="${leftAvatarButtonId}" data-redirect-to="${gameHistory['player_left']['username']}">${this.getHistoryAvatar(gameHistory['player_left'])}</button>` :
							this.getHistoryAvatar(gameHistory['player_left'])}
					</div>
					<div id="game-middle-info">
						<div id="game-score">${gameHistory['score_left']} - ${gameHistory['score_right']}</div>
						<div id="game-history-time">${gameHistory['time_since_game']}</div>
					</div>
					<div id="player-right-avatar">
						${gameHistory['player_right']['is_opponent'] ? 
							`<button id="${rightAvatarButtonId}" data-redirect-to="${gameHistory['player_right']['username']}">${this.getHistoryAvatar(gameHistory['player_right'])}</button>` :
							this.getHistoryAvatar(gameHistory['player_right'])}
					</div>
				</div>
				<div id="player-right-history-name">
					${gameHistory['player_right']['is_opponent'] ? 
						`<button id="${rightProfileButtonId}" data-redirect-to="${gameHistory['player_right']['username']}">${gameHistory['player_right']['name']}</button>` :
						gameHistory['player_right']['name']}
				</div>
				<div id="game-history-elo-change">${this.getEloChangeIcon(gameHistory)}${gameHistory['elo_change']}</div>
			</div>`;
		itemContainer.insertAdjacentHTML("beforeend", item);

		[leftProfileButtonId, rightProfileButtonId, leftAvatarButtonId, rightAvatarButtonId].forEach(btnId => {
			const button = document.getElementById(btnId);
			if (button) {
				button.addEventListener('click', (e) => {
					const username = e.currentTarget.dataset.redirectTo;
					window.app.router.navigateTo(`/profiles/${username}`);
				});
			}
		});
	}
}