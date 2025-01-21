class LoginOAuth {
    constructor(container) {
        this.container = container;
        this.render();
        this.token = window.app.getToken();
        this.handleAuthResponse().then();
    }

    render() {
        this.container.innerHTML = `
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-md-4">
                        <div class="card p-4 shadow">
                            <h4 class="text-center">Signing in with 42</h4>
                            <p>Please wait while we complete your registration...</p>
                            <div id="loadingSpinner" class="text-center">
                                <i class="fas fa-spinner fa-spin"></i> Loading...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

	getQueryParameter(param) {
		const urlParams = new URLSearchParams(window.location.search);
		return urlParams.get(param);
	}

    async handleAuthResponse() {
        const code = this.getQueryParameter('code');
        const state = this.getQueryParameter('state');

        if (!code || !state) {
            this.showError('Invalid authentication response.');
            return;
        }

        if (state !== 'this_is_a_very_long_random_string_i_am_unguessable') {
            this.showError('State parameter mismatch.');
            return;
        }

        try {
            const response = await fetch('/api/login/oauth', {
                method: 'POST',
                headers: {
					'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: code })
            });

            const data = await response.json();

            if (data.success) {
				window.app.login(data);
				window.app.router.navigateTo('/index');
            } else
                this.showError(data.message || 'Sign up || Log in failed.');
        } catch (error) {
			console.error('Error during fetch:', error);
			this.showError('An error occurred during authentication.');
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.classList.add('alert', 'alert-danger');
        errorDiv.textContent = message;
        this.container.appendChild(errorDiv);
    }
}

export default LoginOAuth;