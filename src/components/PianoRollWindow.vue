<script setup lang="ts">
import { computed } from 'vue';
import { useOpenUtau } from '../composables/useOpenUtau';
import type { VoiceNoteSummary } from '../types/openutau';

const { state, closePianoRoll } = useOpenUtau();

const NOTE_HEIGHT = 16;
const PIXELS_PER_TICK = 0.05;
const KEYS = 128;

const selectedNotes = computed<VoiceNoteSummary[]>(() => {
  const part = state.parts.find(p => p.partNo === state.selectedPartNo);
  return part?.notes || [];
});

const isBlackKey = (index: number) => [1, 3, 6, 8, 10].includes(index % 12);
const getKeyName = (index: number) => {
  if (index % 12 === 0) { 
    return `C${Math.floor(index / 12) - 1}`;
  }
  return '';
};

function getNoteStyle(note: VoiceNoteSummary) {
  return {
    top: `${(KEYS - 1 - note.tone) * NOTE_HEIGHT}px`,
    height: `${NOTE_HEIGHT - 1}px`,
    left: `${note.position * PIXELS_PER_TICK}px`,
    width: `${Math.max(4, note.duration * PIXELS_PER_TICK)}px`
  };
}
</script>

<template>
  <div class="modal-overlay" @click.self="closePianoRoll()">
    <div class="modal-window">
      <div class="modal-header">
        <span class="title">Piano Roll - Part {{ state.selectedPartNo }}</span>
        <button class="close-btn" @click="closePianoRoll()">×</button>
      </div>
      <div class="piano-roll-layout">
        <div class="keyboard-canvas">
          <div class="keys-container">
            <div 
              v-for="i in KEYS" 
              :key="i"
              class="piano-key"
              :class="{ 'black-key': isBlackKey(KEYS - i), 'white-key': !isBlackKey(KEYS - i) }"
              :style="{ height: `${NOTE_HEIGHT}px` }"
            >
              <span class="key-name" v-if="getKeyName(KEYS - i)">{{ getKeyName(KEYS - i) }}</span>
            </div>
          </div>
        </div>
        
        <div class="notes-canvas-wrapper">
          <div class="notes-bg">
            <div 
              v-for="i in KEYS" 
              :key="i"
              class="note-row-bg"
              :class="{ 'black-key-row': isBlackKey(KEYS - i) }"
              :style="{ height: `${NOTE_HEIGHT}px` }"
            ></div>
          </div>
          
          <div class="notes-layer">
            <div 
              v-for="note in selectedNotes" 
              :key="note.noteIndex" 
              class="note-block"
              :class="{ selected: state.selectedNoteIndex === note.noteIndex }"
              :style="getNoteStyle(note)"
            >
              <span class="note-lyric">{{ note.lyric }}</span>
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
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex; justify-content: center; align-items: center;
  z-index: 10001;
}

.modal-window {
  width: 90vw;
  height: 80vh;
  background: var(--ou-bg, #ffffff);
  color: var(--ou-text, #000000);
  border: 1px solid var(--ou-border, #ccc);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  display: flex; flex-direction: column;
  font-family: "Segoe UI", Tahoma, sans-serif;
}

.modal-header {
  height: 30px;
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 10px;
  background: var(--ou-bg-hover, #eee);
  border-bottom: 1px solid var(--ou-border, #ccc);
  
  .title { font-weight: 500; font-size: 13px; }
  .close-btn { 
    background: transparent; border: none; font-size: 16px; cursor: pointer; color: #555;
    &:hover { color: red; }
  }
}

@media (prefers-color-scheme: dark) {
  .modal-window { background: #2b2d30; color: #ddd; border-color: #1e1e1e; }
  .modal-header { background: #3c3f41; border-color: #1e1e1e; }
}

.piano-roll-layout {
  display: flex;
  width: 100%;
  flex: 1;
  min-height: 0;
  background: var(--ou-bg);
}

.keyboard-canvas {
  width: 60px;
  flex-shrink: 0;
  border-right: 1px solid #1a1a1a;
  overflow: hidden;
  background: #252525;
}

.keys-container {
  display: flex;
  flex-direction: column;
}

.piano-key {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 4px;
}

.piano-key.white-key {
  background: #f0f0f0;
  border-bottom: 1px solid #ccc;
}

.piano-key.black-key {
  background: #2b2b2b;
  border-bottom: 1px solid #111;
}

.key-name {
  font-size: 10px;
  color: #333;
}

.notes-canvas-wrapper {
  flex: 1;
  position: relative;
  overflow: auto;
  background: var(--ou-bg-alt);
}

.notes-bg {
  position: absolute;
  top: 0; left: 0; right: 0;
  pointer-events: none;
}

.note-row-bg {
  box-sizing: border-box;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.note-row-bg.black-key-row {
  background: rgba(0,0,0,0.2);
}

.notes-layer {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
}

.note-block {
  position: absolute;
  background: var(--ou-accent);
  border: 1px solid #1c6ba4;
  border-radius: 2px;
  color: var(--ou-fg);
  font-size: 10px;
  line-height: 14px;
  box-sizing: border-box;
  cursor: pointer;
  overflow: hidden;
  padding: 0 4px;
}

.note-block:hover {
  filter: brightness(1.2);
}

.note-block.selected {
  border: 1px solid #FFFFFF;
  filter: brightness(1.3);
}

.note-lyric {
  white-space: nowrap;
}
</style>
