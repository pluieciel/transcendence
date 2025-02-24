export default class TournamentView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.init();
	}

	async init() {
		await window.app.getSettings();
		await this.render();
		this.addEventListeners();
		window.app.settings["tournament-game-size"] = "4";
		window.app.settings["tournament-game-mode"] = "classic";
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const host = window.location.host;
		const wsUrl = `${protocol}//${host}/ws/tournament/`;
		this.initializeWebSocket(wsUrl);
	}

	initializeWebSocket(wsUrl) {
		if (window.app.tournamentws) {
			window.app.tournamentws.close(); // Ensure previous connection is closed
		}

		window.app.tournamentws = new WebSocket(wsUrl);

		window.app.tournamentws.onmessage = (bla) => {
			const events = JSON.parse(bla.data);
			console.log(events);
			if (events.type === "tournament_update") {
				this.updatePlayersList(events.players);
				this.updateTournamentTree(events.games);
				console.log("Entered tournament update");
		
				const waitingRoomTotalPlayers = document.getElementById("waiting-room-total-players");
				waitingRoomTotalPlayers.innerHTML = `<i class="fa-solid fa-user"></i>&nbsp; ${events.players.length}/${events.size}`
		
				const waitingRoomTournamentGameMode = document.getElementById("waiting-room-tournament-game-mode");
				waitingRoomTournamentGameMode.innerHTML = events.mode === "classic" ? `<i class="fa-solid fa-star"></i>&nbsp; Classic` : `<i class="fa-solid fa-bolt"></i>&nbsp; Rumble`;
		
				const createCardTournament = document.getElementById("tournament-create-card");
				const roomCardTournament = document.getElementById("tournament-room-card");
				events.state === 'finished'? createCardTournament.style.display = 'flex' : createCardTournament.style.display = 'none';
				events.state !== 'finished'? roomCardTournament.style.display = 'flex' : roomCardTournament.style.display = 'none';
			}
			else if (events.type === "start_game") {
				const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
				const host = window.location.host;
				const wsGameUrl = `${protocol}//${host}/ws/game/`;
				this.initializeGameWebSocket(wsGameUrl);
			}
		};

		window.app.tournamentws.onerror = (error) => {
			console.error("WebSocket error:", error);
			alert("Connection error! Please try again.");
		};
	}

	updateTournamentTree(games) {
		const tournamentTreeContent = document.getElementById("tournament-tree-content");
		tournamentTreeContent.innerHTML = ''; // Clear previous content
	
		games.forEach(game => {
			const gameElement = document.createElement('div');
			gameElement.classList.add('tournament-game');
			gameElement.innerHTML = `
				<div class="tournament-game-round">Round ${game.round}</div>
				<div class="tournament-game-players">
					<div class="tournament-game-player">
						${game.player_left.user.username}
						${game.state === 'waiting' && game.player_left.ready ? '<span class="ready">(Ready)</span>' : ''}
						${game.state === 'finished' && game.winner !== game.player_left.user.username ? '<span class="lost">(Lost)</span>' : ''}
					</div>
					<div class="tournament-game-vs">vs</div>
					<div class="tournament-game-player">
						${game.player_right.user.username}
						${game.state === 'waiting' && game.player_right.ready ? '<span class="ready">(Ready)</span>' : ''}
						${game.state === 'finished' && game.winner !== game.player_right.user.username ? '<span class="lost">(Lost)</span>' : ''}
					</div>
				</div>
				<div class="tournament-game-score">
					Score: ${game.score_left} - ${game.score_right}
				</div>
				<div class="tournament-game-state">
					State: ${game.state}
				</div>
				<div class="tournament-game-winner">
					Winner: ${game.winner}
				</div>
			`;
			tournamentTreeContent.appendChild(gameElement);
		});
	}

	initializeGameWebSocket(wsUrl) {
		if (window.app.gamews) {
			window.app.gamews.close();
		}

		window.app.gamews = new WebSocket(wsUrl);

		window.app.gamews.onmessage = (event) => {
			const events = JSON.parse(event.data);
			if (events.message_type === "init") {
				this.redirectToGame(events);
			}
		};

		window.app.gamews.onopen = () => {
			console.log("Connected to server");
			window.app.ingame = true;
			sessionStorage.setItem("ingame", "true");
		};

		window.app.gamews.onclose = () => {
			console.log("Disconnected from server");
			window.app.ingame = false;
			sessionStorage.setItem("ingame", "false");
		};

		window.app.gamews.onerror = (error) => {
			console.error("WebSocket error:", error);
			alert("Connection error! Please try again.");
		};
	}

	async redirectToGame(events) {
		console.log("Redirecting to game");
		window.app.router.navigateTo("/game");
		window.app.tournamentws.close();
		const gameView = window.app.router.currentComponent;
		if (gameView && gameView.initializeGame) {
			gameView.initializeGame(events);
		}
	}

	updatePlayersList(players)
	{
		document.getElementById("waiting-room-container").innerHTML = '';
		let found = false;
		const joinButton = document.getElementById("join-button");
		const leaveButton = document.getElementById("leave-button");

		for (let player of players) {
			this.addUserToWaitingRoom(player.username, player.display, player.avatar);
			if (player.username === window.app.state.username) {
				found = true;
			}
		}
		if (found)
		{
			joinButton.style.display = 'none';
			leaveButton.style.display = 'block';
		}
		else
		{
			joinButton.style.display = 'block';
			leaveButton.style.display = 'none';
		}
	}

	sendAction(action) {
		if (window.app.tournamentws && window.app.tournamentws.readyState === WebSocket.OPEN) {
			console.log(`Sending action ${action}`); // Debug log
			window.app.tournamentws.send(
				JSON.stringify({
					action: action
				}),
			);
		}
	}

	sendCreateTournament(size, mode) {
		if (window.app.tournamentws && window.app.tournamentws.readyState === WebSocket.OPEN) {
			console.log(`Sending create tournament ${size} ${mode}`);
			window.app.tournamentws.send(
				JSON.stringify({
					action: 'create',
					size: size,
					mode : mode,
				}),
			);
		}
	}

	async render() {
		await window.app.renderHeader(this.container, "tournament");
		this.container.innerHTML += `
			<main>
				<div id="tournament-create-card" class="card">
					<h2 id="card-title"><i class="fa-solid fa-crown"></i> TOURNAMENT</h2>
						<div id="game-size">
							<div class="checkbox-button">
								<input type="checkbox" id="game-size-checkbox" class="checkbox">
								<div class="knobs">
									<span id="game-size-4"><i class="fa-solid fa-user"></i> 4</span>
									<span id="game-size-8"><i class="fa-solid fa-user"></i> 8</span>
								</div>
								<div class="layer"></div>
							</div>
						</div>
						<div id="game-mode">
							<div class="checkbox-button">
								<input type="checkbox" id="game-mode-checkbox" class="checkbox">
								<div class="knobs">
									<span id="game-mode-classic"><i class="fa-solid fa-star"></i> Classic</span>
									<span id="game-mode-rumble"><i class="fa-solid fa-bolt"></i> Rumble</span>
								</div>
								<div class="layer"></div>
							</div>
						</div>
					<button type="submit" id="create-button"><i class="fa-solid fa-sitemap"></i> Create</button>
				</div>
				<div id="tournament-room-card" class="card">
					<h2 id="card-title"><i class="fa-solid fa-crown"></i> TOURNAMENT</h2>
					<div id="tournament-room-content">
						<div id="waiting-room">
							<div id="waiting-room-info">
								<div id="waiting-room-total-players"></div>
								<div id="waiting-room-tournament-game-mode"><i class="fa-solid fa-bolt"></i>&nbsp; Rumble</div>
							</div>
							<div id="tournament-state"><i class="fa-solid fa-hourglass-half fa-spin"></i>&nbsp; Waiting for players...</div>
							<div id="waiting-room-content">
								<ul id="waiting-room-container"></ul>
							</div>
						</div>
						<button type="submit" id="join-button"><i class="fa-solid fa-user-plus"></i> Join</button>
						<button type="submit" id="leave-button"><i class="fa-solid fa-user-minus"></i> Leave</button>
					</div>
				</div>
				<div id="tournament-tree-card" class="card">
					<table id="tournament-tree">
						<tr id="winner-node">
							<td colspan="4">user8</td>
						</tr>
						<tr id="final-node">
							<td colspan="4">user3 vs user8</td>
						</tr>
						<tr id="semi-final-node">
							<td colspan="2">user2 vs user3</td>
							<td colspan="2">user5 vs user8</td>
						</tr>
						<tr id="quarter-node">
							<td>user1 vs user2</td>
							<td>user3 vs user4</td>
							<td>user5 vs user6</td>
							<td>user7 vs user8</td>
						</tr>
					</table>
				</div>
			</main>
		`;
	}

	truc() {
		return `
			<div class="game-history-item">
				<div id="game-history-middle">
					<div id="player-left-history-avatar">
						<button id="" data-redirect-to="/profiles/user2">
							<img src="/imgs/default_avatar.png" class="avatar player-avatar">
							<button id="" data-redirect-to="/profiles/user2">user2</button>
						</button>
					</div>
					<div id="game-middle-info">
						<div id="game-history-score">10 - 5</div>
						<i class="fa-solid fa-eye"></i>
					</div>
					<div id="player-right-history-avatar">
						<button id="" data-redirect-to="/profiles/user1">
							<img src="/imgs/default_avatar.png" class="avatar player-avatar">
							<button id="" data-redirect-to="/profiles/user1">user1</button>
						</button>
					</div>
				</div>
			</div>`
	}

	addEventListeners() {
		window.app.addNavEventListeners();
		this.addGameSizeCheckboxEventListeners();
		this.addGameModeCheckboxEventListeners();
		this.addCreateTournamentEventListeners();
		this.addJoinTournamentEventListeners();
		this.addLeaveTournamentEventListeners();
		this.addReadyButtonEventListeners();
	}

	addGameSizeCheckboxEventListeners() {
		const gameSizeCheckbox = document.getElementById("game-size-checkbox");
		gameSizeCheckbox.addEventListener("change", () => {
			window.app.settings["tournament-game-size"] = gameSizeCheckbox.checked ? "8" : "4";
		});
	}

	addGameModeCheckboxEventListeners() {
		const gameModeCheckbox = document.getElementById("game-mode-checkbox");
		gameModeCheckbox.addEventListener("change", () => {
			window.app.settings["tournament-game-mode"] = gameModeCheckbox.checked ? "rumble" : "classic";
		});
	}

	addCreateTournamentEventListeners() {
		const createButton = document.getElementById("create-button");
		createButton.addEventListener("click", () => {
			this.sendCreateTournament(window.app.settings["tournament-game-size"], window.app.settings["tournament-game-mode"]);
		});
	}

	addJoinTournamentEventListeners() {
		const joinButton = document.getElementById("join-button");
		joinButton.addEventListener("click", () => {
			this.sendAction('join');
		});
	}

	addLeaveTournamentEventListeners() {
		const leaveButton = document.getElementById("leave-button");
		leaveButton.addEventListener("click", () => {
			this.sendAction('leave');
		});
	}

	addReadyButtonEventListeners() {
		const leaveButton = document.getElementById("ready-button");
		leaveButton.addEventListener("click", () => {
			console.log("Ready button clicked");
			this.sendAction('ready');
		});
	}

	addUserToWaitingRoom(username, display_name, avatar) {
		const waitingRoom = document.getElementById('waiting-room-container');
		console.log(display_name);
		const row =  `
			<li>
				<img src="${avatar}" class="avatar tournament-player-avatar">
				<div class="tournament-waiting-player-name">${display_name ? display_name : username}</div>
			</li>`;

		// row =  `
		// 	<li>
		// 		<img src="${user['avatar_url']}" class="avatar tournament-player-avatar">
		// 		<div class="tournament-waiting-player-name">${user['name']}</div>
		// 	</li>`;

		waitingRoom.insertAdjacentHTML('beforeend', row);
	}
}