<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import FloatingWindow from './components/FloatingWindow.vue';

const mainWasmUrl = ref('/openutau/index.html');
const wasmIframe = ref<HTMLIFrameElement | null>(null);

interface ManagedWindow {
  id: string;
  title: string;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  monitorId: string;
}

const windows = ref<Record<string, ManagedWindow>>({
  'main': {
    id: 'main',
    title: 'OpenUtau',
    visible: true,
    x: 80,
    y: 80,
    width: 1100,
    height: 700,
    monitorId: 'main'
  }
});

interface MonitorContext {
  id: string;
  desktop: HTMLElement;
  uiLayer: HTMLElement;
  ws: HTMLElement;
}
const externalMonitors = ref(new Map<string, MonitorContext>());

const isOverview = ref(false);

const toggleOverview = () => {
  isOverview.value = !isOverview.value;
};

// 同步状态到那些我们手动生成的DOM容器
watch(isOverview, (val) => {
  for (const [id, ctx] of externalMonitors.value.entries()) {
    ctx.desktop.className = val ? 'wm-desktop overview-active' : 'wm-desktop';
  }
});

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Meta' || e.key === 'OS') {
    toggleOverview();
  }
};

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);

  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'WM_EVENT') {
      const { action, payload } = event.data;
      const payloadParts = typeof payload === 'string' ? payload.split('|') : [];
      const windowId = payloadParts[0];

      if (action === 'CREATE') {
        const offset = Object.keys(windows.value).length * 30;
        windows.value[windowId] = {
          id: windowId,
          title: 'Loading...',
          visible: false,
          x: 150 + offset, 
          y: 70 + offset,
          width: 800,
          height: 600,
          monitorId: 'main'
        };
      } else if (action === 'SET_TITLE') {
        if (windows.value[windowId]) {
          windows.value[windowId].title = payloadParts[1] || 'OpenUtau Window';
        }
      } else if (action === 'SHOW') {
        if (windows.value[windowId]) {
          windows.value[windowId].visible = true;
        }
      } else if (action === 'HIDE') {
        if (windows.value[windowId]) {
          windows.value[windowId].visible = false;
        }
      }
    }
  });

  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});

const onWindowClose = (id: string) => {
  if (windows.value[id]) {
    delete windows.value[id];
    // physical display cleanup handled when closing the physical window
    if (wasmIframe.value && wasmIframe.value.contentWindow) {
      wasmIframe.value.contentWindow.postMessage({ type: 'WM_CMD', cmd: 'CLOSE', windowId: id }, '*');
    }
  }
};

const onWindowMove = (id: string, x: number, y: number) => {
  if (windows.value[id] && !isOverview.value) {
    windows.value[id].x = x;
    windows.value[id].y = y;
  }
};

const onWindowOverviewDrop = (id: string, clientX: number, clientY: number, sourceMonitorId: string = 'main') => {
  let doc = document;
  if (sourceMonitorId !== 'main' && externalMonitors.value.has(sourceMonitorId)) {
    doc = externalMonitors.value.get(sourceMonitorId)!.desktop.ownerDocument;
  }

  const targets = doc.querySelectorAll('.workspace-target');
  let targetId: string | null = null;

  const padding = 20; 
  for (let i = 0; i < targets.length; i++) {
    const rect = targets[i].getBoundingClientRect();
    if (clientX >= rect.left - padding && clientX <= rect.right + padding &&
        clientY >= rect.top - padding && clientY <= rect.bottom + padding) {
       targetId = targets[i].getAttribute('data-mid') || 'new';
       break;
    }
  }
  
  if (targetId === 'new') {
    const newMonitorId = 'disp_' + Date.now();
    windows.value[id].monitorId = newMonitorId;

    const newScreenLeft = window.screenX + window.outerWidth + 10;
    const newScreenTop = window.screenY;
    
    const monitorWin = window.open('about:blank', newMonitorId, `location=no,menubar=no,status=no,width=1280,height=768,left=${newScreenLeft},top=${newScreenTop}`);
    if (monitorWin) {
       monitorWin.document.title = "OpenUtau Display";
       monitorWin.document.body.style.margin = '0';
       
       document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
          monitorWin.document.head.appendChild(node.cloneNode(true));
       });

       monitorWin.document.addEventListener('dragover', (e) => e.preventDefault());
       monitorWin.document.addEventListener('drop', (e) => e.preventDefault());

       const mDoc = monitorWin.document;
       
       const desktopDOM = mDoc.createElement('div');
       desktopDOM.className = isOverview.value ? 'wm-desktop overview-active' : 'wm-desktop';

       const uiLayer = mDoc.createElement('div');
       uiLayer.id = 'ui-layer-' + newMonitorId;
       uiLayer.className = 'wm-ui-layer';
       desktopDOM.appendChild(uiLayer);

       const wsTarget = mDoc.createElement('div');
       wsTarget.className = 'workspace-area';
       desktopDOM.appendChild(wsTarget);

       mDoc.body.appendChild(desktopDOM);

       externalMonitors.value.set(newMonitorId, { id: newMonitorId, desktop: desktopDOM, uiLayer, ws: wsTarget });
       
       windows.value[id].x = 50;
       windows.value[id].y = 50;

       monitorWin.addEventListener('beforeunload', () => {
           for (const w of Object.values(windows.value)) {
               if (w.monitorId === newMonitorId) w.monitorId = 'main';
           }
           const map = new Map(externalMonitors.value);
           map.delete(newMonitorId);
           externalMonitors.value = map;
       });
    }
  } else if (targetId) {
    if (windows.value[id]) {
      windows.value[id].monitorId = targetId;
      // Offset slightly to make it visible
      windows.value[id].x = 100;
      windows.value[id].y = 100;
    }
  }
  isOverview.value = false;
};

const onWindowResize = (id: string, w: number, h: number) => {
  if (windows.value[id] && !isOverview.value) {
    windows.value[id].width = w;
    windows.value[id].height = h;
  }
};
</script>

<template>
  <div class="wm-desktop" :class="{ 'overview-active': isOverview }">
    <div id="main-ui-layer" class="wm-ui-layer"></div>

    <div class="workspace-area" id="main-workspace-mount">
      <div class="main-background">
        <!-- 主程序不再作为全屏背景被绕过，而是作为常规窗口进入FloatingWindow中！ -->
        <div v-show="isOverview" class="iframe-overlay" @click="isOverview = false"></div>
      </div>

      <template v-for="(win, id, index) in windows" :key="id">
        <Teleport v-if="win" :to="win.monitorId !== 'main' && externalMonitors.has(win.monitorId) ? externalMonitors.get(win.monitorId).ws : '#main-workspace-mount'" :disabled="win.monitorId === 'main' || !externalMonitors.has(win.monitorId)">
          <FloatingWindow 
            :id="win.id"
            :title="win.title"
            :visible="win.visible"
            :x="win.x"
            :y="win.y"
            :width="win.width"
            :height="win.height"
            :index="index"
            :is-overview="isOverview"
            :is-external="win.monitorId !== 'main'"
            :monitor-id="win.monitorId || 'main'"
            @close="onWindowClose"
            @move="onWindowMove"
            @overview-drop="onWindowOverviewDrop"
            @resize="onWindowResize"
            @click="isOverview = false"
          >
            <!-- 主应用程序独占 iframe 作为渲染容器 -->
            <iframe v-if="win.id === 'main'" ref="wasmIframe" class="wasm-view" :src="mainWasmUrl" frameborder="0" allowfullscreen></iframe>
            <!-- 其他子窗口或扩展将挂载到这里 -->
            <div v-else :id="'wm-child-surface-' + win.id" class="child-wasm-view"></div>
            <div v-if="isOverview && win.monitorId === 'main'" class="iframe-overlay"></div>
          </FloatingWindow>
        </Teleport>
      </template>
    </div>
  </div>

  <!-- Render UI fully on all displays simultaneously (Main + Externals) -->
  <template v-for="displayId in ['main', ...Array.from(externalMonitors.keys())]" :key="displayId">
    <Teleport :to="displayId === 'main' ? '#main-ui-layer' : externalMonitors.get(displayId).uiLayer">
      
      <div class="top-bar">
        <div class="activities-btn" @click="toggleOverview">
          {{ isOverview ? '返回屏幕' : '活动' }}
        </div>
        <div class="clock">{{ new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}</div>
        <div class="system-tray">⚙️ {{ displayId === 'main' ? '主屏幕' : displayId.slice(-4) }}</div>
      </div>

      <div class="wm-overview-ui" v-show="isOverview">
        <div class="search-container">
          <div class="search-bar">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <span>输入以搜索</span>
          </div>
        </div>

        <div class="workspaces-row">
           <div class="workspace-card active workspace-target" data-mid="main" title="主工作区">
             <div class="ws-preview">
               <div 
                 v-for="win in Object.values(windows).filter(w => w.monitorId === 'main')" 
                 :key="'mini-'+win.id" 
                 class="mini-window-preview"
                 :style="{
                    left: `${(win.x / 1920) * 100}%`,
                    top: `${(win.y / 1080) * 100}%`,
                    width: `${(win.width / 1920) * 100}%`,
                    height: `${(win.height / 1080) * 100}%`
                 }">
               </div>
               <span class="preview-label">主工作区</span>
             </div>
           </div>
           
           <div v-for="[mId, ctx] in externalMonitors" :key="mId" class="workspace-card workspace-target" :data-mid="mId">
             <div class="ws-preview">
               <div 
                 v-for="win in Object.values(windows).filter(w => w.monitorId === mId)" 
                 :key="'mini-ext-'+win.id"
                 class="mini-window-preview"
                 :style="{
                    left: `${(win.x / 1280) * 100}%`,
                    top: `${(win.y / 768) * 100}%`,
                    width: `${(win.width / 1280) * 100}%`,
                    height: `${(win.height / 768) * 100}%`
                 }">
               </div>
               <span class="preview-label">扩展屏 {{ mId.slice(-4) }}</span>
             </div>
           </div>

           <div class="workspace-card new-workspace-target workspace-target" data-mid="new" title="拖拽至此创建物理外接显示器">
             <div class="ws-preview empty-preview">
                <svg viewBox="0 0 24 24" width="32" height="32" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" fill="none" class="plus-icon"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
             </div>
           </div>
        </div>
      </div>

    </Teleport>
  </template>
</template>

<style>
body {
  margin: 0;
  overflow: hidden;
  background-color: #242424;
}

.wm-desktop {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: #242424;
  display: flex;
  flex-direction: column;
  font-family: system-ui, -apple-system, sans-serif;
  transition: background-color 0.3s ease;
  user-select: none;
}

.wm-desktop.overview-active {
  background-color: #1a1a1a;
}

.wm-ui-layer {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none;
  z-index: 5000;
}

.top-bar {
  height: 28px;
  background-color: rgba(0, 0, 0, 0.85);
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
  pointer-events: auto;
}

.activities-btn {
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 14px;
  transition: background 0.2s;
}
.activities-btn:hover { background-color: rgba(255, 255, 255, 0.15); }

.clock {
  font-weight: 600;
}

.workspace-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  perspective: 1000px;
}

.main-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transform-origin: center center;
}

.wm-desktop.overview-active .main-background {
  border-radius: 20px;
  transform: scale(0.9);
  filter: brightness(0.6);
  pointer-events: none;
}

/* WM Overview UI Layout (Horizontal Workspaces) */
.wm-overview-ui {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 8000;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.search-container {
  margin-top: 30px;
  pointer-events: auto;
}

.search-bar {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 8px 120px 8px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #ccc;
  font-size: 14px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.workspaces-row {
  margin-top: 30px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 16px;
  pointer-events: auto;
}

.workspace-card {
  width: 240px;
  height: 135px;
  border-radius: 12px;
  transition: all 0.2s;
  background: transparent;
  padding: 4px; /* for focus ring */
  box-sizing: border-box;
}

.workspace-card.active {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 14px;
}

.workspace-card.active .ws-preview {
  outline: 3px solid #3584e4;
  outline-offset: 1px;
}

.ws-preview {
  width: 100%; height: 100%;
  background: #1e1e1e;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  transition: all 0.2s;
}

.mini-window-preview {
  position: absolute;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.5);
  transition: all 0.2s;
}

.preview-label {
  position: absolute;
  bottom: 8px;
  left: 0;
  width: 100%;
  text-align: center;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
  pointer-events: none;
}

.workspace-card:not(.active):hover .ws-preview {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.4);
}

.empty-preview {
  background: rgba(255,255,255,0.02);
  border: 2px solid rgba(255,255,255,0.1);
  box-shadow: none;
  display: flex !important;
  justify-content: center;
  align-items: center;
}

.workspace-card:hover .empty-preview {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.3);
}

.new-workspace-target .plus-icon {
  transition: all 0.2s;
}
.workspace-card:hover .plus-icon {
  stroke: rgba(255,255,255,0.8);
  transform: scale(1.1);
}

.wasm-view { width: 100%; height: 100%; border: none; display: block; }
.child-wasm-view { width: 100%; height: 100%; border: none; display: block; background: #222; }
.iframe-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; cursor: pointer; }
</style>
