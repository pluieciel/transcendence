import {checkAvatarFile, handleAvatarChange, refreshInputFields} from "../utils/settingsUtils.js"

export default class SignupView {
	constructor(container) {
		this.container = container;
		this.file = null;
		this.render();
		this.addEventListeners();
		this.addLoginBtnEventListeners();
		this.addPasswordToggleEventListeners();
		this.loadReCaptcha();
	}

	render() {
		window.app.renderHeader(this.container, null, false, true, true);
		this.container.innerHTML += `
			<main>
				<div id="signup-card" class="card">
					<form id="signup-form">
						<h2 id="card-title"><i class="fa-solid fa-user-plus"></i> SIGN UP</h2>
						<div class="input-container">
							<i class="fa-solid fa-user input-icon"></i>
							<input type="text" id="username-input" placeholder="Username" maxlength="16" required>
						</div>
						<div class="input-container">
							<i class="fa-solid fa-lock input-icon"></i>
							<input type="password" id="password-input" placeholder="Password" maxlength="32" required>
							<i class="fa-solid fa-eye" id="password-toggle"></i>
						</div>
						<div class="input-container">
							<i class="fa-solid fa-lock input-icon"></i>
							<input type="password" id="confirm-password-input" placeholder="Confirm Password" maxlength="32" required>
							<i class="fa-solid fa-eye" id="confirm-password-toggle"></i>
						</div>
						<span id="upload-avatar">
							<label for="avatar-input">
								<i class="fa-solid fa-arrow-up-from-bracket"></i> Upload Avatar
							</label>
							<input type="file" id="avatar-input" accept="image/*" hidden>
						</span>
						<div id="recaptcha"></div>
						<div id="input-message" class="input-message"></div>
						<button id="signup-button" type="submit"><i class="fa-solid fa-user-plus"></i> Sign Up</button>
						<div id="login-link">Already have an account? <button type="button" id="login-button"> Log In</button></div>
					</form>
				</div>
			</main>
		`;
	}

	addLoginBtnEventListeners() {
		const loginBtn = this.container.querySelector('#login-button');
		loginBtn.addEventListener('click', () => {
			window.app.router.navigateTo('/login');
		});
	}

	async loadReCaptcha() {
		try {
			const response = await fetch('/api/recaptcha/');
			const data = await response.json();

			if (data.success) {
				this.recaptchaWidgetId = grecaptcha.render('recaptcha', {
					'sitekey' : data.client_id,
					'theme' : 'dark',
				});
				const recaptcha = document.getElementById('recaptcha');
				recaptcha.style.display = 'block';
			}
			else {
				console.error(data.message);
			}
		} catch (error) {
			console.error("An error occurred: " + error);
		}
	}

	addEventListeners() {
		const form = document.getElementById('signup-form');
		const avatarInput = document.getElementById('avatar-input');

		avatarInput.addEventListener('change', (e) => {
			this.file = handleAvatarChange(e, this.file);
		});

		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			const username = this.container.querySelector('#username-input').value;
			const password = this.container.querySelector('#password-input').value;
			const confirmPassword = this.container.querySelector('#confirm-password-input').value;
			const recaptchaToken = grecaptcha.getResponse(this.recaptchaWidgetId);
			const inputMessage = document.getElementById('input-message');
			inputMessage.innerHTML = '';
			inputMessage.style.display = 'none';

			if (password !== confirmPassword) {
				window.app.showErrorMsg('#input-message', 'Passwords do not match');
				grecaptcha.reset(this.recaptchaWidgetId);
				this.refreshInputFields();
				return;
			}
			else if (!recaptchaToken) {
				window.app.showErrorMsg('#input-message', 'Please verify that you are not a robot');
				grecaptcha.reset(this.recaptchaWidgetId);
				this.refreshInputFields();
				return;
			}

			const formData = new FormData();
			formData.append('username', username);
			formData.append('password', password);
			formData.append('confirm_password', confirmPassword);
			formData.append('recaptcha_token', recaptchaToken);

			if (this.file) {
				const modifiedFile = checkAvatarFile(this.file, this.username);
				if (!modifiedFile)
					return;
				formData.append('avatar', modifiedFile);
			}

			try {
				const response = await fetch('/api/auth/signup/', {
					method: 'POST',
					body: formData
				});
			
				const data = await response.json();
			
				if (data.success) {
					window.app.showSuccessMsg('#input-message', data.message);
					window.app.router.navigateTo("/login");
				} else {
					window.app.showErrorMsg('#input-message', data.message);
					grecaptcha.reset(this.recaptchaWidgetId);
					this.refreshInputFields();
				}
			} catch (error) {
				console.error("An error occurred: " + error);
			}
		});
	}

	refreshInputFields() {
		refreshInputFields((e) => {
			this.file = handleAvatarChange(e, this.file);
		});
		this.file = null;
	}

	addPasswordToggleEventListeners() {
		const passwordToggle = document.getElementById("password-toggle");
		const confirmPasswordToggle = document.getElementById("confirm-password-toggle");

		passwordToggle.addEventListener("click", () => {
			const passwordInput = document.getElementById("password-input");
			const passwordToggle = document.getElementById("password-toggle");

			passwordInput.type = passwordInput.type === "password" ? "text" : "password";
			passwordToggle.classList.toggle("fa-eye-slash", passwordInput.type === "text");
			passwordToggle.classList.toggle("fa-eye", passwordInput.type === "password");
		});

		confirmPasswordToggle.addEventListener("click", () => {
			const confirmPasswordInput = document.getElementById("confirm-password-input");
			const confirmPasswordToggle = document.getElementById("confirm-password-toggle");

			confirmPasswordInput.type = confirmPasswordInput.type === "password" ? "text" : "password";
			confirmPasswordToggle.classList.toggle("fa-eye-slash", confirmPasswordInput.type === "text");
			confirmPasswordToggle.classList.toggle("fa-eye", confirmPasswordInput.type === "password");
		});
	}
}