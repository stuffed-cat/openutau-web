<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  id: string;
  title: string;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  isOverview: boolean;
  isExternal?: boolean;
  index: number;
  monitorId: string;
}>();

const emit = defineEmits<{
  (e: 'close', id: string): void;
  (e: 'resize', id: string, width: number, height: number): void;
  (e: 'move', id: string, x: number, y: number): void;
  (e: 'overview-drop', id: string, clientX: number, clientY: number, sourceMonitorId: string): void;
  (e: 'click'): void;
}>();

const isDragging = ref(false);
const isResizing = ref(false);
const startOffset = ref({ x: 0, y: 0 });
const resizeStartSize = ref({ w: 0, h: 0 });
const resizeStartPos = ref({ x: 0, y: 0 });

const onMouseDown = (event: MouseEvent) => {
  if (props.isOverview) return;
  isDragging.value = true;
  startOffset.value = { x: event.clientX - props.x, y: event.clientY - props.y };
  
  // 关键修复：绑定当前所在的浏览器物理窗口，支持双屏多开的事件接管
  const targetWin = (event.target as HTMLElement).ownerDocument.defaultView || window;

  const mouseUpLocal = (e: MouseEvent) => {
    isDragging.value = false;
    targetWin.removeEventListener('mousemove', onMouseMove);
    targetWin.removeEventListener('mouseup', mouseUpLocal);
  };

  targetWin.addEventListener('mousemove', onMouseMove);
  targetWin.addEventListener('mouseup', mouseUpLocal);
};

const onResizeMouseDown = (event: MouseEvent) => {
  if (props.isOverview) return;
  isResizing.value = true;
  resizeStartPos.value = { x: event.clientX, y: event.clientY };
  resizeStartSize.value = { w: props.width, h: props.height };
  
  const targetWin = (event.target as HTMLElement).ownerDocument.defaultView || window;

  const mouseUpLocal = (e: MouseEvent) => {
    isResizing.value = false;
    targetWin.removeEventListener('mousemove', onMouseMove);
    targetWin.removeEventListener('mouseup', mouseUpLocal);
  };

  targetWin.addEventListener('mousemove', onMouseMove);
  targetWin.addEventListener('mouseup', mouseUpLocal);
};

const onMouseMove = (event: MouseEvent) => {
  if (isDragging.value) {
    emit('move', props.id, event.clientX - startOffset.value.x, event.clientY - startOffset.value.y);
  } else if (isResizing.value) {
    const newW = Math.max(300, resizeStartSize.value.w + (event.clientX - resizeStartPos.value.x));
    const newH = Math.max(200, resizeStartSize.value.h + (event.clientY - resizeStartPos.value.y));
    emit('resize', props.id, newW, newH);
  }
};

const closeWindow = () => {
  emit('close', props.id);
};

// --- 概览模式下拖拽窗口缩略图逻辑 ---
const isOverviewDragging = ref(false);
const overviewDragPos = ref({ x: 0, y: 0 });
let hasMovedInOverview = false;

const onOverviewMouseDown = (event: MouseEvent) => {
  isOverviewDragging.value = true;
  hasMovedInOverview = false;
  overviewDragPos.value = { x: 0, y: 0 };
  
  const targetWin = (event.target as HTMLElement).ownerDocument.defaultView || window;

  const mouseUpLocal = (e: MouseEvent) => {
    isOverviewDragging.value = false;
    targetWin.removeEventListener('mousemove', onOverviewMouseMove);
    targetWin.removeEventListener('mouseup', mouseUpLocal);
    
    if (hasMovedInOverview) {
      emit('overview-drop', props.id, e.clientX, e.clientY, props.monitorId);
    } else {
      emit('click');
    }
    overviewDragPos.value = { x: 0, y: 0 };
  };

  targetWin.addEventListener('mousemove', onOverviewMouseMove);
  targetWin.addEventListener('mouseup', mouseUpLocal);
};

const onOverviewMouseMove = (event: MouseEvent) => {
  if (isOverviewDragging.value) {
    if (Math.abs(event.movementX) > 2 || Math.abs(event.movementY) > 2) {
      hasMovedInOverview = true;
    }
    overviewDragPos.value.x += event.movementX;
    overviewDragPos.value.y += event.movementY;
  }
};

const targetElement = ref<HTMLElement | null>(null);

const overviewStyle = computed(() => {
  if (!props.isOverview) {
    return {
      left: props.x + 'px',
      top: props.y + 'px',
      width: props.width + 'px',
      height: props.height + 'px',
      transform: 'scale(1) translate(0,0)',
      zIndex: 100 + props.index,
    };
  }

  const columns = 3;
  const col = props.index % columns;
  const row = Math.floor(props.index / columns);
  
  const scale = 0.5;
  const targetWin = targetElement.value?.ownerDocument?.defaultView || window;
  const vw = targetWin.innerWidth;
  const vh = targetWin.innerHeight;
  
  const cellWidth = props.width * scale;
  const cellHeight = props.height * scale;
  
  let targetX = 0;
  let targetY = 0;
  
  if (props.monitorId === 'main') {
    const cols = 2;
    const col = props.index % cols;
    const row = Math.floor(props.index / cols);
    const gap = 50;
    
    const startX = vw / 2 - (cellWidth * cols + gap * (cols - 1)) / 2;
    const startY = Math.max(300, vh * 0.35); // offset below overview UI

    targetX = startX + col * (cellWidth + gap) + overviewDragPos.value.x;
    targetY = startY + row * (cellHeight + gap) + overviewDragPos.value.y;
  } else {
    // Center it in the external physical monitor
    const startX = vw / 2 - cellWidth / 2;
    const startY = Math.max(300, vh * 0.35);
    targetX = startX + overviewDragPos.value.x;
    targetY = startY + overviewDragPos.value.y;
  }
  
  return {
    left: '0px',
    top: '0px',
    width: props.width + 'px',
    height: props.height + 'px',
    transform: `translate(${targetX}px, ${targetY}px) scale(${scale})`,
    zIndex: isOverviewDragging.value ? 2000 : (1000 + props.index), 
    boxShadow: isOverviewDragging.value ? '0 20px 60px rgba(0,0,0,0.9)' : '0 10px 40px rgba(0,0,0,0.8)',
    transition: isOverviewDragging.value ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s ease',
  };
});
</script>

<template>
  <div 
    ref="targetElement"
    v-show="visible" 
    class="floating-window" 
    :class="{ 'in-overview': isOverview }"
    :style="overviewStyle"
  >
    <div class="window-header" @mousedown="onMouseDown">
      <span class="title">{{ title || 'OpenUtau Window' }}</span>
      <div class="window-controls">
        <button class="control-btn close-btn" @click.stop="closeWindow" title="关闭">✕</button>
      </div>
    </div>
    <div class="window-content">
      <slot></slot>
    </div>
    <div v-show="!isOverview" class="resize-handle" @mousedown.stop="onResizeMouseDown"></div>
    
    <!-- 概览模式事件覆盖层，接管事件(关键)并且禁止它触发奇怪的URL解析 -->
    <div 
      v-if="isOverview" 
      class="overview-cover"
      @mousedown.prevent="onOverviewMouseDown"
    >
      <div class="overview-title">{{ title }}</div>
    </div>
  </div>
</template>

<style scoped>
.floating-window {
  position: absolute;
  min-width: 300px;
  min-height: 200px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform-origin: top left;
  will-change: transform;
}

.floating-window.in-overview:hover {
  outline: 3px solid #3584e4; 
}

.window-header {
  height: 32px;
  background: #1e1e1e;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  cursor: grab;
  user-select: none;
}

.window-header:active {
  cursor: grabbing;
}

.title {
  color: #ccc;
  font-size: 14px;
}

.window-controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.control-btn:hover {
  color: #fff;
}

.close-btn:hover {
  color: #ff5555;
}

.window-content {
  flex: 1;
  background: #222;
  position: relative;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  color: #fff;
  overflow: hidden;
}

.resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 15px;
  height: 15px;
  cursor: se-resize;
  z-index: 10;
}

.overview-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding-bottom: 20px;
  background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 30%);
  cursor: grab;
}

.overview-cover:active {
  cursor: grabbing;
}

.overview-title {
  color: white;
  font-size: 32px;
  font-weight: bold;
  text-shadow: 0 2px 10px rgba(0,0,0,0.8);
  pointer-events: none;
}
</style>
