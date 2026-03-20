<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useOpenUtau } from './composables/useOpenUtau';
import TitleBar from './components/TitleBar.vue';
import WelcomePage from './components/WelcomePage.vue';
import EditorLayout from './components/EditorLayout.vue';
import PianoRollWindow from './components/PianoRollWindow.vue';
import SingerManagerWindow from './components/SingerManagerWindow.vue';

const {
  state,
  hasProject,
  init,
  openProjectFile,
  createProjectSession
} = useOpenUtau();

onMounted(async () => {
  await init();
});

async function handleFileDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    await openProjectFile(file);
  }
}
</script>

<template>
  <div class="ou-window" @dragover.prevent @drop.prevent="handleFileDrop">
    <!-- OS-like title bar menu -->
    <TitleBar />

    <div class="ou-content">
      <WelcomePage v-if="!hasProject" />
      <EditorLayout v-else />
    </div>
    
    <SingerManagerWindow v-if="state.showSingerManager" />
    <PianoRollWindow v-if="state.showPianoRoll" />
  </div>
</template>

<style scoped lang="scss">
.ou-window {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background: var(--ou-bg);
}

.ou-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
