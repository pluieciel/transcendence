<template>
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-md-4">
        <form @submit.prevent="handleLogin" class="card p-4 shadow">
          <div class="mb-3">
            <input 
              type="text" 
              v-model="username" 
              required 
              placeholder="Enter username"
              class="form-control"
            >
          </div>
          <div class="mb-3">
            <input 
              type="password" 
              v-model="password" 
              required 
              placeholder="Enter password"
              class="form-control"
            >
          </div>
          <div v-if="loginError" class="alert alert-danger">
            {{ loginError }}
          </div>
          <button type="submit" class="btn btn-primary w-100">Log In</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { SHA256 } from 'crypto-js'

export default {
  name: 'Login',
  data() {
    return {
      username: '',
      password: '',
      loginError: ''
    }
  },
  methods: {
    handleLogin() {
      const hashedPassword = SHA256(this.password).toString()
      this.loginError = ''
      
      console.log('login info:', {
        username: this.username,
        password: hashedPassword
      })

      this.$emit('loginsuccess', true, this.username)
    }
  },
  emits: ['loginsuccess'],
}
</script>

<style scoped>
button {
  width: 100%;
  padding: 10px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #3aa876;
}
</style>