import {addUserData, message, message2, saveUserChanges, eraseInDB} from "../utils/settingsUtils.js"

export default class ProfileView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.render();
		if (!window.app.settings['fetched'])
			window.app.getPreferences();
		this.addEventListeners();
		this.setProfileFields();
	}
	
	render() {
		this.container.innerHTML = `
		<header>
			<h1 id="pong">PONG</h1>
				<button id="adminBtn">Admin</button>
			<button id="indexBtn" class="nav-btn">Index</button>
				<button id="customBtn" class="nav-btn">Custom</button>
				<button id="profileBtn" class="nav-btn disabledBtn">Profile</button>
				<button id="creditsBtn" class="nav-btn">Credits</button>
				<button id="logoutBtn" class="nav-btn">Log out</button>
		</header>
		
		<div id="mainPage">
			<div class="profile-container">
				<div id="profile-content" class="profile userOutline">
					<img id="avatarImg" class="userOutline d-none" alt="User Avatar" width="150" height="150"></img>
					<h3 id="p-name">${this.username}</h3>
					<h3 id="p-elo">Loading...</h3>
					<h3 id="p-winrate">Loading...</h3>
					<h3 id="p-wl">Loading...</h3>
					<h3 id="p-tourn">Loading...</h3>
				</div>
				<div id="profile-settings" class="profile userOutline">
					<h3>Profile info i guess</h3>
					<button id="changeNameBtn">Change your display name</button>
					<input type="text" id="newName">
					<span id="avatarSpan">
						<label class="avatar-selector-settings">Change your profile picture</label>
					    <input type="file" id="fileInput" accept="image/*" hidden>
					</span>
					<button type="button" id="enable2FA">Enable 2FA</button>
					<button type="button" id="disable2FA">Disable 2FA</button>
					<h3>Be careful with those</h3>
					<button id="passwordButton">Set New Password</button>
					<input type="password" id="newPasswordInput" placeholder="">
					<button id="deleteAccBtn">Delete my account</button>
				</div>
			</div>
			<div class="modal fade" id="totpModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h1 class="modal-title fs-5" id="staticBackdropLabel">Two-Factor Authentication</h1>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <form id="totpForm">
	                        <div class="modal-body">
	                                <div class="mb-3">
										<div id="qrCode"></div>
										<div id="qrCodeError" class="alert alert-danger d-none"></div>
									</div>
	                                <div class="mb-3">
	                                    <input id="totpInput" class="form-control" maxlength="6" placeholder="scan the qr code and enter the code you receive" required>
	                                </div>
	                                <div id="totpError" class="alert alert-danger d-none"></div>
	                        </div>
	                        <div class="modal-footer">
	                            <button type="submit" class="btn btn-primary" id="totpSubmit">Submit</button>
	                        </div>
                        </form>
                	</div>
            	</div>
			</div>
			<div class="modal fade" id="recoveryModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h1 class="modal-title fs-5" id="staticBackdropLabel">Recovery codes</h1>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <form id="recoveryForm">
	                        <div class="modal-body">
	                            <ul id="recoveryCodes">
								</ul>
	                        </div>
                        </form>
                	</div>
            	</div>
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
		</div>
	</div>`;
	}

	async setProfileFields() {
		let		name = document.getElementById("p-name");
		let		elo = document.getElementById("p-elo");
		let		ratio = document.getElementById("p-wl");
		let		winrate = document.getElementById("p-winrate");
		let		tourn = document.getElementById("p-tourn");
		let		avatar = document.getElementById("avatarImg");
		const	enable2FA = document.querySelector('#enable2FA');
		const	disable2FA = document.querySelector('#disable2FA');
		const 	is_2fa_enabled = window.app.settings.is_2fa_enabled;
		
		try {
			const response = await fetch("/api/get/profile", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});
			
			const data = await response.json();

			const avatarUrl = await window.app.getAvatar(this.username);
			if (avatarUrl) {
				avatar.classList.remove("d-none");
				avatar.src = avatarUrl;
			}

			if (data.success) {
				elo.innerHTML = "Elo: " + data["elo"];
				winrate.innerHTML = "Winrate: " + data["winrate"];
				ratio.innerHTML = "Ratio: " + data["wins"] + "/" + data["looses"];
				tourn.innerHTML = "Trophies: " + data["tourn_won"] + "<br>Tournaments played: " + data["tourn_joined"];
				name.innerHTML = this.username; 
				if (data['display']) {
					let toInsert = " (" + data['display'] + ")";
					name.insertAdjacentHTML('beforeend', toInsert);
				}
			} else
				throw new Error("Request failure");

			if (is_2fa_enabled) {enable2FA.style.display = "none";disable2FA.style.display = "block";}
			else {enable2FA.style.display = "blon";disable2FA.style.display = "none";}

		} catch (error) {
			elo.innerHTML = "Failed to load elo";
			winrate.innerHTML = "Failed to load winrate";
			ratio.innerHTML = "Failed to load ratio";
			tourn.innerHTML = "Failed to load tournaments";
			console.error("An error occurred: ", error);
		}
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
	
	add2FAEventListeners() {
        const submit = this.container.querySelector('#totpForm');
        const errorDiv = this.container.querySelector('#totpError');

        submit.addEventListener('submit', async (e) => {
            e.preventDefault();
            const totp = this.container.querySelector('#totpInput').value;
            try {
				const response = await fetch('/api/settings/2fa/enable', {
					method: 'POST',
				    headers: {
				        'Content-Type': 'application/json'
					},
				    body: JSON.stringify({
				        totp: totp,
				    })
				});
				const data = await response.json();
				if (data.success) {
					const	enable2FA = this.container.querySelector('#enable2FA');
					const	disable2FA = this.container.querySelector('#disable2FA');
					enable2FA.style.display = "none";
					disable2FA.style.display = "block";
					const modal = bootstrap.Modal.getInstance(this.container.querySelector('#totpModal'));
					if (modal)
					{
						modal.hide();
						const response = await fetch('/api/settings/2fa/generate/recovery', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json'
							},
						});

						const data = await response.json();

						const recoveryCodes = this.container.querySelector('#recoveryCodes');
						recoveryCodes.innerHTML = '';
						recoveryCodes.append(Object.assign(document.createElement('li'), {textContent: data.recovery_code_1}));
						recoveryCodes.append(Object.assign(document.createElement('li'), {textContent: data.recovery_code_2}));
						recoveryCodes.append(Object.assign(document.createElement('li'), {textContent: data.recovery_code_3}));
						recoveryCodes.append(Object.assign(document.createElement('li'), {textContent: data.recovery_code_4}));
						recoveryCodes.append(Object.assign(document.createElement('li'), {textContent: data.recovery_code_5}));
						recoveryCodes.append(Object.assign(document.createElement('li'), {textContent: data.recovery_code_6}));

						new bootstrap.Modal(this.container.querySelector('#recoveryModal')).show();
					}
				} else if (response.status == 409) {
					console.log(response.message);
				} else {
					errorDiv.textContent = data['message'] || 'Login failed';
                    errorDiv.classList.remove('d-none');
				}
            } catch (error) {
				errorDiv.textContent = 'An error occurred:' + error;
                errorDiv.classList.remove('d-none');
            }
        });
	}

	addProfileEventListeners() {
		let		file;
		const	fileInput = document.getElementById('fileInput');
		const	enable2FA = this.container.querySelector('#enable2FA');
		const	disable2FA = this.container.querySelector('#disable2FA');
		const	changeNameBtn = document.getElementById('changeNameBtn');
		const	avatar = this.container.querySelector('.avatar-selector-settings');
		const	totpError = this.container.querySelector('#totpError');
		const	newName = this.container.querySelector('#newName');

		enable2FA.addEventListener('click', async (e) => {
			e.preventDefault();
			try {
				const response = await fetch('/api/settings/2fa/generate/qr', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
				});
	
				const data = await response.json();

				if (data.success) {
					new bootstrap.Modal(this.container.querySelector('#totpModal')).show();
					const qrCode = this.container.querySelector('#qrCode');
					qrCode.innerHTML = data.qr_code;
				} else if (response.status == 409) {
					console.log(data.message);
				} else {
					totpError.textContent = data.message;
                    totpError.classList.remove('d-none');
				}
			} catch (error) {
				totpError.textContent = 'An error occurred:' + error;
                totpError.classList.remove('d-none');
			}
		});

		disable2FA.addEventListener('click', async (e) => {
			e.preventDefault();
			try {
				const response = await fetch('/api/settings/2fa/disable', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
				});

				const data = await response.json();
				if (data.success) {
					const	enable2FA = this.container.querySelector('#enable2FA');
					const	disable2FA = this.container.querySelector('#disable2FA');
					enable2FA.style.display = "block";
					disable2FA.style.display = "none";
				} else if (response.status == 409) {
					console.log(data.message);
				} else {
					console.log(data.message);
				}
			} catch (error) {
				console.log('An error occurred: ' + error);
			}
		});
		
		newName.addEventListener('keydown', async (event) => {
			if (event.key === "Enter") {
				try {
					const response = await fetch('/api/settings/set/display', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							'displayName': newName.value,
						})
					});
				
					const data = await response.json();
					
					message(data.success, data['message']);
					
					changeNameBtn.style.display = 'inline-block';
					newName.style.display = 'none';
			} catch (e) {
				console.error(e);
			}
			this.setProfileFields();
		}
		});
		
		changeNameBtn.addEventListener('click', async () => {
			const newName = document.getElementById('newName');
			changeNameBtn.style.display = 'none';
			newName.style.display = 'inline-block';
			newName.value = "";
			newName.focus();
		});
		
		fileInput.addEventListener('change', async (e) => {
			const	formData = new FormData();
			const 	allowed_extensions = ["jpg", "jpeg", "png"]
			const	MAX_FILE_SIZE = 1 * 1024 * 1024;
			let		extension;
			let		newFilename;
			let		modifiedFile;
			
			file = e.target.files[0];
			if (!file)
				return ;
			if (file.size > MAX_FILE_SIZE) {
				message(false, 'File size exceeds the 2MB limit');
				return ;
			}
			extension = file.name.split('.').pop();
			if (!allowed_extensions.includes(extension)) {
				message(false, 'Avatar in jpg, jpeg, or png format only');
				return ;
			}
			newFilename = `${this.username}.${extension}`;
			modifiedFile = new File([file], newFilename, {
				type: file.type,
				lastModified: file.lastModified
			});
			formData.append('newAvatar', modifiedFile);
			try {
				const response = await fetch('/api/settings/set/avatar', {
					method: 'POST',
					body: formData
				});
			
				const data = await response.json();
				
				message(data.success, data['message'])
			} catch (e) {
				console.error(e);
			}
		});
		
		avatar.addEventListener('click', function() {
			document.getElementById('fileInput').click();
		});
	}

	addSecurityEventListeners() {
		const	wipeBtn = document.getElementById('deleteAccBtn');
		const	passwdBtn = document.getElementById('passwordButton');
		const	newpwd = document.getElementById('newPasswordInput');

		passwdBtn.addEventListener('click', () => {
			passwdBtn.style.display = 'none';
			newpwd.style.display = 'inline-block';
			newpwd.focus();
		});
		
		newpwd.addEventListener('keydown', async (event) => {
			const hashedNew = CryptoJS.SHA256(newpwd.value).toString();
			if (event.key === "Enter") {
				try {
					const response = await fetch('/api/change/password', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							newPassword: hashedNew,
						})
					});
				
					const data = await response.json();

					message(data.success, data['message']);
				} catch (e) {
					console.error(e);
				}
			}
		});
	
		wipeBtn.addEventListener('click', () => {
			if (eraseInDB())
				window.app.logout();
		});
	}
	
	addNavigationEventListeners() {
		const	logoutBtn = document.getElementById('logoutBtn');
		const	indexBtn = document.getElementById('indexBtn');
		const	adminBtn = document.getElementById('adminBtn');

		logoutBtn.addEventListener('click', () => {
			window.app.logout();
		});
		
		indexBtn.addEventListener('click', () => {
			if (this.settings.color != window.app.settings.color || this.settings.quality != window.app.settings.quality) {
				this.message2("You have unsaved changes", "Click the save changes button to proceed");
				return ;
			}
			window.app.router.navigateTo('/index');
		});

		adminBtn.addEventListener('click', () => {
			window.app.router.navigateTo('/admin');
		});
	}
	
    addEventListeners() {
		this.add2FAEventListeners();
		this.addSecurityEventListeners();
		this.addNavigationEventListeners();
    }
	
	async eraseInDB() {
		try {
			const response = await fetch('/api/del/user', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			const data = await response.json();
			
			if (data.success)
				alert("deleted user successfully");
			else
				throw new Error(data.message);
		} catch (error) {
			console.error('An error occurred: ', error);
			return false;
		}
		return true;
	}

	async saveChanges(main) {
		try {
			const response = await fetch('/api/settings/set/preferences', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					'newColor': this.settings.color,
					'newQuality': this.settings.quality,
				}),			
				});
				
				const data = await response.json();
				
				if (data.success) {
					window.app.settings.color = this.settings.color;
				window.app.settings.quality = this.settings.quality;
				if (!main)
					this.message(true, 'Theme and quality changes saved!');
				else {
					window.app.router.navigateTo('/index');
					const modal = bootstrap.Modal.getInstance(this.container.querySelector('#changeModal'));
					if (modal)
						modal.hide();
				}
			}
			else
				throw new Error(data['message']);
		}
		catch (error) {
			console.error(error);
		};
	}
	
	async addUserData() {
		const	colorDiv = document.getElementById('colorDiv');
		const	qualityDiv = document.getElementById('qualityDiv');
		const	leftQuality = document.getElementById('leftQuality');
		const	rightQuality = document.getElementById('rightQuality');
		const	enable2FA = this.container.querySelector('#enable2FA');
		const	disable2FA = this.container.querySelector('#disable2FA');
		const 	is_2fa_enabled = window.app.settings.is_2fa_enabled;
		const	colorIndex = this.settings.color;
		const	qualityIndex = this.settings.quality;
		
		let colorArray = {
			0: 'Blue',
			1: 'Cyan',
			2: 'Green',
			3: 'Orange',
			4: 'Pink',
			5: 'Purple',
			6: 'Red',
			7: 'Soft Green',
			8: 'White'
		};
		let qualityArray = {
			0: 'Low',
			1: 'Medium',
			2: 'High',
		};
		if (qualityIndex == 0) leftQuality.classList.add("disabled");
		else leftQuality.classList.remove("disabled");

		if (qualityIndex == 2) rightQuality.classList.add("disabled");
		else rightQuality.classList.remove("disabled");

		if (is_2fa_enabled) {enable2FA.style.display = "none";disable2FA.style.display = "block";}
		else {enable2FA.style.display = "block";disable2FA.style.display = "none";}

		colorDiv.innerHTML = "Color: " + colorArray[colorIndex];
		window.app.setColor(colorIndex);
		qualityDiv.innerHTML = "Quality: " + qualityArray[qualityIndex];
	}
}
