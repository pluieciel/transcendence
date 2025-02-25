export default class LoginView {
	constructor(container) {
		this.container = container;
		this.render();
		this.addEventListeners();
		window.app.chatBox = null;
	}

	render() {
		window.app.renderHeader(this.container, null, false, true, true);
		this.container.innerHTML += `
			<main>
				<div id="login-card" class="card">
					<form id="login-form">
						<h2 id="card-title"><i class="fa-solid fa-right-to-bracket"></i> LOG IN</h2>
						<div class="input-container">
							<i class="fa-solid fa-user input-icon"></i>
							<input type="text" id="username-input" placeholder="Username" maxlength="16" required>
						</div>
						<div class="input-container">
							<i class="fa-solid fa-lock input-icon"></i>
							<input type="password" id="password-input" placeholder="Password" maxlength="32" required>
							<i class="fa-solid fa-eye" id="password-toggle"></i>
						</div>
						<div id="input-message" class="input-message"></div>
						<button id="login-button" type="submit"><i class="fa-solid fa-right-to-bracket"></i> Log In</button>
						<hr id="login-form-divider" />
						<button id="login42-button" type="button"><img src="imgs/42_logo.png" id="oauth-logo"> Login In with 42</button>
						<div id="signup-link">Don't have an account? <button type="button" id="signup-button"> Sign Up</button></div>
					</form>
				</div>
				<div class="my-modal-background">
					<div id="totp-modal" class="my-modal">
						<div class="modal-header">
							<h5 class="modal-title"><i class="fa-solid fa-user-shield"></i>&nbsp; Two Factor Authentication</h5>
							<i class="modal-quit fa-solid fa-xmark fa-xl"></i>
						</div>
						<div class="my-modal-content">
							<form id="totp-form">
								<p class="modal-info">Please enter your 2FA code from your authenticator app</p>
								<div class="input-container">
									<i id="totp-input-icon" class="fa-solid fa-key input-icon"></i>
									<input type="text" id="totp-input" placeholder="2FA Code" maxlength="6" required>
								</div>
								<div id="totp-message" class="input-message"></div>
								<button id="totp-button" type="submit"><i class="fa-solid fa-check"></i> Verify</button>
								<hr id="totp-form-divider"/>
							</form>
							<button id="totp-method-button" type="click" data-checked="true"><i class="fa-solid fa-clipboard-list"></i> Use recovery code</button>
						</div>
					</div>
				</div>
			</main>
		`;
	}

	addEventListeners() {
		window.app.addModalQuitButtonEventListener();
		this.addOAuthEventListeners();
		this.add2FAEventListeners();
		this.addLoginEventListeners();
		this.addSignupBtnEventListeners();
		this.addPasswordToggleEventListeners();
		this.add2FAMethodEventListeners();
	}

	add2FAMethodEventListeners() {
		const totpMethodButton = document.getElementById('totp-method-button');
		totpMethodButton.addEventListener('click', (e) => {
			const isChecked = e.currentTarget.dataset.checked === 'true';
			const modalInfo = this.container.querySelector('.modal-info');
			const totpInput = this.container.querySelector('#totp-input');
			const totpInputIcon = document.getElementById('totp-input-icon');
			totpInput.value = "";

			if (isChecked) {
				totpInput.maxLength = 16;
				totpInput.placeholder = 'Recovery Code';
				totpInputIcon.classList.remove('fa-key');
				totpInputIcon.classList.add('fa-clipboard-list');
				modalInfo.textContent = 'Please enter your recovery code';
			}
			else {
				totpInput.maxLength = 6;
				totpInput.placeholder = '2FA Code';
				totpInputIcon.classList.add('fa-key');
				totpInputIcon.classList.remove('fa-clipboard-list');
				modalInfo.textContent = 'Please enter your 2FA code from your authenticator app';
			}

			e.currentTarget.dataset.checked = !isChecked;

			totpMethodButton.innerHTML = !isChecked ? 
				`<i class="fa-solid fa-clipboard-list"></i> Use recovery code` : 
				`<i class="fa-solid fa-key"></i> Use 2FA code`;
		});
	}

	async addOAuthEventListeners() {
		try {
			const response = await fetch('/api/auth/login/oauth/redirect/');

			const data = await response.json();
			if (data.success) {
				const login42 = this.container.querySelector('#login42-button');

				login42.addEventListener("click", () => {
					window.location.href = data.auth_url;
				});
			}
			else
				window.app.showErrorMsg('#input-message', data.message);
		} catch (error) {
			console.error("An error occurred: " + error);
		}
	}

	addSignupBtnEventListeners() {
		const signupBtn = this.container.querySelector('#signup-button');
		signupBtn.addEventListener('click', () => {
			window.app.router.navigateTo('/signup');
		});
	}

	add2FAEventListeners() {
		const submit = this.container.querySelector('#totp-form');

		submit.addEventListener('submit', async (e) => {
			e.preventDefault();
			const input = this.container.querySelector('#totp-input').value;
			try {
				const username = this.container.querySelector('#username-input').value;
				const totpMethodButton = document.getElementById('totp-method-button');

				let response = null;
				const is_recovery_code = totpMethodButton.dataset.checked === 'false';
				if (is_recovery_code) {
					response = await fetch('/api/auth/login/2fa/recovery/', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							username: username,
							recovery_code: input,
						})
					});
				} else {
					response = await fetch('/api/auth/login/2fa/', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							username: username,
							totp: input,
						})
					});
				}
				const data = await response.json();
				if (data.success) {
					window.app.login(data);
				} else
					window.app.showErrorMsg('#totp-message', data.message);
			} catch (error) {
				console.error("An error occurred: " + error);
			}
		});
	}

	addLoginEventListeners() {
		const form = this.container.querySelector('#login-form');
		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			const username = this.container.querySelector('#username-input').value;
			const password = this.container.querySelector('#password-input').value;

			try {
				const response = await fetch('/api/auth/login/', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						username: username,
						password: password
					})
				});
				const data = await response.json();
				
				if (data.success) {
					if (data.is_2fa_enabled) {
						const totpModal = document.getElementById('totp-modal');
						totpModal.parentElement.style.display = 'flex';
					}
					else
						window.app.login(data);
				} else
					window.app.showErrorMsg('#input-message', data.message);
			} catch (error) {
				console.error("An error occurred: " + error);
			}
		});
	}

	addPasswordToggleEventListeners() {
		const passwordToggle = document.getElementById("password-toggle");

		passwordToggle.addEventListener("click", () => {
			const passwordInput = document.getElementById("password-input");
			const passwordToggle = document.getElementById("password-toggle");

			passwordInput.type = passwordInput.type === "password" ? "text" : "password";
			passwordToggle.classList.toggle("fa-eye-slash", passwordInput.type === "text");
			passwordToggle.classList.toggle("fa-eye", passwordInput.type === "password");
		});
	}
}