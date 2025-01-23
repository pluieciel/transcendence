export default class Login {
    constructor(container) {
        this.container = container;
        this.render();
        this.addEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-md-4">
                        <form id="loginForm" class="card p-4">
                            <div class="mb-3">
                                <input type="text" id="usrnm-form" placeholder="Enter username" class="form-control">
                            </div>
                            <div class="mb-3">
                                <input type="password" id="pwd-form" placeholder="Enter password" class="form-control">
                            </div>
                            <div id="loginError" class="alert alert-danger d-none"></div>
                            <button id="loginBtn" type="submit" class="btn btn-primary w-100">Log In</button>
                            <button id="login42Btn" type="button" class="btn btn-primary w-100 OAuth">Login In with 42</button>
                        </form>
                    </div>
                </div>
            </div>
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
        `;
    }

	async addOAuthEventListeners() {
		const errorDiv = this.container.querySelector('#loginError');
		try {
			const response = await fetch('/api/get/oauth/redirect', {
                method: 'POST',
                headers: {
					'Content-Type': 'application/json'
                },
            });
			const data = await response.json();

			if (data.success) {
				const login42 = this.container.querySelector('#login42Btn');

				login42.addEventListener("click", () => {
                    // TODO: avoid setting isLoggedIn to true here
					window.app.state.isLoggedIn = true;
					sessionStorage.setItem('isLoggedIn', 'true');
					window.location.href = data.auth_url;
		        });
			}
		} catch (error) {
			errorDiv.textContent = 'An error occurred:' + error;
            errorDiv.classList.remove('d-none');
		}
	}

	add2FAEventListeners() {
        const submit = this.container.querySelector('#totpForm');
        const errorDiv = this.container.querySelector('#totpError');

        submit.addEventListener('submit', async (e) => {
            e.preventDefault();
            const totp = this.container.querySelector('#totpInput').value;
            try {
            	const username = this.container.querySelector('#usrnm-form').value;
				const response = await fetch('/api/login/2fa/', {
					method: 'POST',
				    headers: {
				        'Content-Type': 'application/json',
					},
				    body: JSON.stringify({
				        username: username,
				        totp: totp,
				    })
				});
				const data = await response.json();
				if (data.success) {
					const modal = bootstrap.Modal.getInstance(this.container.querySelector('#totpModal'));
					if (modal)
						modal.hide();
					window.app.login(data);
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

	addLoginEventListeners() {
		const form = this.container.querySelector('#loginForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = this.container.querySelector('#usrnm-form').value;
            const password = this.container.querySelector('#pwd-form').value;
            const errorDiv = this.container.querySelector('#loginError');
            const hashedPassword = CryptoJS.SHA256(password).toString();

			if (!username || !password)
				errorDiv.textContent = 'Must fill username and password field';

            // Handle login logic here
            try {
                const response = await fetch('/api/login/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        password: hashedPassword
                    })
                });
                const data = await response.json();
				
                // This code runs only after getting response from server
                if (data.success) {
                    if (data.is_2fa_enabled) {
						new bootstrap.Modal(this.container.querySelector('#totpModal')).show();
                    } else {
                        window.app.login(data);
                    }
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

    addEventListeners() {
        this.addOAuthEventListeners().then();
        this.add2FAEventListeners();
		this.addLoginEventListeners();
    }
}