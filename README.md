# Deep Work · Journalist Mode

一个离线优先的个人深度清单工具，目标是在移动端做到“一键 Start 深度 → Finish 写热机线索 → Home 秒入下一次”。项目现已覆盖任务生命周期、Sessions 记录、推荐、PWA、备份等核心能力，可以直接部署到任何 HTTPS 域并安装到手机上使用。

## 功能概览

- **任务池（四态）**：任务支持 Cold / Focusing / Warm / Done，列表自动显示进度条（有 estimate）或累计分钟（无 estimate），Done 区默认折叠，随时 Restore。
- **Start → Focus → Finish 闭环**：保证唯一 focusing。Focus Screen 以全屏绿色仪式界面呈现，FinishModal 默认提示“下次开始的第一步具体动作是什么？”，note 可跳过但会保留旧值。
- **Sessions + 今日累计深度**：每次 Finish 写入 `sessions` 表，Home 顶部按本地时区汇总今日分钟数。
- **推荐（M2.2/M2.3）**：记忆时间偏好（20/40/60/120/自定义），推荐 Top1 + 两个备选卡片，展示剩余分钟、状态、note 片段，可直接 Start。
- **PWA & 离线**：manifest + service worker + icon，就绪后可 “添加到主屏幕”，离线也能打开壳并访问本地数据。
- **数据备份**：Home 底部支持导出/导入 JSON（tasks + sessions + settings），方便换机或备份。

## 技术栈

- React 19 · TypeScript · Vite
- React Router 6
- IndexedDB（通过 `idb` 封装）
- Service Worker / Manifest（PWA）

## 开发环境

```bash
npm install
npm run dev
# 浏览器访问 http://localhost:5173
```

## 构建与部署

```bash
npm run build
npm run preview
```

`dist/` 可托管到任意 HTTPS 静态站点（Vercel、Cloudflare Pages、GitHub Pages 等）。部署后：

1. 使用 Android Chrome 访问站点，点击“添加到主屏幕”安装；
2. 首次加载完成后即可离线打开；
3. IndexedDB 负责所有数据持久化。

## 目录结构

```
src/
  App.tsx                # 路由与导航
  index.css              # 移动端样式
  data/db.ts             # IndexedDB 定义、CRUD、Sessions 写入
  state/FocusSessionContext.tsx # Focusing 会话状态管理
  pages/
    HomePage.tsx         # 任务列表、推荐、备份、今日累计
    FocusPage.tsx        # 仪式化 Focus Screen
    TaskDetailPage.tsx   # 任务编辑、状态流转
  components/            # NewTaskForm / TaskList / RecommendModal / FinishModal 等
  hooks/                 # useTimePreference, useTodayDeepMinutes
  utils/                 # recommendation, backup, time
public/
  manifest.webmanifest
  sw.js
  icons/icon-192.png
  icons/icon-512.png
```

## 备份 / 导入

- 点击 Home 底部“导出 JSON 备份”按钮，会下载包含 tasks/sessions/settings 的文件。
- 选择 JSON 文件导入会覆盖本地数据（谨慎操作）；成功后任务和“今日累计深度”会自动刷新。

## Roadmap / TODO

- 更丰富的推荐卡片交互（滑动、收藏、手势等）
- 统计回放（近期 sessions 列表、周/月趋势）
- 更细的错误提示与冲突处理

