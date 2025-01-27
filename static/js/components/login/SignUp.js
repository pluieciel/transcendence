export default class SignUp {
    constructor(container) {
        this.container = container;
        this.render();
        this.addEventListeners();
        this.loadReCaptcha();
    }

    render() {
        this.container.innerHTML = `
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-md-4">
                        <form id="signupForm" class="card p-4">
                            <div class="mb-3">
                                <input 
                                    type="text" 
                                    id="usrnm-form" 
                                    placeholder="Enter username"
                                    class="form-control"
                                >
                            </div>
                            <div class="mb-3">
                                <input 
                                    type="password" 
                                    id="pwd-form" 
                                    placeholder="Enter password"
                                    class="form-control"
                                >
                            </div>
                            <div class="mb-3">
                                <input 
                                    type="password" 
                                    id="cfm-pwd-form" 
                                    placeholder="Confirm password"
                                    class="form-control"
                                >
                            </div>

                            <div class="mb-3">
                                Avatar:
                                <input 
                                    type="file" 
                                    id="avatar" 
                                    accept="image/*"
                                >
                            </div>
                            <div id="passwordError" class="alert alert-danger d-none"></div>
                            <div id="recaptcha"></div>
                            <button id="signupBtn" type="submit" class="btn btn-primary w-100">Sign Up</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    loadReCaptcha() {
        this.recaptchaWidgetId = grecaptcha.render('recaptcha', {
            'sitekey' : '6LfelMQqAAAAAAAx7-xEMf7gg2mnmcPba7psj1Q1',
            'theme' : 'dark',
          });
    }

    addEventListeners() {
		const form = this.container.querySelector('#signupForm');
        const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = this.container.querySelector('#usrnm-form').value;
            const password = this.container.querySelector('#pwd-form').value;
            const confirmPassword = this.container.querySelector('#cfm-pwd-form').value;
            const recaptchaToken = grecaptcha.getResponse(this.recaptchaWidgetId);
            const errorDiv = this.container.querySelector('#passwordError');

			if (!password || !confirmPassword || !username)
				return this.error('Please fill all fields');
			else if (username.slice(-2) === "42")
				return this.error('Dont put 42 at the end of your username!!');
			else if (username === "admin")
				return this.error('You are not admin!!');
			else if (password !== confirmPassword)
				return this.error('Passwords do not match');

            
            const formData = new FormData();
            const originalFile = this.container.querySelector('#avatar').files[0];
            const hashedPassword = CryptoJS.SHA256(password).toString();
            formData.append('username', username);
            formData.append('password', hashedPassword);
            formData.append('recaptcha_token', recaptchaToken);
            if (originalFile) {
                if (originalFile.size > MAX_FILE_SIZE) {
                    errorDiv.textContent = 'File size exceeds the 2MB limit';
                    errorDiv.classList.remove('d-none');
                    return;
                }
                // Get file extension
                const extension = originalFile.name.split('.').pop();
                // Create new filename with timestamp
                const newFilename = `${username}.${extension}`;
                // Create new File object with custom name
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
                    errorDiv.textContent = data.message || 'Signup failed';
                    errorDiv.classList.remove('d-none');
                }
            } catch (error) {
                errorDiv.textContent = 'An error occurred';
                errorDiv.classList.remove('d-none');
            }
        });
    }

	error(error) {
		errorDiv.textContent = 'error';
		errorDiv.classList.remove('d-none');
		return;
	}
}