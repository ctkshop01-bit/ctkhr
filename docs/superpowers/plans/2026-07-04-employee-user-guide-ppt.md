# Employee User Guide PPT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 生成一份中泰双语、基于真实网页截图的员工使用说明 PPT，并输出可编辑 `pptx` 文件。

**Architecture:** 先从已上线系统抓取员工核心流程截图，再按既定 9 页结构编写中泰双语说明，最后用 PptxGenJS 生成可编辑 PPT。截图素材和 PPT 文案保持一一对应，避免页面与说明错位。

**Tech Stack:** PowerPoint (`pptx`)、PptxGenJS、浏览器截图、Markdown 设计稿、Node.js 工作区

---

### Task 1: 截图清单与页面确认

**Files:**
- Modify: `d:\HR\docs\superpowers\specs\2026-07-04-employee-user-guide-ppt-design.md`
- Create: `d:\HR\.tmp\employee-user-guide-screenshot-list.md`

- [ ] **Step 1: 列出需要截图的页面**

```md
- 登录页
- 员工首页
- 请假申请页
- 加班申请页
- 消息中心页
- 申请记录页
- 常见提示页
```

- [ ] **Step 2: 确认截图来源环境**

优先使用：

```text
正式环境：http://34.87.114.235:5175/
预览环境：http://34.87.114.235:5176/
```

预期：通用页面优先取正式环境；需要避免真实业务数据时改取预览环境。

- [ ] **Step 3: 保存截图清单**

将截图清单写入：

```text
d:\HR\.tmp\employee-user-guide-screenshot-list.md
```

### Task 2: 获取网页截图

**Files:**
- Create: `d:\HR\.tmp\ppt-screenshots\*.png`

- [ ] **Step 1: 打开登录页并截图**

截图文件名：

```text
login.png
```

- [ ] **Step 2: 进入员工首页并截图**

截图文件名：

```text
dashboard.png
```

- [ ] **Step 3: 进入请假申请页并截图**

截图文件名：

```text
leave-request.png
```

- [ ] **Step 4: 进入加班申请页并截图**

截图文件名：

```text
overtime-request.png
```

- [ ] **Step 5: 进入消息中心页并截图**

截图文件名：

```text
notifications.png
```

- [ ] **Step 6: 进入申请记录页并截图**

截图文件名：

```text
request-history.png
```

- [ ] **Step 7: 获取常见提示截图**

截图文件名：

```text
common-alert.png
```

### Task 3: 编写 PPT 文案

**Files:**
- Create: `d:\HR\.tmp\employee-user-guide-content.md`

- [ ] **Step 1: 为 9 页写中文标题与要点**

每页固定：

```md
## 页面标题
- 要点 1
- 要点 2
- 要点 3
```

- [ ] **Step 2: 补齐对应泰文说明**

格式：

```md
- 中文：进入系统后，可在首页查看未读消息和假期摘要
- ไทย：หลังเข้าสู่ระบบ สามารถดูข้อความที่ยังไม่ได้อ่านและสรุปวันลาได้ที่หน้าแรก
```

- [ ] **Step 3: 保存文案稿**

保存到：

```text
d:\HR\.tmp\employee-user-guide-content.md
```

### Task 4: 生成 PPT

**Files:**
- Create: `d:\HR\deliverables\employee-user-guide.pptx`
- Create: `d:\HR\scripts\generate-employee-user-guide-ppt.mjs`

- [ ] **Step 1: 创建 PptxGenJS 生成脚本**

脚本职责：

```js
// 读取截图
// 写入 9 页内容
// 每页放标题、截图、双语说明
// 导出 employee-user-guide.pptx
```

- [ ] **Step 2: 运行脚本生成 PPT**

运行：

```bash
node scripts/generate-employee-user-guide-ppt.mjs
```

预期：生成 `d:\HR\deliverables\employee-user-guide.pptx`

- [ ] **Step 3: 校验文件存在**

检查：

```bash
dir d:\HR\deliverables\employee-user-guide.pptx
```

预期：文件已生成且大小正常。

### Task 5: 成品复核

**Files:**
- Verify: `d:\HR\deliverables\employee-user-guide.pptx`

- [ ] **Step 1: 检查页数**

预期：

```text
共 9 页
```

- [ ] **Step 2: 检查双语内容和截图对应**

预期：

```text
每页截图与对应说明一致，无错页、无空白、无占位文本
```

- [ ] **Step 3: 交付路径确认**

最终交付：

```text
d:\HR\deliverables\employee-user-guide.pptx
```
