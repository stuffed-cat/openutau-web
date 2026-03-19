<script setup lang="ts">
import { useOpenUtau } from '../composables/useOpenUtau';
import { ref } from 'vue';

const { createProjectSession, openProjectFile } = useOpenUtau();
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
  <div class="welcome-container">
    <div class="welcome-grid">
      <!-- Title -->
      <div class="header">
        <h1 class="logo-text">OpenUtau</h1>
        <p class="subtitle">Open singing synthesis platform.</p>
      </div>

      <!-- Action Buttons -->
      <div class="actions">
        <button class="action-btn" @click="createProjectSession">
          <div class="icon-placeholder">📄</div>
          <div class="btn-text">
            <strong>New Project</strong>
            <span>Create a new project</span>
          </div>
        </button>

        <button class="action-btn" @click="handleFile">
          <div class="icon-placeholder">📁</div>
          <div class="btn-text">
            <strong>Open Project</strong>
            <span>Open an existing project</span>
          </div>
        </button>
      </div>

      <!-- Lists -->
      <div class="lists">
        <div class="list-section">
          <h3>Recent Files</h3>
          <div class="list-box">
            <div class="empty-list">No recent files</div>
          </div>
        </div>
        <div class="list-section">
          <h3>Templates</h3>
          <div class="list-box">
            <div class="empty-list">No templates</div>
          </div>
        </div>
      </div>
    </div>
    <input type="file" ref="fileInput" hidden accept=".ustx,.mid" @change="onFileSelect" />
  </div>
</template>

<style scoped lang="scss">
.welcome-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 10vh;
  width: 100%;
  height: 100%;
  overflow: auto;
}

.welcome-grid {
  display: flex;
  flex-direction: column;
  gap: 30px;
  width: 600px;
  max-width: 90vw;
}

.header {
  text-align: center;
}

.logo-text {
  font-size: 36px;
  font-weight: 300;
  margin: 0;
  color: var(--ou-fg);
}

.subtitle {
  color: #A0A0A0;
  margin: 8px 0 0;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--ou-bg-alt);
  border: 1px solid var(--ou-border);
  border-radius: 4px;
  text-align: left;
}

.action-btn:hover {
  background: var(--ou-bg-hover);
  border-color: var(--ou-accent);
}

.icon-placeholder {
  font-size: 32px;
}

.btn-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.btn-text strong {
  font-size: 14px;
  font-weight: normal;
}

.btn-text span {
  font-size: 12px;
  color: #A0A0A0;
}

.lists {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.list-section h3 {
  font-size: 12px;
  font-weight: normal;
  color: var(--ou-fg);
  margin: 0 0 8px 4px;
}

.list-box {
  background: var(--ou-bg-alt);
  border: 1px solid var(--ou-border);
  height: 200px;
  border-radius: 2px;
  padding: 8px;
}

.empty-list {
  color: #777;
  font-size: 12px;
  padding: 8px;
}
</style>
