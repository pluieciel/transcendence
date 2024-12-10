export default class SignUp {
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
                        <form id="signupForm" class="card p-4 shadow">
                            <div class="mb-3">
                                <input 
                                    type="text" 
                                    id="username" 
                                    required 
                                    placeholder="Enter username"
                                    class="form-control"
                                >
                            </div>
                            <div class="mb-3">
                                <input 
                                    type="password" 
                                    id="password" 
                                    required 
                                    placeholder="Enter password"
                                    class="form-control"
                                >
                            </div>
                            <div class="mb-3">
                                <input 
                                    type="password" 
                                    id="confirmPassword" 
                                    required 
                                    placeholder="Confirm password"
                                    class="form-control"
                                >
                            </div>
                            <div id="passwordError" class="alert alert-danger d-none"></div>
                            <button type="submit" class="btn btn-primary w-100">Sign Up</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    addEventListeners() {
        const form = this.container.querySelector('#signupForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = this.container.querySelector('#username').value;
            const password = this.container.querySelector('#password').value;
            const confirmPassword = this.container.querySelector('#confirmPassword').value;
            const errorDiv = this.container.querySelector('#passwordError');

            if (password !== confirmPassword) {
                errorDiv.textContent = 'Passwords do not match';
                errorDiv.classList.remove('d-none');
                return;
            }

            const hashedPassword = CryptoJS.SHA256(password).toString();

            try {
                // This is an async operation - waits for server response
                const response = await axios.post('/api/signup/', {
                    username: username,
                    password: hashedPassword
                });
    
                // This code runs only after getting response from server
                if (response.data.success) {
                    window.app.router.navigateTo('/login');
                } else {
                    errorDiv.textContent = response.data.message || 'Signup failed';
                    errorDiv.classList.remove('d-none');
                }
            } catch (error) {
                // Handles any errors during the async operation
                errorDiv.textContent = error.response?.data?.message || 'An error occurred';
                errorDiv.classList.remove('d-none');
            }
        });
    }
}