<script setup lang="ts">
import { ref } from 'vue';
import { useOpenUtau } from '../composables/useOpenUtau';
import { installPackage } from '../api/openutau';

const { projectTitle, createProjectSession, openProjectFile, exportMixdown, hasProject, performUndo, performRedo, toggleSingerManager } = useOpenUtau();
const fileInput = ref<HTMLInputElement | null>(null);
const packageInput = ref<HTMLInputElement | null>(null);
let installType: 'singer' | 'oudep' | 'wavtool' | 'resampler' | '' = '';

function handleFile() {
  fileInput.value?.click();
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    openProjectFile(file);
  }
  input.value = '';
}

function triggerInstall(type: 'singer' | 'oudep' | 'wavtool' | 'resampler') {
  installType = type;
  if (!packageInput.value) return;

  if (type === 'singer') {
    packageInput.value.accept = '.zip,.rar,.uar,.vogeon';
  } else if (type === 'oudep') {
    packageInput.value.accept = '.oudep';
  } else {
    packageInput.value.accept = '.exe,.sh';
  }
  
  packageInput.value.click();
}

async function onPackageSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    let exeType: 'wavtool' | 'resampler' | '' = '';
    if (installType === 'wavtool' || installType === 'resampler') {
      exeType = installType;
    } else if (installType === '' && (file.name.endsWith('.exe') || file.name.endsWith('.sh'))) {
      const promptRes = prompt("请输入引擎类型: 'wavtool' 或 'resampler'");
      if (promptRes === 'wavtool' || promptRes === 'resampler') {
        exeType = promptRes;
      }
    }

    await installPackage(file, exeType);
    alert('安装成功！重新加载可能需要一些时间。');
  } catch (err: any) {
    alert('安装失败: ' + err.message);
  } finally {
    input.value = '';
    installType = '';
  }
}
</script>

<template>
  <div class="titlebar">
    <div class="menu">
      
      <div class="menu-container">
        <button class="menu-item">文件</button>
        <div class="menu-dropdown">
          <div class="dropdown-item" @click="createProjectSession">新建工程</div>
          <div class="dropdown-item" @click="handleFile">打开工程...</div>
          <div class="dropdown-divider"></div>
          <div class="dropdown-item" :class="{ disabled: !hasProject }" @click="hasProject && exportMixdown('wav')">导出为音频 (WAV)</div>
        </div>
      </div>

      <div class="menu-container">
        <button class="menu-item">编辑</button>
        <div class="menu-dropdown">
          <div class="dropdown-item" :class="{ disabled: !hasProject }" @click="hasProject && performUndo()">撤销</div>
          <div class="dropdown-item" :class="{ disabled: !hasProject }" @click="hasProject && performRedo()">重做</div>
        </div>
      </div>

      <div class="menu-container">
        <button class="menu-item">视图</button>
        <div class="menu-dropdown">
          <div class="dropdown-item disabled">放大</div>
          <div class="dropdown-item disabled">缩小</div>
        </div>
      </div>
      
      <div class="menu-container">
        <button class="menu-item">工具</button>
        <div class="menu-dropdown">
          <div class="dropdown-item">界面布局 ▸</div>
          <div class="dropdown-item">全屏<span class="shortcut">F11</span></div>
          <div class="dropdown-item">清空缓存</div>
          <div class="dropdown-divider"></div>
          <div class="dropdown-item">调试窗口</div>
          <div class="dropdown-item">语音学助手</div>
          <div class="dropdown-divider"></div>
          <div class="dropdown-item" @click="toggleSingerManager(true)">歌手...</div>
          <div class="dropdown-item" @click="triggerInstall('singer')">安装歌手...</div>
          <div class="dropdown-item" @click="triggerInstall('oudep')">安装依赖项 (.oudep) ...</div>
          <div class="dropdown-item" @click="triggerInstall('wavtool')">安装 Wavtool (.exe/.sh)...</div>
          <div class="dropdown-item" @click="triggerInstall('resampler')">安装 Resampler (.exe/.sh)...</div>
          <div class="dropdown-divider"></div>
          <div class="dropdown-item disabled">使用偏好...</div>
        </div>
      </div>

      <div class="menu-container">
        <button class="menu-item">帮助</button>
        <div class="menu-dropdown">
          <div class="dropdown-item disabled">关于 OpenUtau Web</div>
        </div>
      </div>

    </div>
    
    <div class="title">{{ projectTitle }} - OpenUtau Web</div>
    
    <div class="controls">
      <span class="ctrl">─</span>
      <span class="ctrl">□</span>
      <span class="ctrl close">×</span>
    </div>
    
    <input type="file" ref="fileInput" hidden accept=".ustx,.mid" @change="onFileSelect" />
    <input type="file" ref="packageInput" hidden @change="onPackageSelect" />
  </div>
</template>

<style scoped lang="scss">
.titlebar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 30px;
  background: var(--ou-bg);
  border-bottom: 1px solid var(--ou-border);
  user-select: none;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.menu {
  display: flex;
  height: 100%;
}

.menu-container {
  position: relative;
  height: 100%;
}

.menu-item {
  height: 100%;
  padding: 0 12px;
  font-size: 13px;
  border-radius: 0;
  background: transparent;
  border: none;
  color: inherit;
  cursor: default;
}

.menu-item:hover {
  background: var(--ou-bg-hover);
}

.menu-dropdown {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  background: #ffffff; /* 模拟原版白色背景 */
  border: 1px solid var(--ou-border);
  min-width: 240px;
  z-index: 10000;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.15);
  padding: 5px 0;
}

.menu-container:hover .menu-dropdown {
  display: block;
}

.dropdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 20px;
  font-size: 13px;
  color: #333;
  cursor: default;
  white-space: nowrap;
}

.dropdown-item:hover:not(.disabled) {
  background: #dedede; /* 浅灰色高亮 */
  color: #000;
}

.dropdown-item.disabled {
  color: #999;
}

.dropdown-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 5px 0;
}

.shortcut {
  font-size: 12px;
  color: #888;
}

.title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  pointer-events: none;
  color: #555;
}

.controls {
  display: flex;
  height: 100%;
}

.ctrl {
  display: grid;
  place-items: center;
  width: 46px;
  height: 100%;
  font-family: monospace;
  font-size: 14px;
  cursor: default;
}

.ctrl:hover {
  background: var(--ou-bg-hover);
}

.ctrl.close:hover {
  background: #E81123;
  color: white;
}

/* Dark mode fallback if using dark theme */
@media (prefers-color-scheme: dark) {
  .menu-dropdown {
    background: #2b2d30;
    border-color: #1e1e1e;
  }
  .dropdown-item {
    color: #ddd;
  }
  .dropdown-item:hover:not(.disabled) {
    background: #464646;
    color: #fff;
  }
  .dropdown-divider {
    background: #444;
  }
}
</style>
