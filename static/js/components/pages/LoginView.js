export default class LoginView {
	constructor(container) {
		this.container = container;
		this.render();
		this.addOAuthEventListeners();
		this.add2FAEventListeners();
		this.add2FARecoveryCodeBtnEventListeners();
		this.add2FATOTPBtnEventListeners();
		this.addLoginEventListeners();
		this.addSignupBtnEventListeners();
		this.addPasswordToggleEventListeners();
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
						<div id="input-error"><i class="fa-solid fa-xmark"></i></div>
						<button id="login-button" type="submit"><i class="fa-solid fa-right-to-bracket"></i> Log In</button>
						<hr />
						<button id="login42-button" type="button"><img src="imgs/42_logo.png" id="oauth-logo"> Login In with 42</button>
						<div id="signup-link">Don't have an account? <button type="button" id="signup-button"> Sign Up</button></div>
					</form>
				</div>
			</main>
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
									<input id="totpInput" class="form-control" maxlength="6" required placeholder="Enter 2FA code">
									<input id="recoveryCodeInput" class="form-control" maxlength="16" disabled required style="display: none;" placeholder="Enter recovery code">
								</div>
								<div id="totpError" class="alert alert-danger d-none"></div>
								<button type="button" class="btn btn-primary" id="recoveryCodeBtn">Use recovery code</button>
								<button type="button" class="btn btn-primary" id="totpBtn" style="display: none;">Use 2FA</button>
							</div>
							<div class="modal-footer">
								<button type="submit" class="btn btn-primary" id="totpSubmit">Submit</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		`;
	}

	add2FARecoveryCodeBtnEventListeners() {
		const recoveryCodeBtn = this.container.querySelector('#recoveryCodeBtn');
		recoveryCodeBtn.addEventListener('click', () => {
			const totpBtn = this.container.querySelector('#totpBtn');
			const totpInput = this.container.querySelector('#totpInput');
			const recoveryCodeInput = this.container.querySelector('#recoveryCodeInput');

			totpBtn.style.display = "block";

			totpInput.value = "";
			totpInput.style.display = "none";
			totpInput.disabled = true;

			recoveryCodeInput.style.display = "block";
			recoveryCodeInput.disabled = false;
			recoveryCodeBtn.style.display = "none";
		});
	}

	add2FATOTPBtnEventListeners() {
		const totpBtn = this.container.querySelector('#totpBtn');
		totpBtn.addEventListener('click', () => {
			const recoveryCodeBtn = this.container.querySelector('#recoveryCodeBtn');
			const recoveryCodeInput = this.container.querySelector('#recoveryCodeInput');
			const totpInput = this.container.querySelector('#totpInput');
			
			recoveryCodeBtn.style.display = "block";

			recoveryCodeInput.value = "";
			recoveryCodeInput.style.display = "none";
			recoveryCodeInput.disabled = true;

			totpInput.style.display = "block";
			totpInput.disabled = false;
			totpBtn.style.display = "none";
		});
	}

	async addOAuthEventListeners() {
		try {
			const response = await fetch('/api/get/oauth/redirect', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
			});
			const data = await response.json();

			if (data.success) {
				const login42 = this.container.querySelector('#login42-button');

				login42.addEventListener("click", () => {
					window.location.href = data.auth_url;
				});
			}
			else
				window.app.showErrorMsg('#input-error', data.message);
		} catch (error) {
			window.app.showErrorMsg('#input-error', 'An error occurred: ' + error);
		}
	}

	addSignupBtnEventListeners() {
		const signupBtn = this.container.querySelector('#signup-button');
		signupBtn.addEventListener('click', () => {
			window.app.router.navigateTo('/signup');
		});
	}

	add2FAEventListeners() {
		const submit = this.container.querySelector('#totpForm');

		submit.addEventListener('submit', async (e) => {
			e.preventDefault();
			const totp = this.container.querySelector('#totpInput').value;
			const recovery_code = this.container.querySelector('#recoveryCodeInput').value;
			try {
				const username = this.container.querySelector('#username-input').value;
				let response = null;
				if (recovery_code) {
					response = await fetch('/api/login/2fa/recovery', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							username: username,
							recovery_code: recovery_code,
						})
					});
				} else {
					response = await fetch('/api/login/2fa/', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							username: username,
							totp: totp,
						})
					});
				}
				const data = await response.json();
				if (data.success) {
					const modal = bootstrap.Modal.getInstance(this.container.querySelector('#totpModal'));
					if (modal)
						modal.hide();
					window.app.login(data);
				} else
					window.app.showErrorMsg('#totpError', data.message);
			} catch (error) {
				window.app.showErrorMsg('#totpError', 'An error occurred: ' + error);
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
				const response = await fetch('/api/login/', {
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
					if (data.is_2fa_enabled)
						new bootstrap.Modal(this.container.querySelector('#totpModal')).show();
					else
						window.app.login(data);
				} else
					window.app.showErrorMsg('#input-error', data.message);
			} catch (error) {
				window.app.showErrorMsg('#input-error', 'An error occurred: ' + error);
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