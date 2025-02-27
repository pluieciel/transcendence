export default class TournamentView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.init();
		this.intervalStarting = null;
		this.intervalReady = null;

	}

	async init() {
		await window.app.getSettings();
		await this.render();
		window.app.initChat();
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
			window.app.tournamentws.close();
			window.app.tournamentws = undefined;
		}

		window.app.tournamentws = new WebSocket(wsUrl);

		window.app.tournamentws.onmessage = (bla) => {
			const events = JSON.parse(bla.data);
			
			if (events.type === "tournament_update") {
				this.clearTree();
				this.updatePlayersList(events.players);
				if (this.intervalStarting)
				{
					clearInterval(this.intervalStarting);
					this.intervalStarting = null;
				}
				if (this.intervalReady)
				{
					clearInterval(this.intervalReady);
					this.intervalReady = null;
				}			
		
				const waitingRoomTotalPlayers = document.getElementById("waiting-room-total-players");
				waitingRoomTotalPlayers.innerHTML = `<i class="fa-solid fa-user"></i>&nbsp; ${events.players.length}/${events.size}`
		
				const waitingRoomTournamentGameMode = document.getElementById("waiting-room-tournament-game-mode");
				waitingRoomTournamentGameMode.innerHTML = events.mode === "classic" ? `<i class="fa-solid fa-star"></i>&nbsp; Classic` : `<i class="fa-solid fa-bolt"></i>&nbsp; Rumble`;
		
				const createCardTournament = document.getElementById("tournament-create-card");
				const roomCardTournament = document.getElementById("tournament-room-card");
				events.state === 'finished'? createCardTournament.style.display = 'flex' : createCardTournament.style.display = 'none';
				events.state !== 'finished'? roomCardTournament.style.display = 'flex' : roomCardTournament.style.display = 'none';
				
				
				document.getElementById('forfeit-button').style.display = 'none';
				document.getElementById('leave-button').style.display = 'none';
				document.getElementById('ready-button').style.display = 'none';
				document.getElementById('join-button').style.display = 'none';

				let inTournament = false;
				let isReady = false;
				let isLost = false;
				let isWin = false;
				console.log(events);
				if (events.players)
				{
					events.players.forEach(player => 
						{
							if (player.username === window.app.state.username)
							{
								isReady = player.ready;
								isLost = player.lost;
								isWin = player.win;
								
								inTournament = !isLost;
							}
						}
					);
				}
				if (events.state == 'waiting')
				{
					document.getElementById('tournament-state').innerHTML = `<i class="fa-solid fa-hourglass-half fa-spin"></i>&nbsp; Waiting for players...`
					if (inTournament)
					{
						document.getElementById('join-button').style.display = 'none';
						document.getElementById('leave-button').style.display = 'block';
					}
					else
					{
						document.getElementById('leave-button').style.display = 'none';
						document.getElementById('join-button').style.display = 'block';
					}
					document.getElementById('ready-button').style.display = 'none';
					document.getElementById('forfeit-button').style.display = 'none';

				}
				else if (events.state == 'starting')
				{
					this.startingTournamentTimer(events.start_time)
					this.intervalStarting = setInterval(this.startingTournamentTimer, 1000, events.start_time);
					if (inTournament)
					{
						document.getElementById('leave-button').style.display = 'block';
					}
					else
					{
						document.getElementById('leave-button').style.display = 'none';
					}
					document.getElementById('forfeit-button').style.display = 'none';
					document.getElementById('join-button').style.display = 'none';
				}
				else if (events.state == 'playing')
				{
					
					document.getElementById('tournament-state').innerHTML = `<i class="fa-solid fa-gamepad"></i> Tournament in progress`;
					if (inTournament)
					{
						
						document.getElementById('forfeit-button').style.display = 'block';
						document.getElementById('leave-button').style.display = 'none';
						if (!isReady && !isWin)
						{
							
							document.getElementById('ready-button').style.display = 'block';
							document.getElementById('ready-button').disabled = false;
							this.startingReadyTimer(events.give_up_end_time);
							this.intervalReady = setInterval(this.startingReadyTimer, 1000, events.give_up_end_time);
						}
						else if (isReady && !isWin)
						{
							document.getElementById('ready-button').disabled = true;
							document.getElementById('ready-button').innerHTML = `<i class="fa-regular fa-circle-check"></i> You are ready`;
						}
						else if (isWin)
						{
							document.getElementById('ready-button').disabled = true;
							document.getElementById('ready-button').style.display = 'none';
							document.getElementById('forfeit-button').style.display = 'none';
						}

					}
				}
				let gameSize = 0;
				if (events.state != 'playing')
				{
					if (events.games.length == '3')
					{
						document.getElementById("tournament-quarter-final").style.display = 'none';
						gameSize = 4;
					}
					else if (events.games.length == '7')
					{
						document.getElementById("tournament-quarter-final").style.display = 'flex';
						gameSize = 8;
					}
					else
					{
						document.getElementById("tournament-quarter-final").style.display = 'flex';
						gameSize = 8;
					}
				}
				else if (events.size == 8)
				{
					document.getElementById("tournament-quarter-final").style.display = 'flex';
					gameSize = 8;
				}
				else if (events.size == 4)
				{
					document.getElementById("tournament-quarter-final").style.display = 'none';
					gameSize = 4;
				}
				
				if (gameSize == 8)
				{
					let index = 0;
					let round = '';
					events.games.forEach(game => 
					{
						if (game.round == 1 && round != 'quarter')
						{
							index = 0
							round = 'quarter';
						}
						else if (game.round == 2 && round != 'semi')
						{
							round = 'semi';
							index = 0
						}
						else if (game.round == 3 && round != 'final')
						{
							round = 'final';
							index = 0;
						}
						this.displayGame(game, round, index++);
					});
				}
				else if (gameSize == 4)
				{
					let index = 0;
					let round = '';
					events.games.forEach(game => 
					{
						if (game.round == 1 && round != 'semi')
						{
							round = 'semi';
							index = 0
						}
						else if (game.round == 2 && round != 'final')
						{
							round = 'final';
							index = 0;
						}
						this.displayGame(game, round, index++);
					});
				}
				if (events.winner)
				{
					this.displayWinner(events.winnerName, events.winnerUsername, events.winnerAvatar);
				}
			}
			else if (events.type === "start_game") {
				const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
				const host = window.location.host;
				const wsGameUrl = `${protocol}//${host}/ws/game/`;
				if (window.app.tournamentws)
				{
					window.app.tournamentws.close();
					window.app.tournamentws = undefined;
				}
				this.initializeGameWebSocket(wsGameUrl);
			}
		};

		window.app.tournamentws.onerror = (error) => {
			console.error("WebSocket error:", error);
		};
	}



	startingTournamentTimer(start_time)
	{
		const timerElement = document.getElementById('tournament-state')
		const currentTime = Date.now(); 
		
		const startTimeInMilliseconds = start_time * 1000; 
		const remainingTime = Math.max(0, Math.floor((startTimeInMilliseconds - currentTime) / 1000));
		
		if (remainingTime < 0)
		{
			if (this.intervalStarting)
			{
				clearInterval(this.intervalStarting);
				this.intervalStarting = null;
				return ;
			}	
		}
		const minutes = Math.floor(remainingTime / 60);
		const seconds = remainingTime % 60;
		timerElement.innerHTML = `<i class="fa-solid fa-clock"></i> Tournament starting in : ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
	}

	startingReadyTimer(giveUpTime)
	{
		const currentTime = Date.now(); 
		
		const startTimeInMilliseconds = giveUpTime * 1000;
		const remainingTime = Math.max(0, Math.floor((startTimeInMilliseconds - currentTime) / 1000));
	
		const timerElement = document.getElementById("ready-button");
		if (!timerElement)
			return
		const minutes = Math.floor(remainingTime / 60);
		const seconds = remainingTime % 60;
		timerElement.innerHTML = `<i class="fa-regular fa-circle-xmark"></i> Click to get ready [${minutes}:${seconds < 10 ? '0' : ''}${seconds}]`;
		console.log("Updating ready timer with " + minutes + "minutes and " + seconds);
		if (remainingTime < 0) 
		{
			if (this.intervalReady)
			{
				clearInterval(this.intervalReady);
				this.intervalReady = null;
				return;
			}	
		}
	}

	clearTree()
	{
		document.getElementById('tournament-tree').innerHTML = 
		`
			<div id="tournament-winner" class="tournament-tree-node"></div>
			<div id="tournament-final" class="tournament-tree-node">
				<div class="tournament-game" id="final-0"></div>
			</div>
			<div id="tournament-semi-final" class="tournament-tree-node">
				<div class="tournament-game" id="semi-0"></div>
				<div class="tournament-game" id="semi-1"></div>
			</div>
			<div id="tournament-quarter-final" class="tournament-tree-node">
				<div class="tournament-game" id="quarter-0"></div>
				<div class="tournament-game" id="quarter-1"></div>
				<div class="tournament-game" id="quarter-2"></div>
				<div class="tournament-game" id="quarter-3"></div>
			</div>
		`
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
			
			window.app.ingame = true;
			sessionStorage.setItem("ingame", "true");
		};

		window.app.gamews.onclose = () => {
			
			window.app.ingame = false;
			sessionStorage.setItem("ingame", "false");
		};

		window.app.gamews.onerror = (error) => {
			console.error("WebSocket error:", error);
			alert("Connection error! Please try again.");
		};
	}

	async redirectToGame(events) {
		if (this.intervalReady)
		{
			clearInterval(this.intervalReady);
			this.intervalReady = null;
		}
		if (this.intervalStarting)
		{
			clearInterval(this.intervalStarting);
			this.intervalStarting = null;
		}
		window.app.router.navigateTo("/game");
		if (window.app.tournamentws)
		{
			window.app.tournamentws.close();
			window.app.tournamentws = undefined;
		}
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
			this.addUserToWaitingRoom(player);
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
			 // Debug log
			window.app.tournamentws.send(
				JSON.stringify({
					action: action
				}),
			);
		}
	}

	sendCreateTournament(size, mode) {
		if (window.app.tournamentws && window.app.tournamentws.readyState === WebSocket.OPEN) {
			
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
						<button type="submit" id="ready-button"><i class="fa-regular fa-circle-check"></i> Ready</button>
						<button type="submit" id="join-button"><i class="fa-solid fa-user-plus"></i> Join</button>
						<button type="submit" id="leave-button"><i class="fa-solid fa-user-minus"></i> Leave</button>
						<button type="submit" id="forfeit-button"><i class="fa-solid fa-flag"></i> Forfeit</button>
					</div>
				</div>
				<div id="tournament-tree-card" class="card">
					<div id="tournament-tree">
						<div id="tournament-winner" class="tournament-tree-node"></div>
						<div id="tournament-final" class="tournament-tree-node">
							<div class="tournament-game" id="final-0"></div>
						</div>
						<div id="tournament-semi-final" class="tournament-tree-node">
							<div class="tournament-game" id="semi-0"></div>
							<div class="tournament-game" id="semi-1"></div>
						</div>
						<div id="tournament-quarter-final" class="tournament-tree-node">
							<div class="tournament-game" id="quarter-0"></div>
							<div class="tournament-game" id="quarter-1"></div>
							<div class="tournament-game" id="quarter-2"></div>
							<div class="tournament-game" id="quarter-3"></div>
						</div>
					</div>
				</div>
			</main>
			<div id="chatBoxContainer"></div>
		`;
	}

	getName(username, displayName)
	{
		if (displayName)
			return displayName
		else
			return username
	}

	displayGame(game, round, index)
	{
		let gameSelector = null
		if ((round === 'quarter' && index < 4) || (round === 'semi' && index < 2) || ((round === 'final' && index == 0)))
		{
			
			gameSelector = document.getElementById(`${round}-${index}`);
		}
		else
		{
			console.error("Unrecognized round or invalid index");
		}

		let winState = '<i class="fa-solid fa-w" style="color: #00aa00"></i>';
		let loseState = '<i class="fa-solid fa-l" style="color: #aa0000"></i>';
		let readyState = '<i class="fa-regular fa-circle-check"></i>';
		let notReadyState = '<i class="fa-regular fa-circle"></i>';
		let playingState = '<i class="fa-solid fa-gamepad"></i>';
		let spectate = '';
		let leftState = '';
		let rightState = '';

		if (game.state === 'finished')
		{
			if (game.winner)
			{
				if (game.player_left.user.username == game.winner)
				{
					leftState = winState;
					rightState = loseState;
				}
				else if (game.player_right.user.username == game.winner)
				{
					rightState = winState;
					leftState = loseState;
				}
				else
				{
					leftState = winState;
					rightState = loseState;
					console.error("Winner username does not match any player");
				}
			}
			else
			{
				leftState = winState;
				rightState = loseState;
				console.error("Game is finished but no winner was given");
			}
		}
		else if (game.state === 'waiting')
		{
			leftState = (game.player_left.ready ? readyState : notReadyState);
			rightState = (game.player_right.ready ? readyState : notReadyState);
		}		
		else if (game.state === 'playing')
		{
			if (game.game_id != -1)
			{
				spectate = `<button class="game-spectate-button" data-game-id="${game.game_id}"><i class="fa-solid fa-eye fa-lg"></i></button>`
			}
			leftState = playingState;
			rightState = playingState;
		}
		else
		{
			console.error("Game state not recognized");
			leftState = notReadyState;
			rightState = notReadyState;
		}
		let nameLeft = this.getName(game.player_left.user.username, game.player_left.user.displayName)
		let usernameLeft = game.player_left.user.username
		let scoreLeft = game.player_left.score;
		let avatarLeft = game.player_left.user.avatar;
		let scoreRight = game.player_right.score;
		let nameRight = this.getName(game.player_right.user.username, game.player_right.user.displayName)
		let usernameRight = game.player_right.user.username
		let avatarRight = game.player_right.user.avatar;

		let html = 
		`
			<div id="tournament-player-left-state">${leftState}</div>
			<div id="player-left-avatar">
				<button data-redirect-to="/profiles/${usernameLeft}"><img src="${avatarLeft}" class="avatar player-avatar"></button>
				<div id="player-left-tournament-name">
					<button data-redirect-to="/profiles/${usernameLeft}">${nameLeft}</button>
				</div>
			</div>
			<div id="game-middle-info">
				<div id="game-score">${scoreLeft} - ${scoreRight}</div>
				${spectate}
			</div>
			<div id="player-right-avatar">
				<button data-redirect-to="/profiles/${usernameRight}"><img src="${avatarRight}" class="avatar player-avatar"></button>
				<div id="player-right-tournament-name">
					<button data-redirect-to="/profiles/${usernameRight}">${nameRight}</button>
				</div>
			</div>
			<div id="tournament-player-right-state">${rightState}</i></div>
		`
		gameSelector.innerHTML = html;

		const buttons = gameSelector.querySelectorAll('[data-redirect-to]');
		buttons.forEach(button => {
			const newButton = button.cloneNode(true);
			button.parentNode.replaceChild(newButton, button);

			newButton.addEventListener('click', (e) => {
				e.preventDefault();
				const redirectTo = e.currentTarget.dataset.redirectTo;
				window.app.router.navigateTo(redirectTo);
			});
		});

		const spectateButtons = gameSelector.querySelectorAll('[data-game-id]');
		spectateButtons.forEach(spectateButton => {
			const newSpectateButton = spectateButton.cloneNode(true);
			spectateButton.parentNode.replaceChild(newSpectateButton, spectateButton);

			newSpectateButton.addEventListener('click', (e) => {
				e.preventDefault();
				const gameId = e.currentTarget.dataset.gameId;
				const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
				const host = window.location.host;
				window.app.gamews = new WebSocket(`${protocol}${host}/ws/game/?watchId=${gameId}`);
				window.app.gamews.onmessage = (event) => {
					const events = JSON.parse(event.data);
					if (events.message_type === "init") {
						this.redirectToGame(events);
					}
				};
			});
		});
	}

	displayWinner(winnerName, winnerUsername, winnerAvatar)
	{
		document.getElementById('tournament-winner').innerHTML =
		`
			<div id="winner-avatar">
				<div id="winner-crown">
					<i class="fa-solid fa-crown fa-2xl"></i>
				</div>
				<button data-redirect-to="/profiles/${winnerUsername}"><img src=${winnerAvatar} id="winner-player-avatar" class="avatar player-avatar"></button>
				<div id="player-right-tournament-name">
					<button data-redirect-to="/profiles/${winnerUsername}">${winnerName}</button>
				</div>
			</div>
		`;
		
		const buttons = document.querySelectorAll('#tournament-winner [data-redirect-to]');
		buttons.forEach(button => {
			const newButton = button.cloneNode(true);
			button.parentNode.replaceChild(newButton, button);

			newButton.addEventListener('click', (e) => {
				e.preventDefault();
				const redirectTo = e.currentTarget.dataset.redirectTo;
				window.app.router.navigateTo(redirectTo);
			});
		});
	}

	addEventListeners() {
		window.app.addNavEventListeners();
		this.addGameSizeCheckboxEventListeners();
		this.addGameModeCheckboxEventListeners();
		this.addCreateTournamentEventListeners();
		this.addJoinTournamentEventListeners();
		this.addLeaveTournamentEventListeners();
		this.addReadyButtonEventListeners();
		this.addGiveUpButtonEventListeners();
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
	addGiveUpButtonEventListeners() {
		const gameSizeCheckbox = document.getElementById("forfeit-button");
		gameSizeCheckbox.addEventListener("click", () => {
			this.sendAction('leave');
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
		const readyButton = document.getElementById("ready-button");
		readyButton.addEventListener("click", () => {
			
			this.sendAction('ready');
		});
	}

	addUserToWaitingRoom(player) {
		const waitingRoom = document.getElementById('waiting-room-container');
		const row =  `
			<li>
				<button id="redirect-to-${player.username}" class="redirect-to-profile-button" data-redirect-to="/profiles/${player.username}">
					<img src="${player.avatar}" class="avatar player-avatar">
					<div class="tournament-waiting-player-name">${player.name}</div>
					<div class="tournament-waiting-player-elo"><i class="fa-solid fa-chart-line"></i>${player.elo}</div>
					<div class="tournament-waiting-player-top-1"><i class="fa-solid fa-crown"></i>${player.top_1}</div>
				</button>
			</li>`;

		waitingRoom.insertAdjacentHTML('beforeend', row);
		const redirectButton = document.getElementById(`redirect-to-${player.username}`);
		redirectButton.addEventListener('click', (e) => {
			e.preventDefault();

			const newRedirectButton = redirectButton.cloneNode(true);
			redirectButton.parentNode.replaceChild(newRedirectButton, redirectButton);
			const redirectTo = e.currentTarget.dataset.redirectTo;
			window.app.router.navigateTo(redirectTo);
		});
	}
}