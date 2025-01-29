export default class SignUp {
    constructor(container) {
        this.container = container;
        this.render();
        this.addEventListeners();
        this.loadReCaptcha().then();
    }

    render() {
        this.container.innerHTML = `
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-md-4">
                        <form id="signupForm" class="card p-4">
                            <div class="mb-3">
                                <input type="text" id="usrnm-form" placeholder="Enter username" class="form-control" maxlength="16" required>
                            </div>
                            <div class="mb-3">
                                <input type="password" id="pwd-form" placeholder="Enter password" class="form-control" maxlength="32" required>
                            </div>
                            <div class="mb-3">
                                <input type="password" id="cfm-pwd-form" placeholder="Confirm password" class="form-control" maxlength="32" required>
                            </div>
                            <div class="mb-3">
                                <span id="avatarSpan">
                                    Avatar: <input type="file" id="avatar" accept="image/*">
                                </span>
                            </div>
                            <div class="mb-3"id="recaptcha"></div>
                            <div id="formError" class="alert alert-danger d-none"></div>
                            <button id="signupBtn" type="submit" class="btn btn-primary w-100">Sign Up</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    async loadReCaptcha() {
        const errorDiv = this.container.querySelector('#formError');
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
			}
		} catch (error) {
			errorDiv.textContent = 'An error occurred:' + error;
            errorDiv.classList.remove('d-none');
		}
    }

    addEventListeners() {
		const form = this.container.querySelector('#signupForm');
        const MAX_FILE_SIZE = 1 * 1024 * 1024;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = this.container.querySelector('#usrnm-form').value;
            const password = this.container.querySelector('#pwd-form').value;
            const confirmPassword = this.container.querySelector('#cfm-pwd-form').value;
            const recaptchaToken = grecaptcha.getResponse(this.recaptchaWidgetId);
            const errorDiv = this.container.querySelector('#formError');

            if (password !== confirmPassword) {
                errorDiv.textContent = 'Passwords do not match';
                errorDiv.classList.remove('d-none');
            }
            else if (!recaptchaToken) {
                errorDiv.textContent = 'Please verify that you are not a robot';
                errorDiv.classList.remove('d-none');
            }

            const formData = new FormData();
            const originalFile = this.container.querySelector('#avatar').files[0];
            formData.append('username', username);
            formData.append('password', password);
            formData.append('confirm_password', confirmPassword);
            formData.append('recaptcha_token', recaptchaToken);
            if (originalFile) {
                if (originalFile.size > MAX_FILE_SIZE) {
                    errorDiv.textContent = 'File size exceeds the 2MB limit';
                    errorDiv.classList.remove('d-none');
                    return;
                }
                const allowed_extensions = ["jpg", "jpeg", "png"]
                const extension = originalFile.name.split('.').pop();
                if (!allowed_extensions.includes(extension)) {
                    errorDiv.textContent = 'Avatar in jpg, jpeg, or png format only';
                    errorDiv.classList.remove('d-none');
                    return;
                }
                const newFilename = `${username}.${extension}`;
                const modifiedFile = new File([originalFile], newFilename, {
                    type: originalFile.type,
                    lastModified: originalFile.lastModified
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
                    errorDiv.textContent = data.message || 'Signup failed';
                    errorDiv.classList.remove('d-none');
                }
            } catch (error) {
                errorDiv.textContent = 'An error occurred';
                errorDiv.classList.remove('d-none');
            }
        });
    }
}