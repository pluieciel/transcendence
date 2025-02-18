import {checkAvatarFile, handleAvatarChange, refreshInputFields} from "../utils/settingsUtils.js"

export default class SettingsView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.file = null;
		this.init();
	}

	async init() {
		await window.app.getSettings();
		await this.render();
		this.addEventListeners();
		await this.getSettings();
	}

	async render() {
		await window.app.renderHeader(this.container, "settings");
		this.container.innerHTML += `
			<main>
				<div id="settings-card" class="card">
					<h2 id="card-title"><i class="fa-solid fa-gear"></i> SETTINGS</h2>
					<form id="settings-form">
						<div class="input-container">
							<i class="fa-solid fa-user-tag input-icon"></i>
							<input type="text" id="display-name-input" placeholder="Display Name" maxlength="16">
						</div>
						<div class="input-container">
							<i class="fa-solid fa-lock input-icon"></i>
							<input type="password" id="password-input" placeholder="New Password" maxlength="32">
							<i class="fa-solid fa-eye" id="password-toggle"></i>
						</div>
						<div class="input-container">
							<i class="fa-solid fa-lock input-icon"></i>
							<input type="password" id="confirm-password-input" placeholder="Confirm New Password" maxlength="32">
							<i class="fa-solid fa-eye" id="confirm-password-toggle"></i>
						</div>
						<span id="upload-avatar">
							<label for="avatar-input">
								<i class="fa-solid fa-arrow-up-from-bracket"></i> Upload Avatar
							</label>
							<input type="file" id="avatar-input" accept="image/*" hidden>
						</span>
						<div id="input-message"></div>
						<button id="save-button" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save</button>
					</form>
					<button id="toggle-2fa-button" type="button"></button>
					<button id="delete-account-button" type="submit"><i class="fa-solid fa-trash-can"></i> Delete Account</button>
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
									<div id="qrCode"></div>
									<div id="qrCodeError" class="alert alert-danger d-none"></div>
								</div>
								<div class="mb-3">
									<input id="totpInput" class="form-control" maxlength="6" placeholder="Enter 2FA code" required>
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
		`;
	}

	addEventListeners() {
		window.app.addNavEventListeners();
		this.addPasswordToggleEventListeners();
		this.addDeleteAccountButtonEventListeners();
		this.addToggle2FAButtonEventListeners();
		this.add2FAEventListeners();
		this.addSettingsFormEventListeners();
		this.addPassordRequiredEventListeners();
	}

	addPassordRequiredEventListeners() {
		const passwordInput = document.getElementById('password-input');
		const confirmPasswordInput = document.getElementById('confirm-password-input');

		passwordInput.addEventListener('input', () => {
			if (passwordInput.value.length > 0)
				confirmPasswordInput.required = true;
			else
				confirmPasswordInput.required = false;
		});

		confirmPasswordInput.addEventListener('input', () => {
			if (confirmPasswordInput.value.length > 0)
				passwordInput.required = true;
			else
				passwordInput.required = false;
		});
	}

	addSettingsFormEventListeners() {
		const form = document.getElementById('settings-form');
		const avatarInput = document.getElementById('avatar-input');

		avatarInput.addEventListener('change', (e) => {
			this.file = handleAvatarChange(e, this.file);
		});

		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			const display_name = document.getElementById('display-name-input').value;
			const password = document.getElementById('password-input').value;
			const confirmPassword = document.getElementById('confirm-password-input').value;
			const inputMessage = document.getElementById('input-message');
			inputMessage.innerHTML = '';
			inputMessage.style.display = 'none';

			if (password !== confirmPassword) {
				window.app.showErrorMsg('#input-message', 'Passwords do not match');

				this.refreshInputFields();
				document.getElementById('password-input').required = false;
				document.getElementById('confirm-password-input').required = false;
				return;
			}

			const formData = new FormData();
			formData.append('display_name', display_name);
			formData.append('password', password);
			formData.append('confirm_password', confirmPassword);

			if (this.file) {
				const modifiedFile = checkAvatarFile(this.file, this.username);
				if (!modifiedFile)
					return;
				formData.append('avatar', modifiedFile);
			}

			try {
				const response = await fetch('/api/settings/update/', {
					method: 'POST',
					body: formData
				});
			
				const data = await response.json();
			
				if (data.success) {
					if (data.message === 'No changes made')
						window.app.showWarningMsg('#input-message', data.message);
					else
					{
						window.app.showSuccessMsg('#input-message', data.message);
					
						this.refreshInputFields();
						document.getElementById('password-input').required = false;
						document.getElementById('confirm-password-input').required = false;
						await this.refreshNavProvile();
					}
				} else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
					window.app.logout();
				} else {
					window.app.showErrorMsg('#input-message', data.message);

					this.refreshInputFields();
					document.getElementById('password-input').required = false;
					document.getElementById('confirm-password-input').required = false;
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

	async refreshNavProvile() {
		try {
			const navUsername = document.getElementById("nav-username");
			const navDisplayName = document.getElementById("nav-display-name");
			const navAvatar = document.getElementById("nav-avatar");

			const response = await fetch('/api/profiles/me/nav/');
			const data = await response.json();
			if (data.success) {
				navUsername.innerHTML = data.username;
				navDisplayName.style.display = data.display_name ? "block" : "none";
				navDisplayName.innerHTML = data.display_name;
				if (!data.is_42_avatar_used)
				{
					const cacheBuster = `?t=${new Date().getTime()}`;
					navAvatar.setAttribute("src", data.avatar_url + cacheBuster);
				}
				else
					navAvatar.setAttribute("src", data.avatar_url);
			} else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
				window.app.logout();
			} else {
				// TODO: add error msg
			}
		} catch (error) {
			console.error("An error occurred: " + error);
		}
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

	async disable2FA() {
		try {
			const response = await fetch('/api/settings/2fa/disable/');

			const data = await response.json();
			if (data.success) {
				const toggle2FAButton = document.getElementById("toggle-2fa-button");
				toggle2FAButton.innerHTML = '<i class="fa-solid fa-lock"></i> Enable 2FA';
				toggle2FAButton.setAttribute("data-is-2fa-enabled", "false");
			} else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
				window.app.logout();
			} else if (response.status == 409) {
				// TODO: show error msg
			} else {
				// TODO: show error msg
			}
		} catch (error) {
			console.error("An error occurred: " + error);
		}
	}

	async enable2FA() {
		try {
			const response = await fetch('/api/settings/2fa/qr/generate/');

			const data = await response.json();

			if (data.success) {
				new bootstrap.Modal(this.container.querySelector('#totpModal')).show();
				const qrCode = this.container.querySelector('#qrCode');
				qrCode.innerHTML = data.qr_code;
			} else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
				window.app.logout();
			} else if (response.status == 409) {
				// TODO: show error msg
			} else {
				// TODO: show error msg
			}
		} catch (error) {
			console.error("An error occurred: " + error);
		}
	}

	addToggle2FAButtonEventListeners() {
		const toggle2FAButton = document.getElementById("toggle-2fa-button");

		toggle2FAButton.addEventListener("click", async () => {
			toggle2FAButton.getAttribute("data-is-2fa-enabled") === "true" ? await this.disable2FA() : await this.enable2FA();
		});
	}

	addDeleteAccountButtonEventListeners() {
		const deleteAccountButton = document.getElementById("delete-account-button");

		deleteAccountButton.addEventListener("click", async () => {
			try {
				const response = await fetch("/api/users/delete/", {
					method: "POST",
					body: JSON.stringify({ username: this.username }),
				});

				const data = await response.json();
				if (data.success) {
					window.app.logout();
				} else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
					window.app.logout();
				} else {
					// TODO: Show error message
				}
			} catch (error) {
				console.error("An error occurred: " + error);
			}
		});
	}

	add2FAEventListeners() {
		const submit = this.container.querySelector('#totpForm');
		const errorDiv = this.container.querySelector('#totpError');

		submit.addEventListener('submit', async (e) => {
			e.preventDefault();
			const totp = this.container.querySelector('#totpInput').value;
			try {
				const response = await fetch('/api/settings/2fa/enable/', {
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
					const toggle2FAButton = document.getElementById("toggle-2fa-button");
					toggle2FAButton.innerHTML = '<i class="fa-solid fa-key"></i> Disable 2FA';
					toggle2FAButton.setAttribute("data-is-2fa-enabled", "true");
					await this.getSettings();
					const modal = bootstrap.Modal.getInstance(this.container.querySelector('#totpModal'));
					if (modal)
					{
						modal.hide();
						const response = await fetch('/api/settings/2fa/recovery/generate/');

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
				} else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
					window.app.logout();
				} else if (response.status == 409) {
					// TODO: show error msg
				} else {
					// TODO: Show error message
				}
			} catch (error) {
				console.error("An error occurred: " + error);
			}
		});
	}

	async getSettings() {
		try {
			const response = await fetch("/api/settings/", {
				method: "GET",
			});

			const data = await response.json();
			if (data.success) {	
				const displayNameInput = document.getElementById("display-name-input");
				const toggle2FAButton = document.getElementById("toggle-2fa-button");

				displayNameInput.value = data.display_name;
				toggle2FAButton.innerHTML = data.is_2fa_enabled ? `<i class="fa-solid fa-unlock"></i> Disable 2FA` : `<i class="fa-solid fa-lock"></i> Enable 2FA`;
				toggle2FAButton.setAttribute("data-is-2fa-enabled", data.is_2fa_enabled);
			} else if (response.status === 401 && data.hasOwnProperty('is_jwt_valid') && !data.is_jwt_valid) {
				window.app.logout();
			} else {
				// TODO: Show error message
			}
		} catch (error) {
			console.error("An error occurred: " + error);
		}
	}
}