<template>

  <LoginView v-if="!loginsuccess"
    @loginsuccess="(succ, user) => {loginsuccess = succ; username = user; $router.push('/game');}"/>
  
  <MainView v-if="loginsuccess"
    @logout="(quit) => {loginsuccess = quit; $router.push('/login');}"
    :username="username"/>
</template>

<script>
import LoginView from '@/views/LoginView.vue'
import MainView from '@/views/MainView.vue'

export default {
  name: 'App',
  components: {LoginView, MainView, },
  data() {
    return {
      loginsuccess: false, // change to false later
      username: '',
    }
  },
  mounted() {
    if (this.loginsuccess) {
      this.$router.push('/game');
    } else {
      this.$router.push('/login');
    }
  },
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>
