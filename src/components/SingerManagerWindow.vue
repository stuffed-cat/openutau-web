<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useOpenUtau } from '../composables/useOpenUtau';
import { getSingers, getSingerOtos, getOtoSampleFile, analyzeWaveform } from '../api/openutau';

const { toggleSingerManager } = useOpenUtau();

const singers = ref<any[]>([]);
const otos = ref<any[]>([]);
const selectedSingerId = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const selectedOto = ref<any>(null);
const audioCanvas = ref<HTMLCanvasElement | null>(null);
const isAudioLoading = ref(false);
const audioDurationMs = ref(1000);

const selectedSinger = computed(() => 
  singers.value.find(s => s.id === selectedSingerId.value) || null
);

async function loadSingers() {
  loading.value = true;
  error.value = null;
  try {
    const data = await getSingers();
    singers.value = Array.isArray(data) ? data : (data.singers || []);
    if (singers.value.length > 0 && !selectedSingerId.value) {
      selectedSingerId.value = singers.value[0].id;
    }
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function loadOtos(id: string) {
  otos.value = [];
  try {
    otos.value = await getSingerOtos(id);
  } catch (e) {
    console.error("Failed to load OTOs", e);
  }
}

watch(selectedSingerId, (newId) => {
  if (newId) {
    selectedOto.value = null;
    loadOtos(newId);
  }
});

onMounted(() => {
  loadSingers();
});

function getAvatarUrl(singerId: string) {
  return `/api/singers/${encodeURIComponent(singerId)}/image`;
}

async function onSelectOto(oto: any) {
  selectedOto.value = oto;
  if (!oto || !selectedSingerId.value) return;

  isAudioLoading.value = true;
  try {
    const blob = await getOtoSampleFile(selectedSingerId.value, oto.set || '', oto.alias || '');
    
    // We optionally decode audio purely to measure its accurate duration
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    audioDurationMs.value = audioBuffer.duration * 1000;

    const waveBlob = new Blob([arrayBuffer], { type: blob.type });
    const waveData = await analyzeWaveform(waveBlob, 1000);

    await nextTick();
    drawWaveformAndOto(waveData.maxWaveform, waveData.minWaveform);
  } catch (e) {
    console.error("Failed to load or analyze sample", e);
  } finally {
    isAudioLoading.value = false;
  }
}

function drawWaveformAndOto(maxArr: number[], minArr: number[]) {
  if (!audioCanvas.value) return;
  const canvas = audioCanvas.value;
  const parent = canvas.parentElement;
  if (parent) {
     canvas.width = parent.clientWidth;
     canvas.height = parent.clientHeight;
  }
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const w = canvas.width;
  const h = canvas.height;
  
  ctx.clearRect(0, 0, w, h);
  
  if (maxArr && maxArr.length > 0) {
    const centerY = h / 2;
    const scaleY = h / 2;
    
    ctx.fillStyle = '#4b6eaf';
    ctx.beginPath();
    for (let i = 0; i < maxArr.length; i++) {
       const x = (i / maxArr.length) * w;
       const y = centerY - (maxArr[i] * scaleY);
       if (i === 0) ctx.moveTo(x, y);
       else ctx.lineTo(x, y);
    }
    for (let i = minArr.length - 1; i >= 0; i--) {
       const x = (i / minArr.length) * w;
       const y = centerY - (minArr[i] * scaleY);
       ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  const oto = selectedOto.value;
  if (oto && audioDurationMs.value > 0) {
    const total = audioDurationMs.value;
    const offsetMs = oto.offset || 0;
    const consMs = offsetMs + (oto.consonant || 0);
    const preMs = offsetMs + (oto.preutter || 0);
    const ovlMs = offsetMs + (oto.overlap || 0);
    
    let cutoffMs = oto.cutoff || 0;
    if (cutoffMs < 0) {
      cutoffMs = total + cutoffMs;
    } else {
      cutoffMs = offsetMs + cutoffMs;
    }
    
    const drawLine = (ms: number, color: string) => {
      const x = (ms / total) * w;
      ctx.strokeStyle = color;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    };

    const drawRect = (msStart: number, msEnd: number, color: string) => {
      const xStart = (msStart / total) * w;
      const xEnd = (msEnd / total) * w;
      ctx.fillStyle = color;
      ctx.fillRect(xStart, 0, xEnd - xStart, h);
    };

    // Draw parameters
    drawRect(0, offsetMs, 'rgba(0, 0, 0, 0.4)'); // Before Offset
    if (cutoffMs > 0 && cutoffMs < total) {
      drawRect(cutoffMs, total, 'rgba(255, 0, 0, 0.2)'); // After Cutoff
    }
    
    drawLine(offsetMs, '#00f');   // Offset: Blue
    drawLine(consMs, '#f0f');     // Consonant: Pink
    drawLine(preMs, '#f00');      // Preutter: Red
    drawLine(ovlMs, '#0f0');      // Overlap: Green
    if (cutoffMs > 0 && cutoffMs < total) {
      drawLine(cutoffMs, '#00f'); // Cutoff: Blue
    }
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="toggleSingerManager(false)">
    <div class="modal-window">
      <div class="modal-header">
        <span class="title">歌手 (Singers)</span>
        <button class="close-btn" @click="toggleSingerManager(false)">×</button>
      </div>
      
      <div class="modal-body">
        <div v-if="error" class="error">{{ error }}</div>
        
        <!-- Top Pane (140px min height) -->
        <div class="pane top-pane">
          <!-- Left side: Avatar + Combobox + Info -->
          <div class="top-left">
            <div class="avatar-block">
              <img v-if="selectedSingerId" :src="getAvatarUrl(selectedSingerId)" @error="($event.target as HTMLImageElement).style.display='none'" />
            </div>
            <div class="info-block">
              <select class="ou-select" v-model="selectedSingerId">
                <option v-for="s in singers" :key="s.id" :value="s.id">{{ s.name || s.id }}</option>
              </select>
              
              <div class="info-text">
                <template v-if="selectedSinger">
                  Author: {{ selectedSinger.author }}<br>
                  Version: {{ selectedSinger.version }}<br>
                  Singer Type: {{ selectedSinger.singerType }}
                </template>
              </div>

              <div class="toolbar">
                <button class="ou-button">打开文件夹位置</button>
                <button class="ou-button icon-btn">⚙</button>
                <input class="ou-input" type="text" placeholder="搜索别名 (Search alias)" />
              </div>
            </div>
          </div>
          
          <!-- Right side: Subbanks Grid -->
          <div class="top-right">
            <div class="table-container header-table">
              <table class="ou-table">
                <thead>
                  <tr>
                    <th>前缀 (Prefix)</th>
                    <th>后缀 (Suffix)</th>
                    <th>音高范围 (Tone Ranges)</th>
                    <th>颜色 (Color)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(sb, i) in (selectedSinger?.subbanks || [])" :key="i">
                    <td>{{ sb.prefix }}</td>
                    <td>{{ sb.suffix }}</td>
                    <td>{{ sb.toneSet || '' }}</td>
                    <td>{{ sb.name || sb.color }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="toolbar align-right" style="margin-top: 5px;">
               <button class="ou-button">编辑子音源 (Edit Subbanks)</button>
            </div>
          </div>
        </div>

        <div class="h-splitter"></div>

        <!-- Middle Pane (Oto Grid) -->
        <div class="pane middle-pane">
           <div class="table-container autoscroll">
              <table class="ou-table">
                <thead>
                  <tr>
                    <th>别名</th>
                    <th>Set</th>
                    <th>文件</th>
                    <th>音标</th>
                    <th>前缀</th>
                    <th>后缀</th>
                    <th>颜色</th>
                    <th>Offset</th>
                    <th>Consonant</th>
                    <th>Cutoff</th>
                    <th>Preutter</th>
                    <th>Overlap</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(oto, i) in otos" :key="i"
                      :class="{ selected: selectedOto === oto }"
                      @click="onSelectOto(oto)">
                    <td>{{ oto.alias }}</td>
                    <td>{{ oto.set }}</td>
                    <td>{{ oto.file }}</td>
                    <td>{{ oto.phonetic }}</td>
                    <td>{{ oto.prefix }}</td>
                    <td>{{ oto.suffix }}</td>
                    <td>{{ oto.color }}</td>
                    <td>{{ oto.offset }}</td>
                    <td>{{ oto.consonant }}</td>
                    <td>{{ oto.cutoff }}</td>
                    <td>{{ oto.preutter }}</td>
                    <td>{{ oto.overlap }}</td>
                  </tr>
                </tbody>
              </table>
           </div>
        </div>

        <div class="h-splitter"></div>

        <!-- Bottom Pane (Waveform rendered via Backend Analysis API) -->
        <div class="pane bottom-pane">
           <div v-if="!selectedOto" class="bottom-placeholder">
             [ 请在上方选择一个 OTO 别名预览波形 ]
           </div>
           <div v-else-if="isAudioLoading" class="bottom-placeholder">
             正在通过后端分析音频波形...
           </div>
           <canvas v-show="selectedOto && !isAudioLoading" ref="audioCanvas" width="1050" height="240"></canvas>
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
  width: 1050px;
  min-width: 1050px;
  height: 640px;
  min-height: 640px;
  background: var(--ou-bg, #ffffff);
  color: var(--ou-text, #000000);
  border: 1px solid var(--ou-border, #ccc);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  display: flex; flex-direction: column;
  font-family: "Segoe UI", Tahoma, sans-serif;
  font-size: 13px;
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

.modal-body {
  flex: 1;
  display: flex; flex-direction: column;
  padding: 10px;
  min-height: 0;
}

/* Panes */
.pane {
  display: flex;
}

.top-pane {
  height: 140px; min-height: 140px;
  display: flex;
  gap: 10px;
}

.top-left {
  flex: 1;
  min-width: 555px;
  display: flex;
  gap: 10px;
}

.avatar-block {
  width: 100px; height: 100px;
  border: 1px solid var(--ou-border, #ccc);
  background: #f5f5f5;
  img { width: 100%; height: 100%; object-fit: cover; }
}

.info-block {
  flex: 1;
  display: flex; flex-direction: column; gap: 5px;
}

.info-text {
  flex: 1;
  border: 1px solid var(--ou-border, #ccc);
  padding: 5px;
  overflow-y: auto;
  background: var(--ou-bg-alt, #fafafa);
  white-space: pre-wrap;
}

.top-right {
  flex: 1;
  min-width: 300px;
  display: flex; flex-direction: column;
}

.header-table {
  flex: 1; overflow-y: auto;
  border: 1px solid var(--ou-border, #ccc);
}

.middle-pane {
  flex: 1;
  min-height: 160px;
  border: 1px solid var(--ou-border, #ccc);
  display: flex; flex-direction: column;
}

.bottom-pane {
  height: 240px; min-height: 240px;
  border: 1px solid var(--ou-border, #ccc);
  background: var(--ou-bg-alt, #fafafa);
  display: flex; justify-content: center; align-items: center;
  position: relative;
  overflow: hidden;

  canvas {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
  }
}

.bottom-placeholder {
  color: #888;
  z-index: 1;
}

.h-splitter {
  height: 10px; flex-shrink: 0;
}

/* UI Controls */
.ou-select {
  height: 24px;
  border: 1px solid var(--ou-border, #ccc);
  background: var(--ou-bg, #fff);
  color: inherit;
}

.ou-input {
  height: 24px; padding: 0 5px;
  border: 1px solid var(--ou-border, #ccc);
  background: var(--ou-bg, #fff);
  color: inherit;
  width: 160px;
}

.ou-button {
  height: 24px; padding: 0 10px;
  border: 1px solid var(--ou-border, #ccc);
  background: var(--ou-bg-alt, #f0f0f0);
  color: inherit;
  cursor: pointer;
  
  &:hover { background: var(--ou-bg-hover, #e5e5e5); }
}
.icon-btn { padding: 0 5px; }

.toolbar {
  display: flex; gap: 5px; align-items: center;
}
.align-right { justify-content: flex-end; }

/* Table */
.table-container {
  flex: 1; overflow: hidden; display: flex; flex-direction: column;
}
.autoscroll { overflow-y: auto; overflow-x: auto; }

.ou-table {
  width: 100%; border-collapse: collapse;
  
  th {
    background: var(--ou-bg-alt, #f5f5f5);
    border-right: 1px solid var(--ou-border, #ccc);
    border-bottom: 1px solid var(--ou-border, #ccc);
    text-align: left; padding: 2px 5px; font-weight: normal;
    white-space: nowrap;
    position: sticky; top: 0;
  }
  td {
    border-right: 1px solid var(--ou-border, #ccc);
    border-bottom: 1px solid var(--ou-border, #ccc);
    padding: 2px 5px; white-space: nowrap;
  }
  tr:nth-child(even) { background: rgba(0,0,0,0.02); }
  tr:hover { background: rgba(0,120,215,0.1); cursor: pointer; }
  tr.selected { background: rgba(0, 120, 215, 0.3) !important; }
}

@media (prefers-color-scheme: dark) {
  .modal-window { background: #2b2d30; color: #ddd; border-color: #1e1e1e; }
  .modal-header { background: #3c3f41; border-color: #1e1e1e; }
  .ou-select, .ou-input, .info-text, .ou-button, .header-table, .middle-pane, .bottom-pane { 
    background: #2b2d30; color: #ddd; border-color: #555; 
  }
  .ou-table th { background: #3c3f41; border-color: #555; color: #ddd; }
  .ou-table td { border-color: #555; }
  .ou-table tr:nth-child(even) { background: #323537; }
  .ou-table tr:hover { background: #4b6eaf; }
  .ou-button:hover { background: #444; }
}
</style>
