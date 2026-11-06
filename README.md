# Civitai 中文化插件

个人自用 Civitai 界面中文化 Tampermonkey 脚本。

> 灵感来源：[maboloshi/github-chinese](https://github.com/maboloshi/github-chinese)

## 功能

- 中文化 Civitai 网页界面（导航、按钮、标签、提示等）
- 同时支持 Civitai 的多个访问域名
- 所有翻译均在本地完成，无外部 API 调用
- 依赖 Tampermonkey / Greasemonkey 运行

## 支持的域名

Civitai 按内容分级拆分为多个域名，脚本的 `@match` 已全部覆盖：

| 域名 | 说明 |
| --- | --- |
| `civitai.com` | 主站（SFW 内容） |
| `civitai.red` | 完整内容站（含 NSFW） |
| `civitai.green` | 旧域名，301 跳转至 `civitai.com` |

三个域名共用同一套账号与数据，页面路径一致，因此脚本按路径判断页面类型，不依赖域名。

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 打开 `civitai-zh.user.js`，点击安装
3. 访问上述任一域名即可

## 说明

- 仅提供**简体中文**翻译
- 翻译由 **AI 辅助完成**，可能存在错误翻译或不准确的情况
- 主要翻译界面 UI 文本，用户生成内容（模型名、作者名、描述、提示词等）不在翻译范围内

## 许可

[MIT](LICENSE)
