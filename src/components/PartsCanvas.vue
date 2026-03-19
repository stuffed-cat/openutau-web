<script setup lang="ts">
import { computed } from 'vue';
import { useOpenUtau } from '../composables/useOpenUtau';
import type { PartProperties } from '../types/openutau';

const { state, selectPart } = useOpenUtau();

const TRACK_HEIGHT = 64; // Same as TrackHeaderCanvas
const PIXELS_PER_TICK = 0.05; // Zoom scale simulation

function getPartStyle(part: PartProperties) {
  return {
    top: `${part.trackNo * TRACK_HEIGHT + 2}px`,
    height: `${TRACK_HEIGHT - 4}px`,
    left: `${part.position * PIXELS_PER_TICK}px`,
    width: `${Math.max(4, part.duration * PIXELS_PER_TICK)}px`
  };
}

function onScroll(e: Event) {
  const target = e.target as HTMLElement;
  state.scrollX = target.scrollLeft;
  state.scrollY = target.scrollTop;
}
</script>

<template>
  <div class="parts-container" @scroll="onScroll">
    <div class="parts-content" :style="{ height: `${Math.max(state.tracks.length, 20) * TRACK_HEIGHT}px` }">
      <!-- Render grid background lines (timeline split) -->
      <div class="grid-bg"></div>

      <!-- Render track background stripes -->
      <div class="track-bg">
        <div 
          v-for="i in Math.max(state.tracks.length, 20)" 
          :key="i"
          class="track-stripe"
          :style="{ height: `${TRACK_HEIGHT}px` }"
        ></div>
      </div>
      
      <!-- Render Parts -->
      <div 
        v-for="part in state.parts" 
        :key="part.partNo"
        class="part-block"
        :class="{ selected: state.selectedPartNo === part.partNo }"
        :style="getPartStyle(part)"
        @click="selectPart(part.partNo)"
      >
        <span class="part-name">{{ part.name || `Part ${part.partNo}` }}</span>
        <div class="part-waveform"></div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.parts-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto; /* Handles both X and Y scrolling */
}

.parts-content {
  position: relative;
  min-width: 5000px; /* Force horizontal scroll */
  min-height: 100%;
}

.grid-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  background-image: 
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0px, rgba(255, 255, 255, 0.1) 1px, transparent 1px, transparent 96px),
    repeating-linear-gradient(90deg, transparent 0px, transparent 24px, rgba(255, 255, 255, 0.03) 24px, rgba(255, 255, 255, 0.03) 25px);
  /* The first gradient draws solid lines for measures every 96px */
  /* The second gradient draws dashed/faint lines for beats, let's just make them faint lines for now (or a dashed pattern) */
  /* Wait, linear-gradient dashed lines are complex, adjusting alpha is cleaner: 96px is measure, 24px is beat */
}

/* Let's redefine grid-bg accurately */
.grid-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
  /* SVG background defining 1 measure (96px) with 4 beats. Measure line is solid, beat lines are dashed */
  background-image: url("data:image/svg+xml,%3Csvg width='96' height='8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M24 0v8M48 0v8M72 0v8' stroke='rgba(255,255,255,0.1)' stroke-dasharray='4 4' fill='none'/%3E%3Cpath d='M0 0v8' stroke='rgba(255,255,255,0.25)' fill='none'/%3E%3C/svg%3E");
  background-repeat: repeat;
}

.track-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: -1;
}

.track-stripe {
  border-bottom: 1px solid var(--ou-border);
  box-sizing: border-box;
}
.track-stripe:nth-child(even) {
  background: var(--ou-bg-alt);
}
.track-stripe:nth-child(odd) {
  background: var(--ou-bg);
}

.part-block {
  position: absolute;
  background: rgba(78, 166, 234, 0.2);
  border: 1px solid rgba(78, 166, 234, 0.4);
  color: var(--ou-fg);
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.part-block:hover {
  background: rgba(78, 166, 234, 0.3);
}

.part-block.selected {
  border: 1px solid #FFFFFF;
  background: rgba(78, 166, 234, 0.4);
}

.part-name {
  font-size: 11px;
  padding: 2px 4px;
  background: rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

.part-waveform {
  flex: 1;
  /* Fake placeholder for actual notes/waveform draw inside logic */
  opacity: 0.5;
  background: repeating-linear-gradient(90deg, transparent, transparent 4px, var(--ou-accent) 4px, var(--ou-accent) 5px);
  margin-top: 2px;
}
</style>
