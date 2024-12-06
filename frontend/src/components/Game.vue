<template>
    <canvas ref="gameCanvas" width="0" height="0"></canvas>
</template>

<script>
import { gameinit } from './pong/Main.js'
export default {
    name: 'Game',
    mounted() {
        const canvas = this.$refs.gameCanvas;
        gameinit(canvas);
    }
}
</script>
