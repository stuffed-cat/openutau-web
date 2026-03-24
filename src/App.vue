<script setup lang="ts">
import { ref } from 'vue';

// 这里的职责仅限于 Web 窗口管理（例如处理多个窗口/弹窗，并承载 Avalonia WASM）
const mainWasmUrl = ref('/openutau/index.html');
</script>

<template>
  <div class="web-window-manager">
    <!-- 将真实的 Avalonia UI (被编译为 WASM) 挂载在这里 -->
    <iframe class="wasm-view" :src="mainWasmUrl" frameborder="0" allowfullscreen></iframe>
  </div>
</template>

<style scoped>
.web-window-manager {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: #1e1e1e; /* 默认深色底色，防止闪屏 */
  display: flex;
}

.wasm-view {
  flex: 1;
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
</style>
