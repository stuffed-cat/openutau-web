<script setup lang="ts">
import { computed, ref, toRaw } from 'vue';
import { useOpenUtau } from '../composables/useOpenUtau';
import type { PartProperties } from '../types/openutau';

const { state, selectPart, performAddPart, performMovePart, performResizePart } = useOpenUtau();

const TRACK_HEIGHT = 104; // Same as TrackHeaderCanvas
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

function onTrackClick(event: MouseEvent, trackIndex: number) {
  if (trackIndex >= state.tracks.length) return; // Ignore if clicked on empty space beyond tracks

  // Calculate position in ticks
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  
  const positionTick = Math.max(0, Math.floor(offsetX / PIXELS_PER_TICK));
  
  // Snap to nearest beat (480 ticks = 1 quarter down)
  const snapTick = Math.floor(positionTick / 480) * 480;
  
  // Default duration = 7680 (4 measures of 4/4)
  performAddPart(trackIndex, snapTick, 7680);
}

const draggingPart = ref<{
  partNo: number,
  startX: number,
  startY: number,
  startPosition: number,
  startTrackNo: number,
  startDuration?: number,
  type: 'move' | 'resize' | null
}>({
  partNo: -1,
  startX: 0,
  startY: 0,
  startPosition: 0,
  startTrackNo: 0,
  type: null
});

function startDrag(part: PartProperties, e: MouseEvent) {
  // To avoid triggering default select and causing issues, but we still want to select it
  selectPart(part.partNo);
  draggingPart.value = {
    partNo: part.partNo,
    startX: e.clientX,
    startY: e.clientY,
    startPosition: part.position,
    startTrackNo: part.trackNo,
    type: 'move'
  };
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function startResize(part: PartProperties, e: MouseEvent) {
  selectPart(part.partNo);
  draggingPart.value = {
    partNo: part.partNo,
    startX: e.clientX,
    startY: e.clientY,
    startPosition: part.position,
    startTrackNo: part.trackNo,
    startDuration: part.duration,
    type: 'resize'
  };
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e: MouseEvent) {
  if (draggingPart.value.partNo < 0) return;
  const part = state.parts.find(p => p.partNo === draggingPart.value.partNo);
  if (!part) return;

  const dx = e.clientX - draggingPart.value.startX;
  const dy = e.clientY - draggingPart.value.startY;

  if (draggingPart.value.type === 'move') {
    const tickDelta = dx / PIXELS_PER_TICK;
    const trackDelta = Math.floor((dy + (TRACK_HEIGHT / 2)) / TRACK_HEIGHT);

    let newPosition = draggingPart.value.startPosition + tickDelta;
    const snapTick = Math.max(0, Math.floor(newPosition / 480) * 480);
    
    let newTrackNo = draggingPart.value.startTrackNo + trackDelta;
    newTrackNo = Math.max(0, Math.min(newTrackNo, state.tracks.length - 1));

    part.position = snapTick;
    part.trackNo = newTrackNo;
  } else if (draggingPart.value.type === 'resize') {
    const tickDelta = dx / PIXELS_PER_TICK;
    let newDuration = draggingPart.value.startDuration! + tickDelta;
    const snapDuration = Math.max(480, Math.floor(newDuration / 480) * 480);

    part.duration = snapDuration;
  }
}

async function onMouseUp(e: MouseEvent) {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);

  const dragInfo = toRaw(draggingPart.value);
  if (dragInfo.partNo < 0) return;

  const part = state.parts.find(p => p.partNo === dragInfo.partNo);
  draggingPart.value.partNo = -1;

  if (!part) return;

  if (dragInfo.type === 'move') {
    if (part.position !== dragInfo.startPosition || part.trackNo !== dragInfo.startTrackNo) {
      await performMovePart(part.partNo, part.trackNo, part.position);
    }
  } else if (dragInfo.type === 'resize') {
    if (part.duration !== dragInfo.startDuration) {
      await performResizePart(part.partNo, part.duration);
    }
  }
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
          @click="onTrackClick($event, i - 1)"
        ></div>
      </div>
      
      <!-- Render Parts -->
      <div 
        v-for="part in state.parts" 
        :key="part.partNo"
        class="part-block"
        :class="{ selected: state.selectedPartNo === part.partNo }"
        :style="getPartStyle(part)"
        @mousedown.stop="startDrag(part, $event)"
      >
        <span class="part-name">{{ part.name || `Part ${part.partNo}` }}</span>
        <div class="part-waveform"></div>
        <div class="part-resize-handle" @mousedown.stop="startResize(part, $event)"></div>
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
  z-index: 1;
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
  z-index: 0;
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
  background: var(--ou-accent);
  border: none;
  color: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.part-block:hover {
  filter: brightness(1.1);
}

.part-block.selected {
  background: #FF679D; /* OpenUtau AccentColor2 for Selected Part */
  border: none;
}

.part-block.selected:hover {
  filter: brightness(1.1);
}

.part-name {
  font-size: 12px;
  padding: 2px 3px;
  background: inherit;
  color: #ffffff;
  white-space: nowrap;
  z-index: 10;
  position: relative;
  align-self: flex-start;
  border-bottom-right-radius: 4px;
}

.part-waveform {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.8;
  /* Temporary fake white graphic representing voice notes */
  background: repeating-linear-gradient(90deg, transparent, transparent 12px, rgba(255, 255, 255, 0.9) 12px, rgba(255, 255, 255, 0.9) 24px);
  background-position: 0 60%;
  background-size: 100% 3px;
  background-repeat: no-repeat;
  pointer-events: none;
  z-index: 1;
}

.part-resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  z-index: 20;
}
</style>
