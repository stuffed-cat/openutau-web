<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useOpenUtau } from '../composables/useOpenUtau';
import { getSingers } from '../api/openutau';

const { toggleSingerManager } = useOpenUtau();

const singers = ref<any[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

async function loadSingers() {
  loading.value = true;
  error.value = null;
  try {
    const data = await getSingers();
    singers.value = Array.isArray(data) ? data : (data.singers || []);
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadSingers();
});

function getAvatarUrl(singerId: string) {
  return `/api/singers/${encodeURIComponent(singerId)}/image`;
}
</script>

<template>
  <div class="modal-overlay" @click.self="toggleSingerManager(false)">
    <div class="modal-window">
      <div class="modal-header">
        <span class="title">歌手管理器 (Singers)</span>
        <button class="close-btn" @click="toggleSingerManager(false)">x</button>
      </div>
      
      <div class="modal-body">
        <div v-if="loading" class="loading">加载中 (Loading)...</div>
        <div v-else-if="error" class="error">{{ error }}</div>
        <div v-else-if="singers.length === 0" class="empty">未找到任何歌手 (No singers found)</div>
        <div v-else class="singer-list">
          <div class="singer-item" v-for="singer in singers" :key="singer.id">
            <div class="avatar">
              <img :src="getAvatarUrl(singer.id)" @error="$event.target.src=''" alt="Avatar" />
            </div>
            <div class="info">
              <div class="name">姓名: {{ singer.name }}</div>
              <div class="author">作者: {{ singer.author }}</div>
              <div class="version">版本: {{ singer.version }}</div>
              <div class="type">引擎: {{ singer.singerType }}</div>
              <div class="path">路径: {{ singer.basePath }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10001;
}

.modal-window {
  width: 700px;
  max-width: 90vw;
  height: 500px;
  max-height: 90vh;
  background: var(--ou-bg, #fff);
  border: 1px solid var(--ou-border, #ccc);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--ou-bg-hover, #eee);
  border-bottom: 1px solid var(--ou-border, #ccc);
  
  .title {
    font-weight: bold;
    font-size: 14px;
    color: #333;
  }
  
  .close-btn {
    background: transparent;
    border: none;
    font-size: 16px;
    cursor: pointer;
    color: #555;
    &:hover { color: red; }
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  color: #333;
}

@media (prefers-color-scheme: dark) {
  .modal-window {
    background: #2b2d30;
    border-color: #1e1e1e;
  }
  .modal-header {
    background: #3c3f41;
    border-color: #1e1e1e;
    .title, .close-btn { color: #ddd; }
  }
  .modal-body { color: #ddd; }
}

.singer-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.singer-item {
  display: flex;
  border: 1px solid var(--ou-border, #ccc);
  padding: 12px;
  background: rgba(0,0,0,0.02);
  border-radius: 4px;
  
  .avatar {
    width: 100px;
    height: 100px;
    flex-shrink: 0;
    margin-right: 16px;
    background: rgba(0,0,0,0.05);
    display: flex;
    justify-content: center;
    align-items: center;
    
    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  }
  
  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    
    .name { font-weight: bold; font-size: 15px; margin-bottom: 4px; }
    .path { font-family: monospace; color: #888; font-size: 12px; margin-top: 4px; word-break: break-all; }
  }
}
</style>
