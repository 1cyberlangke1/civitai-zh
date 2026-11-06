// ==UserScript==
// @name         Civitai 中文化插件
// @namespace    https://github.com/1cyberlangke1/civitai-zh
// @description  中文化 Civitai 界面的菜单及内容
// @version      0.2.0
// @author       1cyberlangke1
// @license      MIT
// @match        https://civitai.com/*
// @match        https://civitai.red/*
// @match        https://civitai.green/*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @supportURL   https://github.com/1cyberlangke1/civitai-zh/issues
// ==/UserScript==

(function (window, document, undefined) {
  "use strict";

  /* ========================================================================
   *  翻译边界
   *  - 只翻站点 UI：导航 / 按钮 / 标签 / 占位符 / aria-label / 提示语
   *  - 不翻用户生成内容：模型名、作者名、提示词、标签、文章正文、评论
   *  - 词库全部是「完整字符串精确匹配」，用户内容天然不会被误伤
   *  - 动态内容只走锚定正则（^...$），宁可漏翻也不误翻
   * ======================================================================== */

  const CONFIG = {
    // 这些节点内部一律不碰：代码、图标、富文本、输入框内容
    ignoreSelector: [
      "pre",
      "code",
      "svg",
      "script",
      "style",
      "noscript",
      "textarea",
      '[contenteditable="true"]',
      ".markdown-body",
      ".mantine-RichTextEditor-root",
      ".CodeMirror",
      ".cm-editor",
    ].join(","),

    // 需要翻译的属性
    attrNames: ["placeholder", "title", "aria-label"],

    // 兜底重扫间隔（毫秒）：React 水合后仍可能有漏网节点
    rescanInterval: 3000,

    // 单个文本节点最大长度：超过视为正文，不翻
    maxTextLength: 120,

    debug: false,
  };

  /* ========================================================================
   *  通用词库（所有页面共用）
   *  键 = 站点原文（精确匹配），值 = 中文
   * ======================================================================== */

  const COMMON = {
    // ---- 顶部导航 ----
    Home: "首页",
    Models: "模型",
    Images: "图片",
    Videos: "视频",
    "3D Models": "3D 模型",
    Hubs: "Hubs",
    Articles: "文章",
    Comics: "漫画",
    Crucibles: "Crucibles",
    Updates: "更新",
    Shop: "商店",
    More: "更多",
    Pro: "会员",
    Create: "创作",
    "Sign In": "登录",
    "Sign in": "登录",
    "Join a team": "加入队伍",
    "Join and get your free hat": "加入并领取免费帽子",

    // ---- 页脚 ----
    "© Civitai": "© Civitai",
    "Terms of Service": "服务条款",
    Privacy: "隐私",
    Safety: "安全",
    Status: "状态",
    "Known Issues": "已知问题",
    Creators: "创作者",
    Advertise: "广告合作",

    // ---- 搜索 ----
    "Search Civitai": "搜索 Civitai",
    "Search category": "搜索类别",
    "Close search": "关闭搜索",
    Search: "搜索",
    "Civitai home": "Civitai 首页",
    "Quick search keyboard shortcut": "快速搜索快捷键",
    "More create options": "更多创作选项",
    Menu: "菜单",
    "Dismiss announcement": "关闭公告",
    "Scroll right": "向右滚动",
    "More options": "更多选项",
    "Scroll to top": "回到顶部",
    "Page loading progress": "页面加载进度",
    "Table of contents": "目录",
    "Table of Contents": "目录",
    "Updated:": "更新：",

    // ---- 通用动作 ----
    Follow: "关注",
    Following: "已关注",
    "Follow back": "回关",
    Unfollow: "取消关注",
    Share: "分享",
    Report: "举报",
    Save: "收藏",
    Saved: "已收藏",
    Tip: "打赏",
    Remix: "重混",
    REMIX: "重混",
    "Add Comment": "添加评论",
    "Add reaction": "添加表情",
    "Like reaction": "喜欢",
    "Heart reaction": "爱心",
    "Laugh reaction": "大笑",
    "Cry reaction": "大哭",
    Like: "点赞",
    "Load more": "加载更多",
    "Load More Comments": "加载更多评论",
    "Show More": "显示更多",
    "Show more": "显示更多",
    Details: "详情",
    Filters: "筛选",
    Hot: "热门",
    Newest: "最新",
    Oldest: "最早",
    "All Time": "全部时间",
    "Most Reactions": "最多反应",
    "Most Bookmarks": "最多收藏",
    "Most Downloaded": "最多下载",
    "Close Ad": "关闭广告",
    "No results found": "未找到结果",
    Support: "支持",
    Download: "下载",
    Comments: "评论",
    Version: "版本",
    "How it works": "了解详情",
    "Read more": "阅读更多",
    Discussion: "讨论",
    "You must": "你需要",
    "to add a comment": "才能添加评论",
    Skip: "跳过",
    Next: "下一步",
    Standard: "标准",

    // ---- 搜索分类 ----
    Users: "用户",
    Collections: "收藏集",
    Tools: "工具",

    // ---- 内容分级 / 技术名词（保持原样，显式列出便于统一维护）----
    PG: "PG",
    "PG-13": "PG-13",
    Checkpoint: "Checkpoint",
    LoRA: "LoRA",
    Buzz: "Buzz",
    API: "API",
  };

  /* ========================================================================
   *  小写别名
   *  Civitai 导航/页脚的源码文案是小写（home / models / updates），
   *  靠 CSS text-transform: capitalize 显示成首字母大写。
   *  这里只做「已知 UI 词」的小写映射，不做全局忽略大小写，
   *  避免把用户标签（tag: animal / anime 等）误翻。
   * ======================================================================== */

  const CASE_ALIASES = {
    home: "Home",
    models: "Models",
    images: "Images",
    videos: "Videos",
    "3d models": "3D Models",
    hubs: "Hubs",
    articles: "Articles",
    comics: "Comics",
    crucibles: "Crucibles",
    updates: "Updates",
    shop: "Shop",
    more: "More",
    "terms of service": "Terms of Service",
    privacy: "Privacy",
    safety: "Safety",
    status: "Status",
    "known issues": "Known Issues",
    creators: "Creators",
    advertise: "Advertise",
    api: "API",
  };

  /* ========================================================================
   *  页面词库
   *  键 = 页面标识（由 pathname 判定，与域名无关）
   * ======================================================================== */

  const PAGES = {
    // ---- 首页 ----
    home: {
      "Featured Images": "精选图片",
      "Explore all images": "浏览全部图片",
      "Explore all models": "浏览全部模型",
      "View more videos": "查看更多视频",
      "Browse their work": "浏览其作品",
      "Browse their models": "浏览其模型",
      "View collection": "查看收藏集",
      "View more": "查看更多",
      "How it works": "了解详情",
      "See how it works": "查看运作方式",
      "Join a team": "加入队伍",
      "Join and get your free hat": "加入并领取免费帽子",
    },

    // ---- 模型列表 ----
    models: {
      "Become a Member to turn off ads today.": "成为会员，立即关闭广告。",
      "Do It": "去开通",
    },

    // ---- 模型详情 ----
    "model-detail": {
      "Suggested Resources": "推荐资源",
      Discussion: "讨论",
      Download: "下载",
      variant: "版本",
      available: "可用",
      "Best match": "最佳匹配",
      Verified: "已验证",
      Type: "类型",
      Stats: "统计",
      Reviews: "评测",
      Published: "发布时间",
      "Base Model": "基础模型",
      Hash: "哈希",
      Tensors: "张量",
      VRAM: "显存",
      min: "最低",
      rec: "推荐",
      License: "许可",
      "Model options": "模型选项",
      "Get notifications for this model": "订阅此模型的更新",
      "Add to collection": "添加到收藏集",
      "Download variant options": "下载版本选项",
      "How to use this": "如何使用",
      "Suggested Resources for this model": "此模型的推荐资源",
    },

    // ---- 图片列表 ----
    images: {
      "Most Reactions": "最多反应",
    },

    // ---- 图片详情 ----
    "image-detail": {
      "Submit your remix": "提交你的重混",
      "COPY ALL": "复制全部",
      "Generation data": "生成数据",
      "Resources used": "使用的资源",
      Prompt: "提示词",
      "Negative prompt": "反向提示词",
      "Other metadata": "其他元数据",
      "External Generator": "外部生成器",
      "Remix gallery": "重混画廊",
      Tag: "标签",
      "Collapse Generation data": "收起生成数据",
      "Collapse Discussion": "收起讨论",
      "Comment options": "评论选项",
      "View media": "查看媒体",
    },

    // ---- 视频列表 ----
    videos: {},

    // ---- 3D 模型列表 ----
    "3d-models": {
      "Preview 3D model": "预览 3D 模型",
    },

    // ---- 3D 模型详情 ----
    "3d-model-detail": {
      Plain: "纯色",
      Studio: "影棚",
      Light: "光照",
      Transparent: "透明",
      "Reset view": "重置视角",
      "Generate with this image": "用此图像生成",
      "Write a review": "写评测",
      Version: "版本",
      "Generate texture": "生成贴图",
      Yes: "是",
      "Target polycount": "目标面数",
      Topology: "拓扑",
      Triangle: "三角面",
      Symmetry: "对称",
      Auto: "自动",
      Remesh: "重构网格",
      "PBR textures": "PBR 贴图",
      Animate: "动画",
      Seed: "种子",
      "License:": "许可：",
      "All Rights Reserved": "保留所有权利",
      "No comments yet.": "暂无评论。",
      "File variant + format": "文件版本与格式",
    },

    // ---- Hubs ----
    hubs: {
      "Feeds you build yourself": "自己构建的信息流",
      "New hub": "新建 Hub",
      "Start with one of these": "从以下之一开始",
      "Start with these": "使用这些开始",
      "Start empty": "从空白开始",
      "We fill the list — nothing is saved until you have looked at it.":
        "我们会填充列表——在你看过之前不会保存任何内容。",
      "Images on my models": "我的模型上的图片",
      "Everything people post using your resources, in one feed.":
        "大家使用你的资源发布的一切，尽在一个信息流。",
      "Creators I follow": "我关注的创作者",
      "The people you already follow, gathered into a feed you can sort and prune.":
        "将你已关注的创作者汇集到一个可排序、可精简的信息流。",
      "Something else": "其他",
      "Name a hub and fill it with the creators, models and tags you choose.":
        "给 Hub 取个名字，填入你选择的创作者、模型和标签。",
    },

    // ---- 文章列表 ----
    articles: {
      "My checkpoints": "我的 Checkpoint",
      // 文章分类（站点定义的筛选项）
      "CIVITAI OFFICIAL": "官方",
      ANNOUNCEMENT: "公告",
      STORY: "故事",
      MUSING: "随笔",
      WORKFLOWS: "工作流",
      "GENERATION GUIDE": "生成指南",
      NEWS: "新闻",
      "TOOL GUIDE": "工具指南",
      "TRAINING GUIDE": "训练指南",
      "RESOURCE GUIDE": "资源指南",
      "COMPARATIVE STUDY": "对比研究",
      "VIDEO GENERATION GUIDE": "视频生成指南",
      "DATA PREP": "数据准备",
      "ML RESEARCH": "机器学习研究",
    },

    // ---- 文章详情 ----
    "article-detail": {
      Comments: "评论",
      Official: "官方",
      "Updated:": "更新：",
    },

    // ---- 漫画 ----
    comics: {
      Action: "动作",
      Adventure: "冒险",
      Comedy: "喜剧",
      Drama: "剧情",
      Fantasy: "奇幻",
      Horror: "恐怖",
      Mystery: "悬疑",
      Romance: "恋爱",
      "Sci Fi": "科幻",
      "Slice Of Life": "日常",
      Thriller: "惊悚",
      Other: "其他",
      "No Image": "无图片",
    },

    // ---- Crucibles ----
    crucibles: {},

    // ---- 更新日志（正文不翻，仅 UI）----
    changelog: {},

    // ---- 商店 ----
    shop: {
      "Civitai Cosmetic Shop": "Civitai 装饰商店",
      "Customize profile": "自定义个人资料",
      "Featured Creator Cosmetics": "精选创作者装饰",
      "Creator Cosmetics": "创作者装饰",
      Sticker: "贴纸",
      Preview: "预览",
      "Avatar Decoration": "头像装饰",
      Badge: "徽章",
      "Profile Background": "个人背景",
      "Content Decoration": "内容装饰",
      "Profile Backgrounds": "个人背景",
      "Avatar Decorations": "头像装饰",
      "Content Decorations": "内容装饰",
      Badges: "徽章",
      "Search names, descriptions, :sticker:": "搜索名称、描述、:sticker:",
      "Any cosmetic purchases directly contributes to Civitai ❤️":
        "购买任何装饰都会直接支持 Civitai ❤️",
      "Discover handcrafted cosmetics from our featured creators.":
        "探索精选创作者手工制作的装饰。",
      by: "作者",
      remaining: "剩余",
      "Make your model, image, or article stand out in the crowd by dressing it up with a Content Frame Decoration.":
        "用内容边框装饰让你的模型、图片或文章在人群中脱颖而出。",
    },

    // ---- 会员 ----
    pricing: {
      Memberships: "会员",
      "Subscribe to Bronze": "订阅青铜",
      "Subscribe to Silver": "订阅白银",
      "Subscribe to Gold": "订阅黄金",
      "Subscribe to Bronze membership": "订阅青铜会员",
      "Subscribe to Silver membership": "订阅白银会员",
      "Subscribe to Gold membership": "订阅黄金会员",
      "Get Buzz each month along with a variety of Pro Creator perks":
        "每月获得 Buzz，并享受多种专业创作者特权",
      "Unrestricted content creation has moved to": "无限制内容创作已迁移至",
      "Short on cash? You can buy a": "手头紧？你可以用 Buzz 购买",
      "perks-only membership": "仅含特权的会员",
      "with Buzz instead.": "。",
      mo: "/月",
      Green: "Green",
      "Buzz per month": "每月 Buzz",
      "5% Bonus Buzz on purchases": "购买额外获得 5% Buzz",
      "10% Bonus Buzz on purchases": "购买额外获得 10% Buzz",
      "20% Bonus Buzz on purchases": "购买额外获得 20% Buzz",
      "1.5x Bonus Blue Buzz on daily rewards": "每日奖励蓝 Buzz 1.5 倍",
      "2.5x Bonus Blue Buzz on daily rewards": "每日奖励蓝 Buzz 2.5 倍",
      "4x Bonus Blue Buzz on daily rewards": "每日奖励蓝 Buzz 4 倍",
      "Images per job": "每次任务图片数",
      "Queued jobs": "排队任务",
      "Free High priority generation": "免费高优先级生成",
      Priority: "优先级",
      "Unique monthly badge": "每月专属徽章",
      "Ad free browsing": "无广告浏览",
      ": sync resources to your machine": "：同步资源到本机",
      "Exclusive Discord channels": "专属 Discord 频道",
      "Early access to new features": "新功能抢先体验",
      ": earn from your Buzz": "：用你的 Buzz 赚取收益",
      Monetize: "变现",
      "unlimited model versions": "无限模型版本",
      "a month — a licensing fee or paid access. Changing a price you have already set is always free.":
        "每月，可设置许可费或付费访问。修改已设置的价格始终免费。",
      "Enhanced Model Creator controls": "增强的模型创作者控制",
      Premium: "高级",
      VIP: "VIP",
      "Unique monthly": "每月专属",
      animated: "动态",
      badge: "徽章",
      "By purchasing a membership, you agree to our": "购买会员即表示你同意我们的",
    },

    // ---- 登录 ----
    login: {
      "Sign Up or Log In": "注册或登录",
      "Email me a login link": "通过邮件发送登录链接",
      "Enter your email": "输入你的邮箱",
      "Or continue with Email": "或使用邮箱继续",
    },

    // ---- 生成器 ----
    generate: {
      Pro: "专业",
      Max: "极致",
      Eco: "Eco",
      "Text to Image": "文生图",
      "Image to Image": "图生图",
      Model: "模型",
      "Prompt *": "提示词 *",
      Prompt: "提示词",
      "Aspect Ratio": "宽高比",
      "CFG Scale": "CFG 比例",
      Seed: "种子",
      Random: "随机",
      Custom: "自定义",
      "I Confirm, Start Generating": "我确认，开始生成",
      Generate: "生成",
      "Create Image": "创建图像",
      "Generate an AI image from text": "通过文本生成 AI 图像",
      Advanced: "高级",
      "Image Generation Terms": "图像生成条款",
      "By using the image generator you confirm that you have read and agree to our":
        "使用图像生成器即表示你确认已阅读并同意我们的",
      "presented during onboarding. Failure to abide by": "（引导流程中展示）。若违反",
      QTY: "数量",
      "Sign in to see your generations": "登录后查看你的生成记录",
      "Getting Started with Content Generation": "内容生成入门",
      Standard: "标准",
      Skip: "跳过",
      Next: "下一步",
    },

    // ---- 挑战 ----
    challenges: {
      "Community Challenges": "社区挑战",
      "No challenges found": "未找到挑战",
    },

    // ---- Storylines ----
    storylines: {
      "Start a storyline": "开始故事线",
      "Welcome to Storylines": "欢迎来到 Storylines",
      "Watch the video": "观看视频",
      "Got it": "知道了",
      New: "新",
      Read: "阅读",
      "Every storyline is a run of posts. Start at chapter 1 and page through like one long post.":
        "每条故事线都是一串帖子。从第 1 章开始，像读一篇长文那样翻页。",
      "Pick a path": "选择路线",
      "Continue it": "续写",
      "Add the next chapter from a post of your own. The creator reviews it before it joins.":
        "用你自己的帖子添加下一章。创作者会在加入前审核。",
      "Dismiss the Storylines welcome": "关闭 Storylines 欢迎提示",
      "Watch the Storylines video": "观看 Storylines 视频",
    },

    // ---- 拍卖 ----
    auctions: {
      Today: "今天",
      Auctions: "拍卖",
      Refresh: "刷新",
      "Featured Checkpoints": "精选 Checkpoint",
      "Place Bid": "出价",
      "Select model": "选择模型",
      "1st": "首位",
      Last: "末位",
      Bid: "出价",
      "Make this recurring until:": "循环出价至：",
      Forever: "永久",
      "Active Bids": "当前出价",
      "My Bids": "我的出价",
      "Perks of winning": "获胜特权",
      Spots: "名额",
      "Min ⚡": "最低 ⚡",
      Featured: "精选",
      For: "持续",
      day: "天",
      "Ends In": "剩余时间",
      "Bid:": "出价：",
      "Not available on this site": "本站不可用",
      "Enter Buzz...": "输入 Buzz...",
      "Search items...": "搜索项目...",
      "Getting Started with Auctions": "拍卖入门",
    },

    // ---- 排行榜 ----
    leaderboard: {
      Creators: "创作者",
      Season: "赛季",
      Legacy: "经典",
      "New Creators": "新创作者",
      "Daily Challenges": "每日挑战",
      "Buzz Daddies": "Buzz 大亨",
      "Top Generators": "顶级生成者",
      "Top Trainers": "顶级训练者",
      "Cosmetic Collectors": "装饰收藏家",
      Guardians: "守护者",
      Writers: "写作者",
      Comedians: "喜剧人",
      "Master Generators (Video)": "大师级生成者（视频）",
      "Master Generators": "大师级生成者",
      "New Master Generators": "新晋大师级生成者",
      "Base Model Creators": "基础模型创作者",
      "Style Creators": "风格创作者",
      "Clothing Creators": "服装创作者",
      "Character Creators": "角色创作者",
      "Architecture Creators": "建筑创作者",
      "Background Creators": "背景创作者",
      "Poses Creators": "姿势创作者",
      "Concept Creators": "概念创作者",
      "Vehicle Creators": "载具创作者",
      "Asset Creators": "素材创作者",
      "Tool Creators": "工具创作者",
      "Knights of New Order": "新秩序骑士",
      "Sticker Magnets": "贴纸磁铁",
      "Sticker Placers": "贴纸放置者",
      "Sticker Spenders": "贴纸消费者",
      "Sticker Makers": "贴纸制作者",
      "Crucible Judges": "Crucible 评委",
      "Crucible Competitors": "Crucible 参赛者",
      "Crucible Hosts": "Crucible 主办者",
      "Top model creators in the community": "社区顶级模型创作者",
      "As of": "截至",
      ". Refreshes in:": "。刷新倒计时：",
    },

    // ---- 收藏集 ----
    collections: {},

    // ---- 活动 ----
    events: {
      "Show me on my team's roster (avatar, username, hats and points)":
        "在队伍名单中显示我（头像、用户名、帽子和积分）",
      "Watch the Hats On video": "观看 Hats On 视频",
      "What happens to my hats when the event ends?": "活动结束后我的帽子会怎样？",
      "Do I keep hats bought during the tester and mod preview?":
        "测试者和版主预览期间购买的帽子会保留吗？",
      "Do I need to do anything every day?": "我需要每天做什么吗？",
      "Can I change teams?": "我可以换队伍吗？",
      "Won't the biggest creators make it unfair?": "大创作者不会让比赛不公平吗？",
      "Sign in to open": "登录后开启",
      "Team standings": "队伍排名",
      Points: "积分",
      Position: "名次",
      "Per hour": "每小时",
      "Hardest-working hats": "最勤奋的帽子",
      "Civitai's 4th Birthday": "Civitai 四周年",
      "Pick up a hat.": "领取一顶帽子。",
      "left to score": "剩余计分时间",
      "You get a random team. Teams are final.": "你会被随机分配队伍，队伍不可更改。",
      "Three steps, and the rules that keep it fair.": "三个步骤，以及保证公平的规则。",
      Step: "步骤",
      Join: "加入",
      "Hat your best work": "把你的最佳作品戴上帽子",
      "Score for your team": "为你的队伍得分",
      "How points add up": "积分如何累计",
      "Keeping it fair": "保持公平",
      "per view in a feed": "每次信息流浏览",
      "per reaction": "每次反应",
      "per comment": "每条评论",
      "per sticker": "每个贴纸",
      "per remix": "每次重混",
      "for your own views and reactions": "你自己的浏览和反应",
      "Hats go on your own": "帽子戴在你自己的",
      "images, models and articles": "图片、模型和文章上",
      "Articles score views, reactions and comments.": "文章按浏览、反应和评论计分。",
      "Models score views and thumbs-up reviews.": "模型按浏览和好评计分。",
      "One person can earn a creator at most": "一个人最多可为一个创作者贡献",
      "points a day.": "积分/天。",
      "Only signed-in people's views and reactions count.":
        "只有已登录用户的浏览和反应才计分。",
      "A hat can move again": "帽子可以再次移动",
    },

    // ---- 安全中心（正文不翻，仅标题）----
    safety: {
      "Civitai Safety Center": "Civitai 安全中心",
      "View the full policy": "查看完整政策",
    },

    // ---- 创作者计划（营销正文不翻）----
    "creator-program": {
      "Earn on Civitai": "在 Civitai 赚取收益",
    },

    // ---- 用户主页 ----
    user: {
      Joined: "加入时间",
      Followers: "关注者",
      Likes: "点赞",
      Downloads: "下载",
      Generations: "生成",
      Badges: "徽章",
      "Most popular models": "最受欢迎的模型",
      "Recent Reviews": "最近评测",
      "Creator Journey": "创作者历程",
      "Creator Score tier": "创作者积分等级",
      "Latest achievements": "最新成就",
      "Special achievement": "特殊成就",
      "Earned before launch": "上线前获得",
      "First Model": "第一个模型",
      "Published your first model.": "发布了你的第一个模型。",
    },
  };

  /* ========================================================================
   *  动态文案正则（锚定首尾，避免误伤用户内容）
   *  [正则, 替换, 说明]
   * ======================================================================== */

  const MONTHS = {
    Jan: "1月",
    Feb: "2月",
    Mar: "3月",
    Apr: "4月",
    May: "5月",
    Jun: "6月",
    Jul: "7月",
    Aug: "8月",
    Sep: "9月",
    Oct: "10月",
    Nov: "11月",
    Dec: "12月",
  };
  const MONTH_RE = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";

  const FULL_MONTHS = {
    January: "1月",
    February: "2月",
    March: "3月",
    April: "4月",
    May: "5月",
    June: "6月",
    July: "7月",
    August: "8月",
    September: "9月",
    October: "10月",
    November: "11月",
    December: "12月",
  };
  const FULL_MONTH_RE = Object.keys(FULL_MONTHS).join("|");

  const REGEXPS = [
    // 相对时间：2 years ago / 3 days ago / a month ago
    [
      /^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/,
      (m, n, unit) =>
        `${n} ${({ second: "秒", minute: "分钟", hour: "小时", day: "天", week: "周", month: "个月", year: "年" })[unit]}前`,
    ],
    [
      /^an?\s+(second|minute|hour|day|week|month|year)\s+ago$/,
      (m, unit) =>
        `1 ${({ second: "秒", minute: "分钟", hour: "小时", day: "天", week: "周", month: "个月", year: "年" })[unit]}前`,
    ],
    // 复合倒计时：6 days, 14 hours, and 8 minutes
    [
      /^(\d+)\s+days?,\s+(\d+)\s+hours?,\s+and\s+(\d+)\s+minutes?$/,
      "$1 天 $2 小时 $3 分钟",
    ],
    // 14 hours and 8 minutes
    [/^(\d+)\s+hours?\s+and\s+(\d+)\s+minutes?$/, "$1 小时 $2 分钟"],
    // 日期：Nov 6, 2026
    [
      new RegExp(`^(${MONTH_RE})\\s+(\\d{1,2}),\\s+(\\d{4})$`),
      (m, mon, day, year) => `${year}年${MONTHS[mon]}${day}日`,
    ],
    // 获得成就日期：Earned Dec 18, 2024
    [
      new RegExp(`^Earned\\s+(${MONTH_RE})\\s+(\\d{1,2}),\\s+(\\d{4})$`),
      (m, mon, day, year) => `获得于 ${year}年${MONTHS[mon]}${day}日`,
    ],
    // 完整日期 + 时间：November 6, 2026 8:00am
    [
      new RegExp(
        `^(${FULL_MONTH_RE})\\s+(\\d{1,2}),\\s+(\\d{4})(?:\\s+(\\d{1,2}):(\\d{2})(am|pm))?$`
      ),
      (m, mon, day, year, h, min, ap) => {
        if (!h) return `${year}年${FULL_MONTHS[mon]}${day}日`;
        const hour = ap === "pm" ? (Number(h) % 12) + 12 : Number(h) % 12;
        return `${year}年${FULL_MONTHS[mon]}${day}日 ${hour}:${min}`;
      },
    ],
    // 展开更多评论：Show 3 More / Show 25 More
    [/^Show\s+(\d+)\s+More$/, "再显示 $1 条"],
    // 模型版本数量：12 model versions
    [/^(\d+)\s+model versions$/, "$1 个模型版本"],
    // 下载成就：1M Downloads
    [/^([\d.,]+[KMB]?)\s+Downloads$/, "$1 次下载"],
    // 模型总下载成就：Your models reached 2,345,678 downloads in total.
    [
      /^Your models reached\s+([\d,]+)\s+downloads in total\.$/,
      "你的模型总下载量达到 $1 次。",
    ],
    // 评论计数：Showing 8 of 523 comments
    [/^Showing\s+([\d,]+)\s+of\s+([\d,]+)\s+comments$/, "显示 $1 / $2 条评论"],
    // 贴纸：4 stickers / 1 sticker
    [/^(\d+)\s+stickers?$/, "$1 个贴纸"],
    // 商店使用次数：100 uses included
    [/^([\d,]+)\s+uses included$/, "包含 $1 次使用"],
    // 商店额外费用：· 5 Buzz per extra use
    [/^(·\s*)?([\d,]+)\s+Buzz per extra use$/, "$1每次额外使用 $2 Buzz"],
    // 出价次数：1 Bid / 2 Bids
    [/^(\d+)\s+Bids?$/, "$1 次出价"],
    // 生成槽位：4/4 slots
    [/^(\d+)\/(\d+)\s+slots$/, "$1/$2 个槽位"],
    // 排行榜分类：Creators (90 Days) / Creators (SDXL)
    [/^Creators\s+\((\d+)\s+Days\)$/, "创作者（$1 天）"],
    [/^Creators\s+\(([^()]+)\)$/, "创作者（$1）"],
    // 关注/点赞/反应 aria：Followers - 9353
    [/^Followers\s+-\s+([\d,]+)$/, "关注者 - $1"],
    [/^Likes\s+-\s+([\d,]+)$/, "点赞 - $1"],
    [/^Reactions\s+-\s+([\d,]+)$/, "反应 - $1"],
    // 模型页下载版本提示
    [
      /^Select download variant\. Currently selected:\s*(.+)$/,
      "选择下载版本。当前选择：$1",
    ],
    // fp16, Half precision, best balance, 3.97 GB
    [
      /^(fp16|fp32|bf16),\s*Half precision,\s*best balance( \(pruned\))?,\s*([\d.]+\s*[GM]B)$/,
      "$1，半精度，均衡最佳$2，$3",
    ],
    // 3D 下载按钮：Download (11.06 MB)
    [/^Download \((\d+(?:\.\d+)? [KMG]B)\)$/, "下载（$1）"],
    // 日期区间：Nov 1 to Nov 30
    [
      new RegExp(`^(${MONTH_RE})\\s+(\\d{1,2})\\s+to\\s+(${MONTH_RE})\\s+(\\d{1,2})$`),
      (m, mon1, day1, mon2, day2) => `${MONTHS[mon1]}${day1}日 至 ${MONTHS[mon2]}${day2}日`,
    ],
    // 活动收集数量：43 hats to collect
    [/^(\d+)\s+hats to collect$/, "共 $1 顶帽子可收集"],
    // 稀有度：Common 50% / Uncommon 27% / Rare 17% / Legendary 6%
    [
      /^(Common|Uncommon|Rare|Legendary)\s+(\d+%)$/,
      (m, tier, pct) =>
        `${({ Common: "普通", Uncommon: "罕见", Rare: "稀有", Legendary: "传说" })[tier]} ${pct}`,
    ],
    // 队伍积分：Team Pink score
    [
      /^Team (Pink|Green|Blue|Yellow) score$/,
      (m, team) => `${({ Pink: "粉队", Green: "绿队", Blue: "蓝队", Yellow: "黄队" })[team]}积分`,
    ],
    // 下载版本描述：Half precision, best balance (pruned) • 1.99 GB
    [
      /^Half precision,\s*best balance( \(pruned\))?\s*•\s*([\d.]+\s*[GM]B)$/,
      (m, pruned, size) => `半精度，均衡最佳${pruned ? "（精简版）" : ""} • ${size}`,
    ],
    // 下载版本 aria：fp16, best match, Half precision, best balance (pruned), 1.99 GB
    [
      /^(fp16|fp32|bf16),\s*best match,\s*Half precision,\s*best balance( \(pruned\))?,\s*([\d.]+\s*[GM]B)$/,
      (m, prec, pruned, size) =>
        `${prec}，最佳匹配，半精度，均衡最佳${pruned ? "（精简版）" : ""}，${size}`,
    ],
    // 步骤计数：3 of 4
    [/^(\d+)\s+of\s+(\d+)$/, "$1 / $2"],
    // Tensors 1,131 VRAM min 1.4 GB rec 3.2 GB
    [
      /^Tensors\s+([\d,]+)\s+VRAM\s+min\s+([\d.]+\s*[GM]B)\s+rec\s+([\d.]+\s*[GM]B)$/,
      "张量 $1 显存 最低 $2 推荐 $3",
    ],
    // 重混提交：Submit your remix 100
    [/^Submit your remix\s+([\d,]+)$/, "提交你的重混 $1"],
    // 收益归属：All proceeds go to @purplelady
    [/^All proceeds go to\s+(@\S+)$/, "全部收益归 $1"],
    // 视频时长：Watch · 0:42
    [/^Watch\s+·\s+(\d+:\d+)$/, "观看 · $1"],
    // 数量统计：5 Models
    [/^([\d,]+)\s+Models?$/, "$1 个模型"],
    // 发布数量：Published 5 models.
    [/^Published\s+([\d,]+)\s+models?\.$/, "发布了 $1 个模型。"],
    // 查看全部：Show all (25)
    [/^Show all\s+\(([\d,]+)\)$/, "查看全部（$1）"],
    // 页面分页：24 / page
    [/^([\d,]+)\s*\/\s*page$/, "$1 / 页"],
  ];

  /* ========================================================================
   *  页面标题翻译（静态精确匹配）
   * ======================================================================== */

  const TITLES = {
    "Civitai | Discover and Create AI Art": "Civitai | 发现与创作 AI 艺术",
    "AI Image & Video Models, LoRAs & Checkpoints | Civitai":
      "AI 图像与视频模型、LoRA 与 Checkpoint | Civitai",
    "AI Art Gallery | Civitai": "AI 艺术画廊 | Civitai",
    "Civitai Video Gallery | AI-Generated Art Showcase":
      "Civitai 视频画廊 | AI 生成艺术展示",
    "3D Models | Civitai": "3D 模型 | Civitai",
    "Hubs | Civitai": "Hubs | Civitai",
    "Civitai Articles | Community Guides and Insights": "Civitai 文章 | 社区指南与洞察",
    "Comics - Civitai": "漫画 - Civitai",
    "Civitai Crucibles | Head-to-Head Image Competitions":
      "Civitai Crucibles | 一对一图像竞赛",
    "Civitai Changelog | The latest updates to Civitai":
      "Civitai 更新日志 | Civitai 最新动态",
    "Civitai Cosmetic Shop | Created with Love & AI": "Civitai 装饰商店 | 用爱与 AI 打造",
    "Green Memberships | Civitai": "Green 会员 | Civitai",
    "Civitai Login": "Civitai 登录",
    "Generate | Civitai": "生成 | Civitai",
    Generate: "生成",
    "AI Art Challenges | Civitai": "AI 艺术挑战 | Civitai",
    Storylines: "Storylines | Civitai",
    "Auction: Featured Checkpoints | Civitai": "拍卖：精选 Checkpoint | Civitai",
    "Creators Leaderboard | Civitai": "创作者排行榜 | Civitai",
    "Collections | Civitai": "收藏集 | Civitai",
    "Safety Center | Policies and Guidelines": "安全中心 | 政策与指南",
    "Earn on Civitai | Civitai": "在 Civitai 赚取收益 | Civitai",
    "Civitai's 4th Birthday | Civitai": "Civitai 四周年 | Civitai",
    "Civitai Changelog": "Civitai 更新日志",
  };

  /* ------------------------------------------------------------------------
   *  标题正则：只替换固定后缀，用户内容（模型名等）原样保留
   * ---------------------------------------------------------------------- */
  const TITLE_REGEXPS = [
    [/^(.*) \| 3D Models \| Civitai$/, "$1 | 3D 模型 | Civitai"],
    [/^(.*) \| Stable Diffusion (.+) Checkpoint \| Civitai$/, "$1 | Stable Diffusion $2 Checkpoint | Civitai"],
  ];

  /* ========================================================================
   *  页面判定：按 pathname，与域名无关
   *  顺序敏感：详情规则必须排在列表规则之前
   * ======================================================================== */

  const PAGE_RULES = [
    ["model-detail", /^\/models\/\d+/],
    ["models", /^\/models(?:\/|$)/],
    ["image-detail", /^\/images\/\d+/],
    ["images", /^\/images(?:\/|$)/],
    ["video-detail", /^\/videos\/\d+/],
    ["videos", /^\/videos(?:\/|$)/],
    ["3d-model-detail", /^\/3d-models\/\d+/],
    ["3d-models", /^\/3d-models(?:\/|$)/],
    ["hub-detail", /^\/hubs\/[^/]+/],
    ["hubs", /^\/hubs(?:\/|$)/],
    ["article-detail", /^\/articles\/\d+/],
    ["articles", /^\/articles(?:\/|$)/],
    ["comics", /^\/comics(?:\/|$)/],
    ["crucibles", /^\/crucibles(?:\/|$)/],
    ["changelog", /^\/changelog(?:\/|$)/],
    ["shop", /^\/shop(?:\/|$)/],
    ["pricing", /^\/pricing(?:\/|$)/],
    ["login", /^\/login(?:\/|$)/],
    ["generate", /^\/generate(?:\/|$)/],
    ["challenges", /^\/challenges(?:\/|$)/],
    ["storylines", /^\/storylines(?:\/|$)/],
    ["auctions", /^\/auctions(?:\/|$)/],
    ["leaderboard", /^\/leaderboard(?:\/|$)/],
    ["collections", /^\/collections(?:\/|$)/],
    ["events", /^\/events(?:\/|$)/],
    ["safety", /^\/safety(?:\/|$)/],
    ["creator-program", /^\/creator-program(?:\/|$)/],
    ["user", /^\/user(?:\/|$)/],
    ["home", /^\/$/],
  ];

  /* ========================================================================
   *  运行时状态
   * ======================================================================== */

  const State = {
    enabled: true,
    pageKey: "home",
    dict: Object.create(null),
    observer: null,
    rescanTimer: null,
    lastUrl: "",
    pending: new Set(),
    flushScheduled: false,
  };

  /* ------------------------------------------------------------------------
   *  safe：包一层 try-catch，单点失败不影响整页翻译
   *  输入：fn / 输出：fn 的返回值，出错时返回 undefined
   * ---------------------------------------------------------------------- */
  function safe(fn, label) {
    try {
      return fn();
    } catch (err) {
      if (CONFIG.debug) console.warn("[civitai-zh]", label || "", err);
      return undefined;
    }
  }

  /* ------------------------------------------------------------------------
   *  getPageKey：由 pathname 判定页面类型
   *  输入：pathname（默认 location.pathname）
   *  输出：PAGE_RULES 命中的 key，未命中返回 "other"
   * ---------------------------------------------------------------------- */
  function getPageKey(pathname) {
    const path = pathname || location.pathname;
    for (const [key, re] of PAGE_RULES) {
      if (re.test(path)) return key;
    }
    return "other";
  }

  /* ------------------------------------------------------------------------
   *  buildDict：合并通用词库 + 当前页面词库
   *  输出：普通对象（页面词条覆盖通用词条）
   * ---------------------------------------------------------------------- */
  function buildDict(pageKey) {
    const dict = Object.create(null);
    Object.assign(dict, COMMON);
    const pageDict = PAGES[pageKey];
    if (pageDict) Object.assign(dict, pageDict);
    return dict;
  }

  /* ------------------------------------------------------------------------
   *  isIgnored：判断元素是否位于禁止翻译区域
   *  输入：Element / 输出：true = 不翻
   * ---------------------------------------------------------------------- */
  function isIgnored(el) {
    if (!el || el.nodeType !== 1) return true;
    const tag = el.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return true;
    return !!el.closest(CONFIG.ignoreSelector);
  }

  /* ------------------------------------------------------------------------
   *  transText：核心翻译函数
   *  输入：原始文本
   *  输出：中文文本；无命中返回 null
   *  顺序：静态精确匹配 → 动态正则
   * ---------------------------------------------------------------------- */
  function transText(text) {
    if (typeof text !== "string") return null;
    const trimmed = text.replace(/[\s\u00a0]+/g, " ").trim();
    if (!trimmed || trimmed.length > CONFIG.maxTextLength) return null;
    if (!/[a-zA-Z]/.test(trimmed)) return null;

    const dict = State.dict;
    if (Object.prototype.hasOwnProperty.call(dict, trimmed)) return dict[trimmed];

    // 小写别名：仅限导航/页脚等已知 UI 词
    const alias = CASE_ALIASES[trimmed.toLowerCase()];
    if (alias && Object.prototype.hasOwnProperty.call(dict, alias)) return dict[alias];

    for (const [re, rep] of REGEXPS) {
      if (re.test(trimmed)) return trimmed.replace(re, rep);
    }
    return null;
  }

  /* ------------------------------------------------------------------------
   *  transNode：翻译单个文本节点，保留前后空白
   *  输入：Text 节点 / 输出：无
   * ---------------------------------------------------------------------- */
  function transNode(node) {
    if (!node || node.nodeType !== 3) return;
    const parent = node.parentElement;
    if (!parent || isIgnored(parent)) return;

    const raw = node.nodeValue;
    if (!raw || !raw.trim()) return;

    const out = transText(raw);
    if (out == null) return;

    const trimmed = raw.trim();
    // 只替换首尾去空白后的原文，避免破坏排版
    const next = raw.replace(trimmed, out);
    if (next !== raw) node.nodeValue = next;
  }

  /* ------------------------------------------------------------------------
   *  transAttribute：翻译元素属性（placeholder/title/aria-label）
   *  输入：Element + 属性名 / 输出：无
   * ---------------------------------------------------------------------- */
  function transAttribute(el, name) {
    if (!el || el.nodeType !== 1) return;
    if (!CONFIG.attrNames.includes(name)) return;
    if (isIgnored(el)) return;

    const raw = el.getAttribute(name);
    if (!raw) return;

    const out = transText(raw);
    if (out != null && out !== raw) el.setAttribute(name, out);
  }

  /* ------------------------------------------------------------------------
   *  walk：遍历子树里的文本节点并翻译
   *  输入：根节点（默认 document.body）/ 输出：无
   * ---------------------------------------------------------------------- */
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      transNode(root);
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || isIgnored(parent)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node;
    while ((node = walker.nextNode())) transNode(node);
  }

  /* ------------------------------------------------------------------------
   *  walkAttributes：元素集合中翻译属性
   *  输入：根节点 / 输出：无
   * ---------------------------------------------------------------------- */
  function walkAttributes(root) {
    if (!root || root.nodeType !== 1) return;
    const selector = CONFIG.attrNames.map((a) => `[${a}]`).join(",");
    const nodes = [root];
    if (root.querySelectorAll) nodes.push(...root.querySelectorAll(selector));
    for (const el of nodes) {
      if (el.nodeType !== 1) continue;
      for (const name of CONFIG.attrNames) {
        if (el.hasAttribute && el.hasAttribute(name)) transAttribute(el, name);
      }
    }
  }

  /* ------------------------------------------------------------------------
   *  transTitle：翻译页面标题
   *  输出：无 / 只改 document.title，不存在的键保持原样
   * ---------------------------------------------------------------------- */
  function transTitle() {
    const raw = document.title;
    if (!raw) return;
    const trimmed = raw.trim();
    if (TITLES[trimmed]) {
      document.title = TITLES[trimmed];
      return;
    }
    for (const [re, rep] of TITLE_REGEXPS) {
      if (re.test(trimmed)) {
        document.title = trimmed.replace(re, rep);
        return;
      }
    }
    // 详情页标题形如「模型名 | Civitai」，只翻固定后缀
    if (trimmed.endsWith("| Civitai") && trimmed !== "| Civitai") {
      return; // 模型名等用户内容保持原样
    }
  }

  /* ------------------------------------------------------------------------
   *  translatePage：整页翻译（幂等）
   *  输出：无
   * ---------------------------------------------------------------------- */
  function translatePage() {
    if (!State.enabled) return;
    safe(() => walk(document.body), "walk");
    safe(() => walkAttributes(document.body), "walkAttributes");
    safe(transTitle, "title");
  }

  /* ------------------------------------------------------------------------
   *  refreshContext：URL 或页面类型变化时重建词库
   *  输出：无
   * ---------------------------------------------------------------------- */
  function refreshContext(force) {
    const pageKey = getPageKey();
    const url = location.href;
    if (!force && pageKey === State.pageKey && url === State.lastUrl) return;

    State.pageKey = pageKey;
    State.lastUrl = url;
    State.dict = buildDict(pageKey);
    translatePage();
  }

  /* ------------------------------------------------------------------------
   *  队列：把 MutationObserver 的回调合并到一次微任务里，减少重复遍历
   * ---------------------------------------------------------------------- */
  function scheduleFlush() {
    if (State.flushScheduled) return;
    State.flushScheduled = true;
    Promise.resolve().then(() => {
      State.flushScheduled = false;
      const pending = State.pending;
      State.pending = new Set();
      for (const node of pending) {
        if (node.nodeType === 3) transNode(node);
        else if (node.nodeType === 1) {
          safe(() => walk(node), "mutation-walk");
          safe(() => walkAttributes(node), "mutation-attrs");
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
   *  onMutations：MutationObserver 回调
   *  输入：MutationRecord[] / 输出：无
   * ---------------------------------------------------------------------- */
  function onMutations(mutations) {
    if (!State.enabled) return;
    for (const m of mutations) {
      if (m.type === "characterData") {
        State.pending.add(m.target);
      } else if (m.type === "attributes") {
        safe(() => transAttribute(m.target, m.attributeName), "mutation-attr");
      } else if (m.type === "childList") {
        for (const node of m.addedNodes) State.pending.add(node);
      }
    }
    if (State.pending.size) scheduleFlush();
  }

  /* ------------------------------------------------------------------------
   *  startObserver：监听动态渲染的节点
   *  输出：无
   * ---------------------------------------------------------------------- */
  function startObserver() {
    if (State.observer || !document.documentElement) return;
    // 注意：回调必须包成函数再传给 MutationObserver，
    // 不能写成 new MutationObserver(safe(onMutations))——那会立即执行并传入 undefined
    State.observer = new MutationObserver((mutations) =>
      safe(() => onMutations(mutations), "observer")
    );
    State.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: CONFIG.attrNames,
    });
  }

  /* ------------------------------------------------------------------------
   *  兜底重扫：React 水合/延迟渲染可能漏掉部分节点
   *  这里必须直接调用 translatePage（refreshContext 在 URL 未变时会提前返回）
   * ---------------------------------------------------------------------- */
  function startRescan() {
    if (State.rescanTimer) return;
    State.rescanTimer = window.setInterval(() => {
      if (!State.enabled) return;
      safe(translatePage, "rescan");
    }, CONFIG.rescanInterval);
  }

  /* ------------------------------------------------------------------------
   *  URL 监听：包装 history.pushState/replaceState + popstate
   *  输出：无
   * ---------------------------------------------------------------------- */
  function setupUrlDetection() {
    for (const method of ["pushState", "replaceState"]) {
      const raw = history[method];
      if (typeof raw !== "function") continue;
      history[method] = function () {
        const result = raw.apply(this, arguments);
        safe(() => refreshContext(false), "url-change");
        return result;
      };
    }
    window.addEventListener("popstate", () => safe(() => refreshContext(false), "popstate"));
    window.addEventListener("hashchange", () => safe(() => refreshContext(false), "hashchange"));
  }

  /* ------------------------------------------------------------------------
   *  菜单：开关翻译
   *  输入：无 / 输出：无
   * ---------------------------------------------------------------------- */
  function setupMenuCommands() {
    const getValue = typeof GM_getValue === "function" ? GM_getValue : (k, d) => d;
    const setValue = typeof GM_setValue === "function" ? GM_setValue : () => {};
    const register =
      typeof GM_registerMenuCommand === "function" ? GM_registerMenuCommand : () => {};

    State.enabled = getValue("civitai-zh-enabled", true) !== false;

    register(State.enabled ? "关闭中文化" : "开启中文化", () => {
      State.enabled = !State.enabled;
      setValue("civitai-zh-enabled", State.enabled);
      if (State.enabled) refreshContext(true);
    });
  }

  /* ------------------------------------------------------------------------
   *  init：入口
   *  输出：无 / 预期：DOM 就绪后翻译整页并开始监听
   * ---------------------------------------------------------------------- */
  function init() {
    State.pageKey = getPageKey();
    State.lastUrl = location.href;
    State.dict = buildDict(State.pageKey);

    safe(setupMenuCommands, "menu");
    safe(setupUrlDetection, "url");

    translatePage();
    safe(startObserver, "observer");
    safe(startRescan, "rescan");

    // React 水合是异步的，多补几次翻译
    [300, 1000, 2500, 5000].forEach((delay) => {
      window.setTimeout(() => safe(translatePage, "delayed"), delay);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  /* ------------------------------------------------------------------------
   *  调试接口：在控制台验证某段文本是否命中词条/正则
   *  用法：__civitaiZh.transText("Show 3 More")
   *  预期：返回 "再显示 3 条"；未命中返回 null
   * ---------------------------------------------------------------------- */
  window.__civitaiZh = {
    transText,
    getPageKey,
    get pageKey() {
      return State.pageKey;
    },
  };
})(window, document);
