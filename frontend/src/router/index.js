import { createRouter, createWebHistory } from 'vue-router'
import Blank from '../components/Blank.vue'
import SignUp from '../components/SignUp.vue'
import Login from '../components/Login.vue'
import Game from '../components/Game.vue'
import Leaderboard from '../components/Leaderboard.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: Blank
  },
  {
    path: '/signup',
    name: 'signup',
    component: SignUp
  },
  {
    path: '/login',
    name: 'login',
    component: Login
  },
  {
    path: '/game',
    name: 'game',
    component: Game
  },
  {
    path: '/leaderboard',
    name: 'leaderboard',
    component: Leaderboard
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
