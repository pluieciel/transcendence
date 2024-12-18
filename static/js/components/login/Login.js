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
                                <input type="text" id="username" required placeholder="Enter username" class="form-control">
                            </div>
                            <div class="mb-3">
                                <input type="password" id="password" required placeholder="Enter password" class="form-control">
                            </div>
                            <div id="loginError" class="alert alert-danger d-none"></div>
                            <button type="submit" class="btn btn-primary w-100">Log In</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    addEventListeners() {
        const form = this.container.querySelector('#loginForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = this.container.querySelector('#username').value;
            const password = this.container.querySelector('#password').value;
            const errorDiv = this.container.querySelector('#loginError');
            const hashedPassword = CryptoJS.SHA256(password).toString();
            
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
                    window.app.login(data);
                } else {
                    errorDiv.textContent = data.message || 'Login failed';
                    errorDiv.classList.remove('d-none');
                }
            } catch (error) {
                // Handles any errors during the async operation
                errorDiv.textContent = 'An error occurred';
                errorDiv.classList.remove('d-none');
            }
        });
    }
}