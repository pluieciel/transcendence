import {addUserData, message, message2, saveUserChanges, eraseInDB} from "../utils/settingsUtils.js"

export default class CustomView {
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
			const adminBtn = this.container.querySelector("#adminBtn");
			adminBtn.style.display = "block";
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
        <h1 id="pong">PONG</h1>
			<button id="adminBtn" class="nav-btn">Admin</button>
			<button id="indexBtn" class="nav-btn">Index</button>
			<button id="customBtn" class="nav-btn disabledBtn">Custom</button>
			<button id="profileBtn" class="nav-btn">Profile</button>
			<button id="creditsBtn" class="nav-btn">Credits</button>
			<button id="logoutBtn" class="nav-btn">Log out</button>
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
		const	profile = document.getElementById('profileBtn');
		const	index = document.getElementById('indexBtn');
		const	credits = document.getElementById('creditsBtn');
		const	logoutBtn = document.getElementById('logoutBtn');
		const	adminBtn = document.getElementById('adminBtn');

		logoutBtn.addEventListener("click", () => {
            window.app.chatBox.disconnect();
            window.app.logout();
        });

		index.addEventListener('click', () => {
			if (this.settings.color != window.app.settings.color || this.settings.quality != window.app.settings.quality) {
				message2("You have unsaved changes", "Click the save changes button to proceed");
				return ;
			}
			window.app.router.navigateTo('/index');
		});


		profile.addEventListener("click", () => {
			window.app.router.navigateTo("/profile");
		});

		credits.addEventListener("click", () => {
			window.app.router.navigateTo("/credits");
		});

		adminBtn.addEventListener("click", () => {
			window.app.router.navigateTo("/admin");
		});
	}

	addEventListeners() {
		this.addCustomizationEventListeners();
		this.addNavEventListeners();
    }
}
