<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useOpenUtau } from '../composables/useOpenUtau';
import { getSingers } from '../api/openutau';
import type { USinger } from '../types/openutau';

const { state, selectTrack, toggleMute, toggleSolo, updateVolume, updatePan, updateSinger } = useOpenUtau();

const TRACK_HEIGHT = 104;
const singers = ref<USinger[]>([]);
const singersByType = computed(() => {
  const grouped: Record<string, USinger[]> = {};
  singers.value.forEach(singer => {
    const type = singer.singerType || 'Unknown';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(singer);
  });
  return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
});

const singerMenu = reactive({
  visible: false,
  position: { x: 0, y: 0 },
  trackNo: -1,
});

const singerMenuItems = computed(() => {
  const items: any[] = [];
  
  // Recent singers (placeholder)
  // Favorites submenu (placeholder)
  items.push({
    type: 'submenu',
    label: 'Favorites ...',
    children: []
  });
  
  // Type submenus
  singersByType.value.forEach(([type, typesingers]) => {
    items.push({
      type: 'submenu',
      label: `${type} ...`,
      children: typesingers.map(s => ({
        type: 'singer',
        label: s.name,
        singerId: s.id,
        singerObj: s
      }))
    });
  });
  
  // Separator
  items.push({ type: 'separator' });
  
  // Install Singer, etc.
  items.push(
    { type: 'action', label: 'Install Singer ...', action: 'install' },
    { type: 'action', label: 'Open Singers', action: 'openSingers' },
    { type: 'action', label: 'Open Additional Singers', action: 'openAddSingers' }
  );
  
  return items;
});

onMounted(async () => {
  try {
    const data = await getSingers();
    singers.value = Array.isArray(data) ? data : (data.singers || []);
  } catch (error) {
    console.error('Failed to load singers:', error);
  }
});

onUnmounted(() => {
  document.removeEventListener('click', closeSingerMenuOnDocClick);
  document.removeEventListener('keydown', closeSingerMenuOnEsc);
});

function openSingerMenu(trackNo: number, event: PointerEvent) {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  singerMenu.position = {
    x: rect.left,
    y: rect.bottom
  };
  singerMenu.trackNo = trackNo;
  singerMenu.visible = true;
  
  // Close menu when clicking outside
  setTimeout(() => {
    document.addEventListener('click', closeSingerMenuOnDocClick);
    document.addEventListener('keydown', closeSingerMenuOnEsc);
  }, 0);
}

function closeSingerMenu() {
  singerMenu.visible = false;
  document.removeEventListener('click', closeSingerMenuOnDocClick);
  document.removeEventListener('keydown', closeSingerMenuOnEsc);
}

function closeSingerMenuOnDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  const menu = document.querySelector('.singer-context-menu');
  if (menu && !menu.contains(target) && !target.closest('.singer-button')) {
    closeSingerMenu();
  }
}

function closeSingerMenuOnEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeSingerMenu();
  }
}

async function selectSinger(singerId: string, trackNo: number) {
  await updateSinger(trackNo, singerId);
  closeSingerMenu();
}

function getSingerName(singerId: string): string {
  const singer = singers.value.find(s => s.id === singerId);
  return singer?.name || singerId;
}

function formatVolume(vol: number): string {
  return (vol >= 0 ? '+' : '') + vol.toFixed(1);
}

function formatPan(pan: number): string {
  if (Math.abs(pan) < 1) return 'C';
  if (pan > 0) return 'R';
  return 'L';
}
</script>

<template>
  <div class="track-header-list">
    <div
      v-for="track in state.tracks"
      :key="track.trackNo"
      class="track-header"
      :class="{ selected: state.selectedTrackNo === track.trackNo }"
      @click="selectTrack(track.trackNo)"
    >
      <!-- Border wrapper matching official XAML: Border Margin="1,1,1,1" -->
      <div class="border-wrapper">
        <!-- Grid with 3 columns: auto,*,auto - matching official Grid ColumnDefinitions="auto,*,auto" -->
        <div class="header-grid">
          <!-- Column 0: Avatar Panel -->
          <div class="avatar-panel">
            <div class="avatar-border">
              <img 
                v-if="track.singer" 
                :src="`/api/singers/${track.singer}/image`" 
                class="avatar-image"
                @error="(e) => (e.target as HTMLImageElement).style.display='none'" 
              />
              <div v-else class="avatar-placeholder">👤</div>
            </div>
            <div class="track-no-badge">{{ track.trackNo + 1 }}</div>
          </div>

          <!-- Column 1: Info Grid (matching official Grid ColumnDefinitions="*,auto" RowDefinitions="auto,auto") -->
          <div class="info-grid">
            <!-- Row 0: Button Stack -->
            <div class="button-stack">
              <button class="clear-button track-name-button">
                {{ track.trackName || `Track ${track.trackNo + 1}` }}
              </button>
              <button 
                class="clear-button singer-button"
                @click.stop="openSingerMenu(track.trackNo, $event)"
              >
                {{ track.singer ? getSingerName(track.singer) : 'Select Singer' }}
              </button>
              <button class="clear-button phonemizer-button">
                {{ track.phonemizer || 'Default Phonemizer' }}
              </button>
              <button class="clear-button renderer-button">
                {{ track.renderer || 'Default Renderer' }}
              </button>
            </div>

            <!-- Row 1: Fader Grid (matching official Grid ColumnDefinitions="3,2*,2,28,5,*,2,26") -->
            <div class="fader-grid">
              <div class="fader-section">
                <label>Vol</label>
                <input 
                  type="range" 
                  min="-24" 
                  max="12" 
                  :value="track.volume || 0"
                  @input="(e) => updateVolume(track.trackNo, parseFloat((e.target as HTMLInputElement).value))"
                  class="volume-slider"
                />
                <span class="fader-value">{{ formatVolume(track.volume || 0) }}</span>
              </div>
              <div class="fader-section">
                <label>Pan</label>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  :value="track.pan || 0"
                  @input="(e) => updatePan(track.trackNo, parseFloat((e.target as HTMLInputElement).value))"
                  class="pan-slider"
                />
                <span class="fader-value">{{ formatPan(track.pan || 0) }}</span>
              </div>
            </div>
          </div>

          <!-- Column 2: Control Button Stack -->
          <div class="control-button-stack">
            <button 
              class="toggle-button mute-btn"
              :class="{ active: track.mute }"
               @click.stop="toggleMute(track.trackNo, !track.mute)"
              title="Mute"
            >
              M
            </button>
            <button 
              class="toggle-button solo-btn"
              :class="{ active: track.solo }"
              @click.stop="toggleSolo(track.trackNo, !track.solo)"
              title="Solo"
            >
              S
            </button>
            <button class="toggle-button settings-btn" title="Settings">⚙</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Context Menu for Singer Selection -->
    <div v-if="singerMenu.visible" class="singer-context-menu" :style="{ left: singerMenu.position.x + 'px', top: singerMenu.position.y + 'px' }">
      <div class="menu-items" @click.stop @mouseleave="closeSingerMenu">
        <div v-for="(item, idx) in singerMenuItems" :key="idx" class="menu-item">
          <template v-if="item.type === 'separator'">
            <div class="separator"></div>
          </template>
          <template v-else-if="item.type === 'submenu'">
            <div class="submenu-item">
              <span class="submenu-label">{{ item.label }}</span>
              <div class="submenu-content">
                <div 
                  v-for="child in item.children" 
                  :key="child.singerId"
                  class="submenu-child"
                  @click="selectSinger(child.singerId, singerMenu.trackNo)"
                >
                  {{ child.label }}
                </div>
              </div>
            </div>
          </template>
          <template v-else-if="item.type === 'singer'">
            <div 
              class="singer-item"
              @click="selectSinger(item.singerId, singerMenu.trackNo)"
            >
              {{ item.label }}
            </div>
          </template>
          <template v-else-if="item.type === 'action'">
            <div class="action-item">
              {{ item.label }}
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.track-header-list {
  display: flex;
  flex-direction: column;
  background: var(--ou-bg-alt);
  height: 100%;
  width: 100%;
  border-right: 1px solid var(--ou-border);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  margin: 0;
}

.track-header {
  height: 104px;
  width: 100%;
  background: var(--ou-bg-alt);
  border-bottom: 1px solid var(--ou-border);
  border-right: 1px solid var(--ou-border);
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  &.selected {
    background: rgba(255, 255, 255, 0.1);
  }
}

// Border wrapper: Margin="1,1,1,1" BorderThickness="1"
.border-wrapper {
  flex: 1;
  margin: 1px;
  border: 1px solid var(--ou-border);
  border-radius: 2px;
  background: transparent;
  display: flex;
  flex-direction: column;
}

// Main Grid: ColumnDefinitions="auto,*,auto"
.header-grid {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0;
  flex: 1;
  overflow: hidden;
}

// Column 0: Avatar Panel
.avatar-panel {
  position: relative;
  width: auto;
  display: flex;
  align-items: flex-start;
}

.avatar-border {
  width: 100px;
  height: 101px;
  max-height: 101px;
  border-right: 1px solid var(--ou-border);
  border-bottom: 1px solid var(--ou-border);
  border-radius: 0 0 2px 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ou-bg);
  flex-shrink: 0;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-placeholder {
  font-size: 32px;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.track-no-badge {
  position: absolute;
  top: 0;
  left: 0;
  width: 22px;
  height: 16px;
  background: var(--ou-accent);
  color: white;
  font-size: 10px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 0 2px 0;
  z-index: 10;
}

// Column 1: Info Grid - ColumnDefinitions="*,auto" RowDefinitions="auto,auto"
.info-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  flex: 1;
  overflow: hidden;
  padding: 0;
}

// Row 0: Button Stack (StackPanel)
.button-stack {
  grid-column: 1 / 3;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 0;
}

.clear-button {
  background: transparent;
  border: none;
  color: var(--ou-fg);
  font-size: 11px;
  padding: 2px 1px 0 2px;
  height: 17px;
  text-align: left;
  cursor: pointer;
  margin: 1px;
  flex-shrink: 0;
  line-height: 1;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}

.track-name-button {
  font-weight: 500;
}

.singer-button {
  color: #a0a0a0;

  &:hover {
    color: var(--ou-fg);
  }
}

// Row 1: Fader Grid - ColumnDefinitions="3,2*,2,28,5,*,2,26"
.fader-grid {
  grid-column: 1 / 3;
  grid-row: 2;
  display: grid;
  grid-template-columns: 3px 2fr 2px 28px 5px 1fr 2px 26px;
  gap: 0;
  align-items: center;
  padding: 2px 1px;
  min-height: 0;
}

.fader-section {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;

  label {
    font-size: 9px;
    color: var(--ou-fg);
    user-select: none;
    white-space: nowrap;
    flex-shrink: 0;
  }

  &:first-of-type {
    grid-column: 2 / 4;
  }

  &:last-of-type {
    grid-column: 6 / 8;
  }
}

.volume-slider,
.pan-slider {
  height: 4px;
  accent-color: var(--ou-accent);
  cursor: pointer;
  appearance: slider-horizontal;
  -webkit-appearance: slider-horizontal;
  width: 100%;
  padding: 0;
  margin: 0;
}

.fader-value {
  font-size: 9px;
  font-family: 'Courier New', monospace;
  text-align: right;
  width: 26px;
  color: var(--ou-fg);
  user-select: none;
  flex-shrink: 0;
}

// Column 2: Control Button Stack (StackPanel)
.control-button-stack {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  align-items: stretch;
  min-width: auto;
}

.toggle-button {
  background: transparent;
  border: 1px solid var(--ou-border);
  color: var(--ou-fg);
  font-size: 10px;
  font-weight: bold;
  padding: 0;
  height: 17px;
  margin: 1px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  flex-shrink: 0;
  width: auto;
  min-width: 22px;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &.active {
    color: white;
    border-color: var(--ou-accent);
    background: var(--ou-accent);
  }

  &.mute-btn.active {
    background: #d64545;
    border-color: #d64545;
  }

  &.solo-btn.active {
    background: #45d645;
    border-color: #45d645;
  }
}

// Context Menu
.singer-context-menu {
  position: fixed;
  background: var(--ou-bg);
  border: 1px solid var(--ou-border);
  border-radius: 2px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  min-width: 180px;
}

.menu-items {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 2px 0;
  max-height: 400px;
  overflow-y: auto;
}

.menu-item {
  display: flex;
}

.separator {
  height: 1px;
  background: var(--ou-border);
  margin: 2px 0;
}

.submenu-item {
  position: relative;
  display: flex;
  align-items: center;
}

.submenu-label {
  padding: 4px 8px;
  font-size: 11px;
  color: var(--ou-fg);
  cursor: pointer;
  flex: 1;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}

.submenu-content {
  position: absolute;
  left: 100%;
  top: 0;
  background: var(--ou-bg);
  border: 1px solid var(--ou-border);
  border-radius: 2px;
  padding: 2px 0;
  min-width: 160px;
  display: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

  .submenu-item:hover & {
    display: flex;
    flex-direction: column;
  }
}

.submenu-child {
  padding: 4px 8px;
  font-size: 11px;
  color: var(--ou-fg);
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}

.singer-item {
  padding: 4px 8px;
  font-size: 11px;
  color: var(--ou-fg);
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}

.action-item {
  padding: 4px 8px;
  font-size: 11px;
  color: var(--ou-fg);
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}
</style>
