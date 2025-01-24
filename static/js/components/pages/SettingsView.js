export default class SettingsView {
    constructor(container) {
		this.container = container;
        this.username = window.app.state.username;
        this.render();
        this.add2FAEventListeners();
        this.addEventListeners();
		this.addUserData();
    }

    render() {
        this.container.innerHTML = `
    <header>
        <h1>PONG</h1>
			<button id="indexBtn">Main</button>
			<button id="logoutBtn">Log out</button>
	</header>
	<div class="welcome">
        <p>Welcome to your settings, you can change everything here!</p>
    </div>
	<div class ="content">
		<div class="containerPrivate redHover">
			<h3>Profile info i guess</h3>
			<button id="changeUsernameBtn">Change your username</button>
			<input type="text" id="newUsername">
			<button id="changePpBtn">Change your profile picture</button>
			<button type="button" id="enable2FA">Enable 2FA</button>
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
	                                    <input id="totpInput" class="form-control" maxlength="6" required>
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
		</div>
		<div class="containerGame redHover">
			<h3>Game customization</h3>
			<div id="row">
			<button id="leftArrow" class="arrow"><</button>
			<div id="colorDiv"></div>
			<button id="rightArrow"class="arrow">></button>
			</div>
			<div id="row">
			<button>High Quality</button>
			<label class="switch">
			<input type="checkbox">
			<span class="slider round"></span>
			</label>
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
    <div id="passwordError" class="alert alert-danger d-none"></div>

        `;
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
					const modal = bootstrap.Modal.getInstance(this.container.querySelector('#totpModal'));
					if (modal)
						modal.hide();
				} else {
					errorDiv.textContent = data.message || 'Login failed';
                    errorDiv.classList.remove('d-none');
				}
            } catch (error) {
				errorDiv.textContent = 'An error occurred:' + error;
                errorDiv.classList.remove('d-none');
            }
        });
	}

	async addUserData() {
		if (!window.app.settings.fetched)
			await window.app.getPreferences();
		const	colorDiv = document.getElementById('colorDiv');
		const	colorIndex = window.app.settings.color;
		const	quality = window.app.settings.quality;
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
		colorDiv.innerHTML = colorArray[colorIndex];
		document.querySelector('.switch input').checked = quality
	}
	
    addEventListeners() {
		const	enable2FA = this.container.querySelector('#enable2FA');
		const	changeUsernameBtn = document.getElementById('changeUsernameBtn');
        const	logoutBtn = document.getElementById('logoutBtn');
		const	indexBtn = document.getElementById('indexBtn');
		const	wipeBtn = document.getElementById('deleteAccBtn');
		const	passwdBtn = document.getElementById('passwordButton');
        const	newpwd = document.getElementById('newPasswordInput');
        const	leftArrow = document.getElementById('leftArrow');
        const	rightArrow = document.getElementById('rightArrow');
		const	saveChanges = document.getElementById('savebtn');
		
		leftArrow.addEventListener('click', () => {
			if (window.app.settings.color == 0)
				window.app.settings.color = 8;
			else
			window.app.settings.color -= 1;
			this.addUserData();
			window.app.setColor();
		});
		
		rightArrow.addEventListener('click', () => {
			if (window.app.settings.color == 8)
				window.app.settings.color = 0;
			else
				window.app.settings.color += 1;
			window.app.setColor();
			this.addUserData();
		});

		saveChanges.addEventListener('click', async () => {
			try {
				const response = await fetch('/api/settings/set/preferences', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						'newColor': window.app.settings.color,
						'newQuality': document.querySelector('.switch input').checked,
						}),			
					});

				const data = await response.json();

				if (data.success)
					console.log("color change success");
				else
					throw new Error(data['message']);
			}
			catch (error) {
				console.error(error);
			};
		});		

		passwdBtn.addEventListener('click', () => {
			passwdBtn.style.display = 'none';
            newpwd.style.display = 'inline-block';
            newpwd.focus();
        });

		enable2FA.addEventListener('click', async (e) => {
			e.preventDefault();
			try {
				const response = await fetch('/api/settings/2fa/generate', {
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
				} else {
					errorDiv.textContent = data.message;
                    errorDiv.classList.remove('d-none');
				}
			} catch (error) {
				errorDiv.textContent = 'An error occurred:' + error;
                errorDiv.classList.remove('d-none');
			}
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
						console.log("changing username success");
						this.appState.username = newUsername.value;
					} else {
						console.log("changing username failed");
					}
				} catch (error) {
					console.error(error);
				}
			}
		})
		
		newUsername.addEventListener('keydown', async (event) => {
			if (event.key === "Enter") {
				try {
					const response = await fetch('/api/change/username', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							newUsername: newUsername.value,
						})
					});
				
					const data = await response.json();
				
					if (data.success) {
						console.log("changing username success");
						this.appState.username = newUsername.value;
					} else {
						console.log("changing username failed");
					}
				} catch (error) {
					console.error(error);
				}
			}
		});

		changeUsernameBtn.addEventListener('click', async () => {
			const newUsername = document.getElementById('newUsername');
			changeUsernameBtn.style.display = 'none';
			newUsername.style.display = 'inline-block';
			newUsername.focus();
		});

		wipeBtn.addEventListener('click', () => {
			if (this.eraseInDB())
				window.app.logout();
        });

		logoutBtn.addEventListener('click', () => {
            window.app.logout();
        });
        
		indexBtn.addEventListener('click', () => {
            window.app.router.navigateTo('/index');
        });
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
		}
		return true;
	}
	
	error(error) {
		const errorDiv = this.container.querySelector('#passwordError');

		errorDiv.textContent = 'error: ' + error;
		errorDiv.classList.remove('d-none');
		return;
	}
}