class LoginOAuth {
    constructor(container) {
        this.container = container;
        this.render();
        this.handleAuthResponse().then();
    }

    render() {
        this.container.innerHTML = `
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-md-4">
                        <div id="OAuthLoader" class="card p-4">
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
        const code = this.getQueryParameter("code");

        if (!code) {
            this.showError("Invalid authentication response.");
            return;
        }

        try {
            const response = await fetch("/api/login/oauth", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code: code }),
            });

            const data = await response.json();

            if (data.success)
				window.app.login(data);
            else
                this.showError(data.message);
        } catch (error) {
            console.error("Error during fetch:", error);
            this.showError("An error occurred during authentication.");
        }
    }

    showError(message) {
        const errorDiv = document.createElement("div");
        errorDiv.classList.add("alert", "alert-danger");
        errorDiv.textContent = message;
        this.container.appendChild(errorDiv);
    }
}

export default LoginOAuth;
