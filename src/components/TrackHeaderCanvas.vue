<script setup lang="ts">
import { useOpenUtau } from '../composables/useOpenUtau';

const { state, selectTrack, toggleMute, toggleSolo, updateVolume, updatePan } = useOpenUtau();

const TRACK_HEIGHT = 64; // Approximating OpenUtau size
</script>

<template>
  <div class="track-header-list">
    <div
      v-for="track in state.tracks"
      :key="track.trackNo"
      class="track-header"
      :class="{ selected: state.selectedTrackNo === track.trackNo }"
      :style="{ height: `${TRACK_HEIGHT}px` }"
      @click="selectTrack(track.trackNo)"
    >
      <div class="track-color" :style="{ backgroundColor: 'var(--ou-accent)' }"></div>
      <div class="track-info">
        <div class="track-top">
          <span class="track-no">{{ String(track.trackNo).padStart(2, '0') }}</span>
          <span class="track-name">{{ track.trackName || 'Track' }}</span>
        </div>
        <div class="track-bottom">
          <div class="track-avatar">👤</div>
          <div class="track-controls">
            <span class="singer-name">{{ track.singer || 'No Singer' }}</span>
            <div class="track-buttons">
              <button class="square-btn" :class="{ 'on-mute': track.mute }" @click.stop="toggleMute(track.trackNo, !track.mute)">M</button>
              <button class="square-btn" :class="{ 'on-solo': track.solo }" @click.stop="toggleSolo(track.trackNo, !track.solo)">S</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.track-header-list {
  display: flex;
  flex-direction: column;
}

.track-header {
  display: flex;
  background: var(--ou-bg-alt);
  border-bottom: 1px solid var(--ou-border);
  box-sizing: border-box;
  user-select: none;
}

.track-header.selected {
  background: #3c3c3c;
}

.track-color {
  width: 4px;
  height: 100%;
}

.track-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 4px 6px;
  overflow: hidden;
}

.track-top {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.track-no {
  color: var(--ou-accent);
  font-weight: bold;
}

.track-name {
  color: var(--ou-fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-bottom {
  display: flex;
  margin-top: 4px;
  gap: 8px;
}

.track-avatar {
  width: 32px;
  height: 32px;
  background: var(--ou-bg);
  border: 1px solid var(--ou-border);
  display: grid;
  place-items: center;
  border-radius: 2px;
  font-size: 16px;
}

.track-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.singer-name {
  font-size: 11px;
  color: #A0A0A0;
}

.track-buttons {
  display: flex;
  gap: 4px;
}

.square-btn {
  width: 18px;
  height: 18px;
  font-size: 10px;
  background: var(--ou-bg);
  border: 1px solid var(--ou-border);
  border-radius: 2px;
  padding: 0;
  display: grid;
  place-items: center;
  color: var(--ou-fg);
}

.square-btn.on-mute {
  background: #B64343;
  color: white;
  border-color: #B64343;
}

.square-btn.on-solo {
  background: #43B652;
  color: white;
  border-color: #43B652;
}
</style>
