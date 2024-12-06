<template>
    <nav>
      <router-link to="/signup">Sign Up</router-link> |
      <router-link to="/login">Login</router-link>
    </nav>
    <router-view @loginsuccess="(succ, user) => handleLoginSuccess(user)"/>
  </template>

  <script>
  export default {
    name: 'LoginView',
    emits: ['loginsuccess'],
    methods: {
      handleLoginSuccess(user) {
        this.$emit('loginsuccess', true, user)
      }
    }
  }
  </script>

  <style>
  
nav {
  padding: 30px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
  text-decoration: none;
}

nav a.router-link-exact-active {
  color: #42b983;
}
</style>