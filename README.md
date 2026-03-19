# OpenUtau WebUI

基于 Vue 3 + TypeScript + Sass + Vite 的 OpenUtau WebUI 原型。

## 功能

- 深色、密集信息层级的 OpenUtau 风格界面
- 连接 OpenUtau API
- 打开 `.ustx` 工程
- 查看系统信息、轨道、片段、音符
- 编辑轨道参数、音符基础属性
- 导出混音

## 开发

1. 安装依赖
2. 复制 `.env.example` 为 `.env`
3. 设置 `VITE_OPENUTAU_API_BASE_URL`
4. 启动前端开发服务器

## API 约定

默认调用：

- `GET /api/system/info`
- `POST /api/playback/open`
- `POST /api/project/projectinfo`
- `GET /api/project/track/{trackNo}/properties`
- `GET /api/project/part/{partNo}`
- `GET /api/project/notes/{partNo}/{noteIndex}`
- `POST /api/project/render`

后端工程位于 `third_party/backend-openutau`。
