<template>
    <!--Logout button-->
    <button @click="$emit('logout', false)"
        class="btn btn-danger position-absolute top-0 end-0 m-3 fw-bold">
        Log Out
    </button>

    <!--Navigation-->
    <nav>
        <router-link to="/game">Game</router-link> |
        <router-link to="/leaderboard">Leaderboard</router-link>
    </nav>
    <router-view/>

    <div class="position-relative">
        <h1>test, {{ username }}</h1>
    </div>

    <!--ChatBox-->
    <ChatBox :username="username"/>
</template>

<script>
import ChatBox from '@/components/ChatBox.vue'

export default {
  name: 'MainView',
  emits: ['logout'],
  components: { ChatBox },
  props: {
    username: String
  }, 
  data() {
    return {
    }
  }
}
</script>