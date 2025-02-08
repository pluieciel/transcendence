export default class SignupView {
    constructor(container) {
        this.container = container;
        this.render();
        this.addEventListeners();
        this.addLoginBtnEventListeners();
        this.addPasswordToggleEventListeners();
        this.loadReCaptcha();
    }

    render() {
        window.app.renderHeader(this.container, null, false, true);
        this.container.innerHTML += `
            <main>
				<div id="signup-card" class="card">
					<form id="signup-form">
						<h2 id="card-title">SIGN UP</h2>
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
						<div id="input-error"><i class="fa-solid fa-xmark"></i></div>
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
			const response = await fetch('/api/get/recaptcha', {
                method: 'POST',
                headers: {
					'Content-Type': 'application/json'
                },
            });
			const data = await response.json();

			if (data.success) {
                this.recaptchaWidgetId = grecaptcha.render('recaptcha', {
                    'sitekey' : data.client_id,
                    'theme' : 'dark',
                });
                const recaptcha = document.getElementById('recaptcha');
                recaptcha.style.display = 'block';
			}
		} catch (error) {
            window.app.showErrorMsg('#input-error', 'An error occurred: ' + error);
		}
    }

    addEventListeners() {
		const form = this.container.querySelector('#signup-form');
		const avatar = this.container.querySelector('#upload-avatar');
		const fileInput = document.getElementById('avatar-input');
		let	file;
        
		const MAX_FILE_SIZE = 1 * 1024 * 1024;

		fileInput.addEventListener('change', function(event) {
			file = event.target.files[0];
			if (file)
				avatar.textContent = "Avatar selected: " + file.name;
		});

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = this.container.querySelector('#username-input').value;
            const password = this.container.querySelector('#password-input').value;
            const confirmPassword = this.container.querySelector('#confirm-password-input').value;
            const recaptchaToken = grecaptcha.getResponse(this.recaptchaWidgetId);

            if (password !== confirmPassword) {
                window.app.showErrorMsg('#input-error', 'Passwords do not match');
                return;
            }
            else if (!recaptchaToken) {
                window.app.showErrorMsg('#input-error', 'Please verify that you are not a robot');
                return;
            }

            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);
            formData.append('confirm_password', confirmPassword);
            formData.append('recaptcha_token', recaptchaToken);
            if (file) {
                if (file.size > MAX_FILE_SIZE) {
                    window.app.showErrorMsg('#input-error', 'File size exceeds the 2MB limit');
                    return;
                }
                const allowed_extensions = ["jpg", "jpeg", "png"]
                const extension = file.name.split('.').pop();
                if (!allowed_extensions.includes(extension)) {
                    window.app.showErrorMsg('#input-error', 'Avatar in jpg, jpeg, or png format only');
                    return;
                }
                const newFilename = `${username}.${extension}`;
                const modifiedFile = new File([file], newFilename, {
                    type: file.type,
                    lastModified: file.lastModified
                });
                formData.append('avatar', modifiedFile);
            }

            try {
                const response = await fetch('/api/signup/', {
                    method: 'POST',
                    body: formData
                });
            
                const data = await response.json();
            
                if (data.success) {
                    window.app.router.navigateTo('/login');
                } else {
                    grecaptcha.reset(this.recaptchaWidgetId);
                    window.app.showErrorMsg('#input-error', data.message);
                }
            } catch (error) {
                window.app.showErrorMsg('#input-error', 'An error occurred: ' + error);
            }
        });
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