export default class Router {
    constructor(routes) {
        this.routes = routes;
        this.currentComponent = null;
        window.addEventListener('popstate', () => this.handleRoute());
        this.handleRoute();
    }

    navigateTo(path) {
        history.pushState(null, '', path);
        this.handleRoute();
    }

    handleRoute() {
        const path = window.location.pathname;
        let route;
        
        const profileMatch = path.match(/^\/profiles\/([^/]+)/);
        if (profileMatch && window.app.getIsLoggedIn()) {
            route = this.routes.find(r => r.path === '/profiles/:username');
            if (route) {
                this.currentComponent = new route.component(document.getElementById('app'), {
                    username: profileMatch[1]
                });
                return;
            }
        }

        const achievementsMatch = path.match(/^\/achievements\/([^/]+)/);
        if (achievementsMatch && window.app.getIsLoggedIn()) {
            route = this.routes.find(r => r.path === '/achievements/:username');
            if (route) {
                this.currentComponent = new route.component(document.getElementById('app'), {
                    username: achievementsMatch[1]
                });
                return;
            }
        }

        if (window.app.getIsLoggedIn() || path === "/login/oauth" || path === "/signup")
            route = this.routes.find(r => r.path === path);
        else
            route = this.routes.find(r => r.path === '*');
        
        if (route)
            this.currentComponent = new route.component(document.getElementById('app'));
    }
}