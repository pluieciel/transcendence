export default class ProfileView {
	constructor(container) {
		this.container = container;
		this.username = window.app.state.username;
		this.init();
	}

	async init() {
		await this.render();
		this.addEventListeners();
	}

	async render() {
		await window.app.renderHeader(this.container, "profile");
		this.container.innerHTML += `
			<main id="profile-view">
				<div id="settings-card" class="card">
					<h2 id="card-title"><i class="fa-solid fa-gear"></i> SETTINGS</h2>
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
					<button id="save-button" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save</button>
					<button id="toggle-2fa-button" type="button"><i class="fa-solid fa-key"></i> Enable 2FA</button>
					<button id="delete-account-button" type="submit"><i class="fa-solid fa-trash-can"></i> Delete Account</button>
				</div>
				<div id="profile-card" class="card">
					
				</div>
			</main>
		`;
	}

	addEventListeners() {
		window.app.addNavEventListeners();
		this.addPasswordToggleEventListeners();
		this.addDeleteAccountButtonEventListeners();
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

	addDeleteAccountButtonEventListeners() {
		const deleteAccountButton = document.getElementById("delete-account-button");

		deleteAccountButton.addEventListener("click", async () => {
			try {
				const response = await fetch("/api/delete/user", {
					method: "POST",
					body: JSON.stringify({ username: this.username }),
				});

				const data = await response.json();
				if (data.success) {
					window.app.router.navigateTo("/login");
				} else if (response.status === 401 && !data.is_jwt_valid) {
					window.app.logout();
					window.app.router.navigateTo("/login");
				} else {
					// TODO: Show error message
				}
			} catch (error) {
				console.error("Error deleting account:", error);
			}
		});
	}
}