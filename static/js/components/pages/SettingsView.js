export default class SettingsView {
    constructor(container) {
		this.container = container;
        this.username = window.app.state.username;
		this.init()
    }
	
	async init() {
		this.render();
		this.addEventListeners();
		await this.getSettings();
		await this.addUserData();
	}
	
	async getSettings() {
		if (!window.app.settings.fetched)
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
			<button id="indexBtn">Main</button>
			<button id="logoutBtn">Log out</button>
	</header>
	<div class="welcome">
        <p>Welcome to your settings, you can change everything here!</p>
    </div>
	<div class ="content">
		<div class="containerPrivate redHover">
			<h3>Profile info i guess</h3>
			<button id="changeNameBtn">Change your display name</button>
			<input type="text" id="newName">
			<span id="avatarSpan">
				<label class="avatar-selector-settings">Change your profile picture</label>
			    <input type="file" id="fileInput" accept="image/*" hidden>
			</span>
			<button type="button" id="enable2FA">Enable 2FA</button>
			<button type="button" id="disable2FA">Disable 2FA</button>
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
		</div>
		<div class="containerGame redHover">
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
		<div class="containerSensitive redHover">
			<h3>Be careful with those</h3>
			<button id="passwordButton">Set New Password</button>
        	<input type="password" id="newPasswordInput" placeholder="">
			<button id="deleteAccBtn">Delete my account</button>
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
	<div id="passwordError" class="alert alert-danger d-none"></div>
					
					`;
				}
	
	message(good, message) {
		let header = good ? "<i class=\"fa-solid fa-square-check\" style=\"color:green\"></i> Success !" : "<i class=\"fa-solid fa-square-xmark\" style=\"color:red\"></i> Failure.";
		new bootstrap.Modal(this.container.querySelector('#changeModal')).show();
		document.getElementById('modalFooter').classList.add("d-none");
		document.getElementById('modalHeader').innerHTML = header;
		document.getElementById('modalDialog').innerHTML = message;
	}

	message2(header, message) {
		new bootstrap.Modal(this.container.querySelector('#changeModal')).show();
		document.getElementById('modalFooter').classList.remove("d-none");
		document.getElementById('modalHeader').innerHTML = header;
		document.getElementById('modalDialog').innerHTML = message;
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
						recoveryCodes.append(Object.assign(document.createElement('li'), {textContent: data.recovery_code_1}));
						recoveryCodes.append(Object.assign(document.createElement('li'), {textContent: data.recovery_code_2}));
						recoveryCodes.append(Object.assign(document.createElement('li'), {textContent: data.recovery_code_3}));
						recoveryCodes.append(Object.assign(document.createElement('li'), {textContent: data.recovery_code_4}));
						recoveryCodes.append(Object.assign(document.createElement('li'), {textContent: data.recovery_code_5}));
						recoveryCodes.append(Object.assign(document.createElement('li'), {textContent: data.recovery_code_6}));

						new bootstrap.Modal(this.container.querySelector('#recoveryModal')).show();
					}
				} else if (response.status == 409) {
					alert(response.message);
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
			this.addUserData();
		});
		
		rightColor.addEventListener('click', () => {
			if (this.settings.color == 8)
				this.settings.color = 0;
			else
				this.settings.color += 1;
			this.addUserData();
		});

		leftQuality.addEventListener('click', () => {
			if (this.settings.quality == 0)
				return ;
			this.settings.quality -= 1;
			this.addUserData();
		});
		
		rightQuality.addEventListener('click', () => {
			if (this.settings.quality == 2)
				return ;
			this.settings.quality += 1;
			this.addUserData();
		});
		
		saveChanges.addEventListener('click', async () => {
			await this.saveChanges(false);
		});

		saveChanges2.addEventListener('click', async () => {
			await this.saveChanges(true);
		});
		
		gotomain.addEventListener('click', () => {
			window.app.getPreferences();
			var myModal = new bootstrap.Modal(document.getElementById('changeModal'), {
				backdrop: false
			});
			myModal.show();
			window.app.router.navigateTo('/index');
		});
	}

	addProfileEventListeners() {
		let		file;
		const	fileInput = document.getElementById('fileInput');
		const	enable2FA = this.container.querySelector('#enable2FA');
		const	changeNameBtn = document.getElementById('changeNameBtn');
		const	avatar = this.container.querySelector('.avatar-selector-settings');
		
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
					alert(data.message);
				} else {
					errorDiv.textContent = data.message;
                    errorDiv.classList.remove('d-none');
				}
			} catch (error) {
				errorDiv.textContent = 'An error occurred:' + error;
                errorDiv.classList.remove('d-none');
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
					alert(data.message);
				} else {
					errorDiv.textContent = data.message;
					errorDiv.classList.remove('d-none');
				}
			} catch (error) {
				errorDiv.textContent = 'An error occurred: ' + error;
				errorDiv.classList.remove('d-none');
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
					
					if (data.success) {
						this.message(true, 'Display name changed to \'' + data['displayName'] + '\'');
						const newName = document.getElementById('newName');
						changeNameBtn.style.display = 'inline-block';
						newName.style.display = 'none';
					}
					else
					throw new Error("Failed to change the display name");
			} catch (error) {
				this.message(false, e);
			}
		}
		});
		
		changeNameBtn.addEventListener('click', async () => {
			const newName = document.getElementById('newName');
			changeNameBtn.style.display = 'none';
			newName.style.display = 'inline-block';
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
				this.message(false, 'File size exceeds the 2MB limit');
				return ;
			}
			extension = file.name.split('.').pop();
			if (!allowed_extensions.includes(extension)) {
				this.message(false, 'Avatar in jpg, jpeg, or png format only');
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
				
				if (data.success)
					this.message(true, 'Avatar changed!');
				else
					throw new Error(data['message']);
			} catch (e) {
				console.log(e);
				// this.message(false, e);
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
				
					if (data.success) {
						console.log("changing pwd success");
					} else {
						console.log("changing pwd failed");
					}
				} catch (error) {
					console.error(error);
				}
			}
		});
	
		wipeBtn.addEventListener('click', () => {
			if (this.eraseInDB())
				window.app.logout();
		});
	}
	
	addNavigationEventListeners() {
		const	logoutBtn = document.getElementById('logoutBtn');
		const	indexBtn = document.getElementById('indexBtn');
	
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
	}
	
    addEventListeners() {
		this.add2FAEventListeners();
		this.addCustomizationEventListeners();
		this.addProfileEventListeners();
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
		else {enable2FA.style.display = "blon";disable2FA.style.display = "none";}

		colorDiv.innerHTML = "Color: " + colorArray[colorIndex];
		window.app.setColor(colorIndex);
		qualityDiv.innerHTML = "Quality: " + qualityArray[qualityIndex];
	}
}
