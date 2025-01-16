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
                        <form id="loginForm" class="card p-4 shadow">
                            <div class="mb-3">
                                <input type="text" id="username" placeholder="Enter username" class="form-control">
                            </div>
                            <div class="mb-3">
                                <input type="password" id="password" placeholder="Enter password" class="form-control">
                            </div>
                            <div id="loginError" class="alert alert-danger d-none"></div>
                            <button type="submit" class="btn btn-primary w-100">Log In</button>
                            <button type="button" class="btn btn-primary w-100 LogIn42 OAuth">Login In with 42</button>
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

	addOAuthEventListeners() {
		const form42 = this.container.querySelector('.LogIn42');
		const clientId = 'u-s4t2ud-8a6f002f24f0d857cbfedfb4fa1c8494933d7b0bcbb4a51dcc0efeb8806e046b';
		const redirectUri = encodeURIComponent('https://10.11.3.1:9000/signup/oauth');
		const scope = 'public';
		const state = 'this_is_a_very_long_random_string_i_am_unguessable';
		const authorizeUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;

		form42.addEventListener("click", () => {
			window.app.state.isLoggedIn = true;
			sessionStorage.setItem('isLoggedIn', 'true');
			window.location.href = authorizeUrl;
        });
	}

	add2FAEventListeners() {
        const submit = this.container.querySelector('#totpForm');
        const errorDiv = this.container.querySelector('#totpError');

        submit.addEventListener('submit', async (e) => {
            e.preventDefault();
            const totp = this.container.querySelector('#totpInput').value;
            try {
            	const username = this.container.querySelector('#username').value;
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
            const username = this.container.querySelector('#username').value;
            const password = this.container.querySelector('#password').value;
            const errorDiv = this.container.querySelector('#loginError');
            const hashedPassword = CryptoJS.SHA256(password).toString();

			if (!username || !password)
				errorDiv.textContent = 'Must fill username and password field';

            // Handle login logic here
            try {
                // This is an async operation - waits for server response
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
                // Handles any errors during the async operation
                errorDiv.textContent = 'An error occurred:' + error;
                errorDiv.classList.remove('d-none');
            }
        });
	}

    addEventListeners() {
        this.addOAuthEventListeners();
        this.add2FAEventListeners();
		this.addLoginEventListeners();
    }
}