<script setup lang="ts">
import { useOpenUtau } from '../composables/useOpenUtau';
import { ref } from 'vue';

const { projectTitle, createProjectSession, openProjectFile, exportMixdown } = useOpenUtau();
const fileInput = ref<HTMLInputElement | null>(null);

function handleFile() {
  fileInput.value?.click();
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    openProjectFile(file);
  }
  input.value = '';
}
</script>

<template>
  <div class="titlebar">
    <div class="menu">
      <button class="menu-item" @click="createProjectSession">File</button>
      <button class="menu-item" @click="handleFile">Open</button>
      <button class="menu-item" @click="exportMixdown('wav')">Export</button>
      <button class="menu-item disabled">Edit</button>
      <button class="menu-item disabled">View</button>
      <button class="menu-item disabled">Tools</button>
      <button class="menu-item disabled">Help</button>
    </div>
    <div class="title">{{ projectTitle }} - OpenUtau</div>
    <div class="controls">
      <!-- Fake OS controls -->
      <span class="ctrl">─</span>
      <span class="ctrl">□</span>
      <span class="ctrl close">×</span>
    </div>
    <input type="file" ref="fileInput" hidden accept=".ustx,.mid" @change="onFileSelect" />
  </div>
</template>

<style scoped lang="scss">
.titlebar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 30px;
  background: var(--ou-bg);
  border-bottom: 1px solid var(--ou-border);
  user-select: none;
}

.menu {
  display: flex;
  height: 100%;
}

.menu-item {
  height: 100%;
  padding: 0 10px;
  font-size: 12px;
  border-radius: 0;
}

.menu-item.disabled {
  color: #777;
}

.title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  pointer-events: none;
}

.controls {
  display: flex;
  height: 100%;
}

.ctrl {
  display: grid;
  place-items: center;
  width: 46px;
  height: 100%;
  font-family: monospace;
  font-size: 14px;
}

.ctrl:hover {
  background: var(--ou-bg-hover);
}

.ctrl.close:hover {
  background: #E81123;
  color: white;
}
</style>
