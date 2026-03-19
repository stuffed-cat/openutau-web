<script setup lang="ts">
import { ref } from 'vue';
import { useOpenUtau } from '../composables/useOpenUtau';

const { projectTitle, createProjectSession, openProjectFile, exportMixdown, hasProject, performUndo, performRedo } = useOpenUtau();
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

function stopClick(e: Event) {
  e.stopPropagation();
}
</script>

<template>
  <div class="titlebar">
    <div class="menu">
      
      <div class="menu-container">
        <button class="menu-item">File</button>
        <div class="menu-dropdown">
          <div class="dropdown-item" @click="createProjectSession">New Project</div>
          <div class="dropdown-item" @click="handleFile">Open Project...</div>
          <div class="dropdown-divider"></div>
          <div class="dropdown-item" :class="{ disabled: !hasProject }" @click="hasProject && exportMixdown('wav')">Export Mixdown (WAV)</div>
        </div>
      </div>

      <div class="menu-container">
        <button class="menu-item">Edit</button>
        <div class="menu-dropdown">
          <div class="dropdown-item" :class="{ disabled: !hasProject }" @click="hasProject && performUndo()">Undo</div>
          <div class="dropdown-item" :class="{ disabled: !hasProject }" @click="hasProject && performRedo()">Redo</div>
        </div>
      </div>

      <div class="menu-container">
        <button class="menu-item">View</button>
        <div class="menu-dropdown">
          <div class="dropdown-item disabled">Zoom In (Not implemented)</div>
          <div class="dropdown-item disabled">Zoom Out (Not implemented)</div>
        </div>
      </div>
      
      <div class="menu-container">
        <button class="menu-item">Tools</button>
        <div class="menu-dropdown">
          <div class="dropdown-item disabled">Preferences...</div>
        </div>
      </div>

      <div class="menu-container">
        <button class="menu-item">Help</button>
        <div class="menu-dropdown">
          <div class="dropdown-item disabled">About OpenUtau Web</div>
        </div>
      </div>

    </div>
    
    <div class="title">{{ projectTitle }} - OpenUtau Web</div>
    
    <div class="controls">
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
  font-family: sans-serif;
}

.menu {
  display: flex;
  height: 100%;
}

.menu-container {
  position: relative;
  height: 100%;
}

.menu-item {
  height: 100%;
  padding: 0 10px;
  font-size: 13px;
  border-radius: 0;
  background: transparent;
  border: none;
  color: inherit;
  cursor: default;
}

.menu-item:hover {
  background: var(--ou-bg-hover);
}

.menu-dropdown {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  background: var(--ou-bg);
  border: 1px solid var(--ou-border);
  min-width: 180px;
  z-index: 10000;
  box-shadow: 2px 2px 6px rgba(0,0,0,0.5);
  padding: 4px 0;
}

.menu-container:hover .menu-dropdown {
  display: block;
}

.dropdown-item {
  padding: 6px 16px;
  font-size: 12px;
  cursor: default;
  white-space: nowrap;
}

.dropdown-item:hover:not(.disabled) {
  background: var(--ou-accent);
  color: white;
}

.dropdown-item.disabled {
  color: #666;
}

.dropdown-divider {
  height: 1px;
  background: var(--ou-border);
  margin: 4px 0;
}

.title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  pointer-events: none;
  color: #ccc;
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
  cursor: default;
}

.ctrl:hover {
  background: var(--ou-bg-hover);
}

.ctrl.close:hover {
  background: #E81123;
  color: white;
}
</style>
