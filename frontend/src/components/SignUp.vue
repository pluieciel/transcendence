<template>
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-md-4">
        <form @submit.prevent="handleSignup" class="card p-4 shadow">
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
          <div class="mb-3">
            <input 
              type="password" 
              v-model="confirmPassword" 
              required 
              placeholder="Confirm password"
              class="form-control"
            >
          </div>
          <div v-if="passwordError" class="alert alert-danger">
            {{ passwordError }}
          </div>
          <button type="submit" class="btn btn-primary w-100">Sign Up</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { SHA256 } from 'crypto-js'

export default {
  name: 'SignUp',
  data() {
    return {
      username: '',
      password: '',
      confirmPassword: '',
      passwordError: ''
    }
  },
  methods: {
    handleSignup() {
      if (this.password !== this.confirmPassword) {
        this.passwordError = 'Passwords do not match'
        return
      }
      
      const hashedPassword = SHA256(this.password).toString()
      this.passwordError = ''

      console.log('signup info:', {
        username: this.username,
        password: hashedPassword
      })
    }
  }
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
