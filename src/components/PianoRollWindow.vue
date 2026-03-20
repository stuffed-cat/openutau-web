<script setup lang="ts">
import { computed, ref } from 'vue';
import { useOpenUtau } from '../composables/useOpenUtau';
import type { VoiceNoteSummary } from '../types/openutau';

const { state, closePianoRoll } = useOpenUtau();

const NOTE_HEIGHT = 20; // Official defaults to slightly varying height, but let's use 20 usually
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

const isWindowMaximized = ref(false);
</script>

<template>
  <div class="modal-overlay" v-if="state.showPianoRoll" @click.self="closePianoRoll()">
    <div class="piano-roll-window" :class="{ 'maximized': isWindowMaximized }">
      <!-- Window Title Bar -->
      <div class="window-titlebar">
        <div class="window-title">
           
          OpenUtau - Piano Roll
        </div>
        <div class="window-controls">
          <button class="win-btn" @click="isWindowMaximized = false">_</button>
          <button class="win-btn" @click="isWindowMaximized = !isWindowMaximized">□</button>
          <button class="win-btn close" @click="closePianoRoll()">×</button>
        </div>
      </div>

      <!-- Main Piano Roll Layout Grid -->
      <div class="pr-grid">
        <!-- Row 0: Toolbar -->
        <div class="pr-toolbar pr-row-0 pr-col-span">
          <div class="menu-items">
            <span>编辑 (Edit)</span>
            <span>视图 (View)</span>
            <span>批处理 (Batch)</span>
            <span>歌词编辑 (Lyrics)</span>
            <span>音符默认 (Note Defaults)</span>
          </div>
          <div class="toolbar-tools">
            <button class="tool-btn active">↖</button>
            <button class="tool-btn">✎</button>
            <button class="tool-btn">▤</button>
            <button class="tool-btn">▧</button>
            <div class="toolbar-divider"></div>
            <button class="tool-btn">~</button>
            <button class="tool-btn">-</button>
            <button class="tool-btn active">Snap: 1/4</button>
          </div>
        </div>

        <!-- Row 1: HScrollBar Placeholder -->
        <div class="pr-scrollbar-h pr-row-1 pr-col-1">
          <div class="scroll-track-h"></div>
        </div>

        <!-- Col 0 Row 1-2: Track Icon & Portrait block -->
        <div class="pr-track-info pr-row-1-to-2 pr-col-0">
          <div class="track-color-bar"></div>
          <div class="track-avatar"></div>
        </div>

        <!-- Row 2: Timeline -->
        <div class="pr-timeline pr-row-2 pr-col-1">
          <!-- Ticks placeholder -->
          <div class="timeline-ticks"></div>
        </div>

        <!-- Row 3: Keyboard & Notes -->
        <div class="pr-keyboard pr-row-3 pr-col-0">
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

        <div class="pr-notes-area pr-row-3 pr-col-1">
          <!-- Background Grid -->
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

        <div class="pr-scrollbar-v pr-row-3 pr-col-2">
            <div class="scroll-track-v"></div>
        </div>

        <!-- Row 4: Splitter -->
        <div class="pr-splitter pr-row-4 pr-col-span"></div>

        <!-- Row 5: Expressions -->
        <div class="pr-expressions-list pr-row-5 pr-col-0">
          <ul>
            <li class="active">VEL (Velocity)</li>
            <li>VOL (Volume)</li>
            <li>PIT (Pitch)</li>
            <li>MOD (Modulation)</li>
          </ul>
        </div>
        
        <div class="pr-expressions-area pr-row-5 pr-col-1">
          <div class="exp-bg"></div>
        </div>
        
        <div class="pr-scrollbar-v-exp pr-row-5 pr-col-2"></div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  /* OpenUtau native window is exactly a detached OS window */
  /* Here we mock an OS window floating over the editor */
  display: flex; justify-content: center; align-items: center;
  z-index: 10001;
  pointer-events: none; /* Let clicks pass through outside the window if needed, but we use .self to close */
}
.modal-overlay { pointer-events: auto; }

.piano-roll-window {
  width: 1000px;
  height: 650px;
  background: var(--ou-bg, #2b2d30);
  color: var(--ou-text, #ddd);
  border: 1px solid var(--ou-border, #1e1e1e);
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  display: flex; flex-direction: column;
  font-family: "Segoe UI", Tahoma, sans-serif;
  overflow: hidden;

  &.maximized {
    width: 100vw;
    height: 100vh;
    border: none;
  }
}

.window-titlebar {
  height: 30px;
  display: flex; justify-content: space-between; align-items: center;
  background: var(--ou-bg-hover, #3c3f41);
  user-select: none;
  
  .window-title { 
    display: flex; align-items: center;
    padding-left: 10px; font-size: 12px; color: #ccc; 
  }
  
  .window-controls {
    display: flex; height: 100%;
    .win-btn {
      background: transparent; border: none; width: 45px; height: 100%;
      color: #ccc; cursor: pointer; text-align: center; line-height: 30px;
      font-size: 14px;
      &:hover { background: rgba(255,255,255,0.1); }
      &.close:hover { background: #e81123; color: white; }
    }
  }
}

.pr-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 60px 1fr 24px;
  grid-template-rows: 24px 24px 24px 1fr 6px 150px;
  background: var(--ou-bg, #1e1e1e); /* slightly darker grid bg */
  min-height: 0;
}

/* Grid Positional Classes */
.pr-col-0 { grid-column: 1; }
.pr-col-1 { grid-column: 2; }
.pr-col-2 { grid-column: 3; }
.pr-col-span { grid-column: 1 / -1; }

.pr-row-0 { grid-row: 1; }
.pr-row-1 { grid-row: 2; }
.pr-row-2 { grid-row: 3; }
.pr-row-3 { grid-row: 4; }
.pr-row-4 { grid-row: 5; }
.pr-row-5 { grid-row: 6; }
.pr-row-1-to-2 { grid-row: 2 / 4; }

/* Sub-components Custom Styling */

.pr-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--ou-bg-alt, #323537); /* Alt High Brush */
  border-bottom: 1px solid var(--ou-border, #1e1e1e);
  padding: 0 4px;

  .menu-items {
    display: flex; gap: 15px; font-size: 12px; color: #ccc; cursor: pointer;
    span:hover { color: #fff; }
  }

  .toolbar-tools {
    display: flex; gap: 4px; align-items: center;
    .tool-btn {
      background: transparent; color: #aaa; border: 1px solid transparent; 
      height: 20px; min-width: 24px; padding: 0 4px; border-radius: 2px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      &.active {
        background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); color: #fff;
      }
      &:hover { background: rgba(255,255,255,0.05); }
    }
    .toolbar-divider { width: 1px; height: 16px; background: rgba(255,255,255,0.2); margin: 0 4px; }
  }
}

.pr-scrollbar-h {
  background: #252526;
  position: relative;
  .scroll-track-h {
    height: 10px; width: 20%; background: #424344; position: absolute; bottom: 2px; left: 0; border-radius: 5px;
  }
}

.pr-track-info {
  background: #252526; display: flex; align-items: center; padding-left: 2px;
  .track-color-bar { width: 4px; height: 32px; background: #60a0cf; }
  .track-avatar { width: 36px; height: 36px; margin-left: 6px; background: #424344; border-radius: 4px; }
}

.pr-timeline {
  background: #1e1e1e;
  border-bottom: 1px solid #111;
}

.pr-keyboard {
  background: #1e1e1e;
  border-right: 1px solid #111;
  overflow: hidden;
  position: relative;
}

.keys-container {
  display: flex; flex-direction: column; position: absolute; top: 0; width: 100%;
}

.piano-key {
  box-sizing: border-box; display: flex; align-items: center; justify-content: flex-end; padding-right: 4px;
  &.white-key { background: #dfdfdf; border-bottom: 1px solid #999; }
  &.black-key { background: #111; border-bottom: 1px solid #000; }
  .key-name { font-size: 10px; color: #333; }
  &.black-key .key-name { color: #888; }
}

.pr-notes-area {
  background: #252526; /* Track background alt brush */
  position: relative;
  overflow: auto; /* handle internal scrolling for now */
}

.notes-bg {
  position: absolute; top: 0; left: 0; right: 0; pointer-events: none;
}
.note-row-bg {
  box-sizing: border-box; border-bottom: 1px solid rgba(255,255,255,0.03);
  &.black-key-row { background: rgba(0,0,0,0.25); }
}

.notes-layer {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
}

.note-block {
  position: absolute;
  background: #60a0cf; /* default accent */
  border: 1px solid #4a80a8;
  border-radius: 2px;
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  box-sizing: border-box;
  cursor: pointer;
  overflow: hidden;
  padding: 0 4px;
  &:hover { filter: brightness(1.1); }
  &.selected { border: 1px solid #fff; filter: brightness(1.2); }
  .note-lyric { white-space: nowrap; }
}

.pr-scrollbar-v {
  background: #1e1e1e; position: relative;
  .scroll-track-v {
    width: 10px; height: 20%; background: #424344; position: absolute; right: 2px; top: 0; border-radius: 5px;
  }
}

.pr-splitter {
  background: #323537;
  cursor: row-resize;
}

.pr-expressions-list {
  background: #252526;
  border-right: 1px solid #111;
  overflow-y: auto;
  ul {
    list-style: none; padding: 0; margin: 0;
    li {
      padding: 4px 6px; font-size: 10px; color: #999; cursor: pointer; border-bottom: 1px solid #1e1e1e;
      &.active { background: #3c3f41; color: #fff; border-left: 2px solid #60a0cf; }
      &:hover { background: #323537; }
    }
  }
}

.pr-expressions-area {
  background: #1e1e1e;
  border-top: 1px solid rgba(255,255,255,0.05);
}

.pr-scrollbar-v-exp {
  background: #1e1e1e;
}
</style>
