import {addUserData, message, message2, saveUserChanges, eraseInDB} from "../utils/settingsUtils.js"

export default class CustomizeView {
    constructor(container) {
		this.container = container;
        this.username = window.app.state.username;
		this.init();
    }
	
	async init() {
		this.render();
		this.addEventListeners();
		await this.getSettings();
		if (window.app.settings.is_admin) {
			const adminButton = document.getElementById("admin-button");
			adminButton.style.display = "block";
		}
		await addUserData(this.settings);
	}
	
	async getSettings() {
		if (!window.app.settings['fetched'])
			await window.app.getPreferences();
		this.settings = {
			color: window.app.settings.color,
			quality: window.app.settings.quality
		};
		return ;
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
						<i class="fa-solid fa-gamepad fa-2xl"></i>Play
					</button>
					<button class="nav-button nav-button-disabled" id="customize-button">
						<i class="fa-solid fa-palette fa-2xl"></i>Customize
					</button>
					<button class="nav-button" id="leaderboard-button">
						<i class="fa-solid fa-medal fa-2xl"></i>Leaderboard
					</button>
					<button class="nav-button" id="achievements-button">
						<i class="fa-solid fa-trophy fa-2xl"></i>Achievements
					</button>
					<button class="nav-button" id="profile-button">
						<i class="fa-solid fa-user fa-2xl"></i>Profile
					</button>
					<button class="nav-button" id="admin-button">
						<i class="fa-solid fa-user-tie fa-2xl"></i>Admin
					</button>
					<button class="nav-button" id="logout-button">
						<i class="fa-solid fa-right-from-bracket fa-2xl"></i>Log Out
					</button>
				</div>
			</header>
	<div class="welcome">
        <p>Welcome to your settings, you can change everything here!</p>
    </div>
	<div class ="content">
		<div class="containerGame userOutline">
			<h3>Game customization</h3>
			<div id="row">
				<button id="leftColor" class="arrow"><</button>
				<div id="colorDiv"></div>
				<button id="rightColor"class="arrow">></button>
			</div>
			<div id="row">
				<button id="leftQuality" class="arrow"><</button>
				<div id="qualityDiv"></div>
				<button id="rightQuality"class="arrow">></button>
			</div>
			<button id="savebtn">Save changes</button>
		</div>
		<div class="modal fade" id="changeModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<h1 class="modal-title fs-5" id="modalHeader"></h1>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
					</div>
					<div class="modal-body">
						<h2 class="modal-title fs-5" id="modalDialog"></h2>
					</div>
					<div id="modalFooter" class="modal-footer d-none">
						<button class="btn btn-primary" id="modalsavebtn">Save changes</button>
						<button class="btn btn-primary" id="gotomainbtn">Go to main without saving</button>
					</div>
				</div>
			</div>
		</div>

					
					`;
				}

	addCustomizationEventListeners() {
		const	leftColor = document.getElementById('leftColor');
        const	rightColor = document.getElementById('rightColor');
        const	leftQuality = document.getElementById('leftQuality');
        const	rightQuality = document.getElementById('rightQuality');
		const	saveChanges = document.getElementById('savebtn');
		const	saveChanges2 = document.getElementById('modalsavebtn');
		const	gotomain = document.getElementById('gotomainbtn');
		
		leftColor.addEventListener('click', () => {
			if (this.settings.color == 0)
				this.settings.color = 8;
			else
			this.settings.color -= 1;
			addUserData(this.settings);
		});
		
		rightColor.addEventListener('click', () => {
			if (this.settings.color == 8)
				this.settings.color = 0;
			else
				this.settings.color += 1;
			addUserData(this.settings);
		});

		leftQuality.addEventListener('click', () => {
			if (this.settings.quality == 0)
				return ;
			this.settings.quality -= 1;
			addUserData(this.settings);
		});
		
		rightQuality.addEventListener('click', () => {
			if (this.settings.quality == 2)
				return ;
			this.settings.quality += 1;
			addUserData(this.settings);
		});
		
		saveChanges.addEventListener('click', async () => {
			await saveUserChanges(false, this.settings);
		});
	}

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
		this.addCustomizationEventListeners();
		this.addNavEventListeners();
    }
}
