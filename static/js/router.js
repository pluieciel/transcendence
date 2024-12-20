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
        
        if (window.app.state.isLoggedIn)
            route = this.routes.find(r => r.path === path);
        else
            route = this.routes.find(r => r.path === '*');
        
        if (route)
            this.currentComponent = new route.component(document.getElementById('app'), window.app.state);
    }
}