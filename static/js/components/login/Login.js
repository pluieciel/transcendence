export default class Login {
    constructor(container) {
        this.container = container;
        this.render();
        this.addOAuthEventListeners().then();
        this.add2FAEventListeners();
        this.add2FARecoveryCodeBtnEventListeners();
        this.add2FATOTPBtnEventListeners();
        this.addLoginEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-md-4">
                        <form id="loginForm" class="card p-4">
                            <div class="mb-3">
                                <input type="text" id="usrnm-form" placeholder="Enter username" class="form-control" maxlength="16" required>
                            </div>
                            <div class="mb-3">
                                <input type="password" id="pwd-form" placeholder="Enter password" class="form-control" maxlength="32" required>
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
                                    <input id="recoveryCodeInput" class="form-control" maxlength="16" disabled required style="display: none;">
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
            const recovery_code = this.container.querySelector('#recoveryCodeInput').value;
            try {
                const username = this.container.querySelector('#usrnm-form').value;
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
}