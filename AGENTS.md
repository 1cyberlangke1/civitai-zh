# Civitai 中文化插件 — 维护笔记

个人自用 Tampermonkey 中文化脚本，翻译 Civitai 的界面 UI。当前仓库为初始化骨架，`civitai-zh.user.js` 仅有元数据头，词库与翻译引擎待补充。

## 站点域名（重要）

Civitai 自 2026 年 4 月起按内容分级拆分为两个「前门」，另有一个旧域名：

| 域名 | 说明 |
| --- | --- |
| `civitai.com` | 主站，仅 SFW 内容 |
| `civitai.red` | 完整内容站，含 NSFW |
| `civitai.green` | 旧域名，301 跳转到 `civitai.com` |

三个域名共用同一套账号、数据和页面路径。维护时注意：

- 脚本头部必须同时包含三条 `@match`，新增域名时同步补充，不能只写 `civitai.com`
- **按 `location.pathname` 判断页面类型**，不要用域名区分，否则 `.com` / `.red` 会出现行为不一致
- 测试时两个主域名（`.com` / `.red`）都要覆盖；`.green` 会跳转，只做跳转验证即可

## 如何测试脚本翻译效果（Playwright 注入法）

Tampermonkey 脚本无法直接在 Playwright 中运行，但可以通过 `addInitScript` 注入。

### 标准注入流程

```javascript
// 1. 先 mock GM_* API
await page.addInitScript(() => {
  window.GM_addStyle = function (css) {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  };
  window.GM_registerMenuCommand = function () {};
  window.GM_unregisterMenuCommand = function () {};
  window.GM_getValue = function (key, def) { return def !== undefined ? def : true; };
  window.GM_setValue = function () {};
});

// 2. 注入 userscript（使用最新文件路径）
await page.addInitScript({ path: "D:\\Git_Repository\\civitai-zh\\civitai-zh.user.js" });

// 3. 导航到目标页面（.com 与 .red 都要测）
await page.goto("https://civitai.com/models");
await page.waitForTimeout(3000); // 等待脚本执行 + Next.js/React 渲染

// 4. 验证翻译效果
const result = await page.evaluate(() => {
  const walker = document.createTreeWalker(document.body, 4);
  const chinese = [];
  let n;
  while ((n = walker.nextNode())) {
    const t = n.textContent.trim();
    if (t && /[一-龥]/.test(t)) chinese.push(t.substring(0, 50));
  }
  return chinese;
});
```

### 查找未翻译文本

```javascript
const untranslated = await page.evaluate(() => {
  const walker = document.createTreeWalker(document.body, 4);
  const result = [];
  let n;
  while ((n = walker.nextNode())) {
    const t = n.textContent.trim().replace(/[\s\xa0]+/g, " ");
    if (t.length > 2 && t.length < 150 &&
        /[a-zA-Z]/.test(t) &&
        !/^[\s0-9]*$/.test(t) &&
        !/^[一-龥]/.test(t) &&
        !t.startsWith("http"))
      result.push(t);
  }
  return [...new Set(result)].sort();
});
```

## 词库结构（规划）

参考 `kaggle-zh`：

- `I18N.conf.characterDataPages`：启用 `characterData` MutationObserver 的页面类型
- `I18N.conf.ignoreSelectors`：不翻译的选择器（代码块、富文本、图标等）
- `I18N["zh-CN"].public.static`：静态词典 `{ "英文": "中文" }`
- `I18N["zh-CN"].public.regexp`：动态文本正则 `[ /正则/, "替换文本" ]`
- `I18N["zh-CN"].public.selector`：选择器直改 `[ "CSS选择器", "替换文本" ]`
- `I18N["zh-CN"].public.title`：页面标题翻译（`static` / `regexp`）
- 页面级词库按 `home`、`models`、`model-detail` 等页面类型分块

新增条目时按页面/功能用 `// 页面名` 注释分块，词典键值保持冒号对齐、4 空格缩进。

## 翻译边界

- **只翻 UI**：导航、按钮、标签、提示、占位符、`title`、`aria-label`
- **不翻用户内容**：模型名、作者名、模型/LoRA 描述、提示词、标签、文章正文、评论
- **不翻数据**：数字、日期、许可证名、文件格式、URL
- 图标字体与 SVG 不翻（Civitai 使用 Mantine，图标多为 `svg`）
- 代码块、富文本编辑器内不翻

建议忽略选择器：

```
pre
code
svg
script
style
[contenteditable="true"]
.markdown-body
.mantine-RichTextEditor-root
```

## Civitai 前端特点

- Next.js + React（Mantine 组件库），SPA 路由切换，需要监听 `history.pushState` / `replaceState`
- 文本节点经常被 React 拆分，动态值（数量、时间、Buzz 等）用正则处理，不硬编码
- 需要等待 hydration 完成后再遍历，建议保留定时重扫兜底

## 提交钩子

仓库使用本地 `.git/hooks/pre-commit`（**不提交到仓库**）：

- 对 `civitai-zh.user.js` 执行 `node --check` 语法检查
- 校验头部 `@match` 是否覆盖 `civitai.com` / `civitai.red` / `civitai.green`
- 检查不通过则阻止提交

手动验证：

```powershell
node --check civitai-zh.user.js
```

## 提交规范

- 提交信息用中文，说明本次翻译/修复的页面
- 提交信息末尾附共同作者：

```
Co-authored-by: opencode-<model>-meow <312478326+nana-meow@users.noreply.github.com>
```

- `git add` 只添加本次相关文件，不夹带无关改动
