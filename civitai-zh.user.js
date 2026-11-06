// ==UserScript==
// @name         Civitai 中文化插件
// @namespace    https://github.com/1cyberlangke1/civitai-zh
// @description  中文化 Civitai 界面的菜单及内容
// @version      0.2.8
// @author       1cyberlangke1
// @license      MIT
// @match        https://civitai.com/*
// @match        https://civitai.red/*
// @match        https://civitai.green/*
// @match        https://creator-studio.civitai.com/*
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

  // 版本号：控制台日志与 <html data-civitai-zh=""> 都会写这个值，便于确认装的是哪一版
  const VERSION = "0.2.8";

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
    // 多义词按容器覆盖：同一英文在不同区域含义不同
    // 例：Save 在内容卡片上是「收藏」，在表单弹窗里是「保存」
    scopedDict: [{ selector: '[role="dialog"]', map: { Save: "保存" } }],

    // 兜底重扫间隔（毫秒）：React 水合后仍可能有漏网节点
    rescanInterval: 1500,

    // 单个文本节点最大长度：超过视为正文，不翻
    maxTextLength: 200,

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
    Hubs: "中心",
    Articles: "文章",
    Comics: "漫画",
    Crucibles: "擂台",
    Crucible: "擂台",
    Updates: "更新",
    Shop: "商店",
    More: "更多",
    Storylines: "故事线",
    Challenges: "挑战",
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
    Shape: "形状",
    Precision: "精度",
    // React 拆开的连接词（仅独立文本节点才会命中）
    and: "和",
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
    // ---- 顶栏图标 / 悬浮面板 ----
    "Account menu": "账号菜单",
    Chat: "聊天",
    "Civitai home": "Civitai 首页",
    "Dismiss Civitai turns 4.": "关闭 Civitai 四周年提示",
    "Customize page and navigation": "自定义页面与导航",
    "Collapse this event": "收起此活动",
    "Watch the Hats On video": "观看 Hats On 视频",
    "About this collection": "关于此收藏集",
    "About this section": "关于此版块",
    "Scroll right": "向右滚动",
    announcements: "公告",
    Milestones: "里程碑",
    Others: "其他",
    "Hide Read": "隐藏已读",
    "All caught up! Nothing to see here": "全部看完了！这里没有新内容",
    // React 会把 "No {标签} yet." 拆成三个文本节点，这里分别处理首尾
    No: "暂无",
    "yet.": "。",
    // ---- 自定义导航弹窗 ----
    "Customize navigation": "自定义导航",
    "Show labels": "显示标签",
    "Turn off for an icon-only nav bar.": "关闭后导航栏只显示图标。",
    "Keep profile tab labels": "保留个人主页标签文字",
    "On narrow screens, scroll the profile tabs instead of shrinking them to icons.":
      "在窄屏上滚动标签，而不是将其缩小为图标。",
    "Primary menu": "主菜单",
    "Shown as tabs, in this order.": "按此顺序显示为标签。",
    "More menu": "更多菜单",
    "Collapsed into a dropdown at the end of the bar.": "在导航栏末尾折叠为下拉菜单。",
    "Account settings": "账户设置",
    "Find a setting": "查找设置",
    "Always shown": "始终显示",
    Posts: "帖子",
    "Reset to default": "恢复默认",
    // 自定义导航：各导航项开关的 aria-label
    "Show models": "显示模型",
    "Show images": "显示图片",
    "Show videos": "显示视频",
    "Show 3D Models": "显示 3D 模型",
    "Show hubs": "显示中心",
    "Show posts": "显示帖子",
    "Show articles": "显示文章",
    "Show comics": "显示漫画",
    "Show crucibles": "显示擂台",
    "Show updates": "显示更新",
    "Show shop": "显示商店",
    "Show storylines": "显示故事线",
    "Show challenges": "显示挑战",
    "Show leaderboard": "显示排行榜",
    "Show auctions": "显示拍卖",
    "Show vault": "显示保险库",
    "Show collections": "显示收藏集",
    "Got it": "知道了",
    "Learn More": "了解更多",
    "Learn more": "了解更多",
    Upcoming: "即将开始",
    Details: "详情",
    Filters: "筛选",
    Hot: "热门",
    Newest: "最新",
    Oldest: "最早",
    "All Time": "全部时间",
    "Most Reactions": "最多反应",
    "Most Bookmarks": "最多收藏",
    "Most Downloaded": "最多下载",
    "Most Comments": "最多评论",
    "Most Collected": "最多收藏",
    "Recently Updated": "最近更新",
    "Close Ad": "关闭广告",
    "No results found": "未找到结果",
    // 图片/模型卡片右键菜单（React 拆成 Save + image + to collection 三段）
    "Save image to collection": "收藏图片到收藏集",
    "Hide this image": "隐藏此图片",
    "Hide content from this user": "隐藏此用户的内容",
    "Comment notification settings": "评论通知设置",
    // 404 页面
    "The page you are looking for doesn't exist": "你访问的页面不存在",
    "Go back home": "返回首页",
    "Generated by": "由",
    "as part of the": " 参加 ",
    "404 Contest": "404 大赛 ",
    Reviews: "评测",
    "No comments yet.": "暂无评论。",
    "No reviews yet": "暂无评测",
    Reply: "回复",
    Joined: "加入于",
    "Try adjusting your search or filters to find what you're looking for":
      "试试调整搜索或筛选条件，找到你想要的内容",
    "Searching for Models": "搜索模型",
    Support: "支持",
    Download: "下载",
    Comments: "评论",
    Version: "版本",
    "How it works": "了解详情",
    "Read more": "阅读更多",
    "🛟 Support": "🛟 支持",
    "Sign In/Sign up": "登录/注册",
    Leaderboard: "排行榜",
    Auctions: "拍卖",
    "Download Link App": "下载链接应用",
    "Get help": "获取帮助",
    "Getting Started": "入门指南",
    "Report a bug": "报告问题",
    "Hide this model": "隐藏此模型",
    "Block this user": "屏蔽此用户",
    "Report resource": "举报资源",
    "Report image": "举报图片",
    "Education Hub": "教育中心",
    FAQ: "常见问题",
    "Discord Community": "Discord 社区",
    "Support Portal": "支持门户",
    "Visit civitai.red": "访问 civitai.red",
    "View perks memberships": "查看特权会员",
    "Gift this tier": "赠送此等级",
    "Private Models": "私密模型",
    "Civitai Link": "Civitai 链接",
    "Creator Program": "创作者计划",
    Bronze: "青铜",
    Silver: "白银",
    Gold: "黄金",
    "Civitai's 4th Birthday": "Civitai 四周年",
    "Civitai | Share your models": "Civitai | 分享你的模型",
    "Green Memberships | Civitai": "Green 会员 | Civitai",
    "View Post": "查看帖子",
    Uploaded: "上传于",
    "The queue is empty": "队列为空",
    "Some new filtering options don't apply retroactively.":
      "部分新的筛选选项不会追溯生效。",
    "Civitai turns 4.": "Civitai 四周年。",
    "Pick up a hat.": "领取一顶帽子。",
    "Four color teams, Nov 1 to Nov 30. Hat your best work and score for your team.":
      "四色队伍，11 月 1 日至 11 月 30 日。为你的最佳作品戴上帽子，为你的队伍得分。",
    "You're on": "你所在的",
    "Team Yellow": "黄队",
    "Team Pink": "粉队",
    "Team Green": "绿队",
    "Team Blue": "蓝队",
    "See the event": "查看活动",
    Standings: "排名",
    "Your hats": "你的帽子",
    points: "积分",
    "Place it": "放置",
    "not on a post": "未用于帖子",
    "Another hat": "再戴一顶帽子",
    "+1 post scoring": "+1 帖子得分",
    Cap: "上限",
    Discussion: "讨论",
    "You must": "你需要",
    "to add a comment": "才能添加评论",
    "Be the first to leave a comment": "来抢沙发吧",
    "Add a comment": "添加评论",
    // 生成数据面板的元数据键（值保持原样）
    duration: "时长",
    seed: "种子",
    steps: "步数",
    ecosystem: "生态",
    workflow: "工作流",
    // 页内隐藏的 SEO 标题段（与 <title> 同文案）
    "AI Image & Video Models, LoRAs & Checkpoints | Civitai":
      "AI 图像与视频模型、LoRA 与 Checkpoint",
    Skip: "跳过",
    Next: "下一步",
    Standard: "标准",

    // ---- 模型筛选 / 排序（标签分类源码为小写 + CSS 大写，故按小写入库）----
    All: "全部",
    Everyone: "所有人",
    Followed: "已关注",
    "New & Upcoming": "新品与即将上线",
    "Time period": "时间范围",
    Day: "日",
    Week: "周",
    Month: "月",
    Year: "年",
    "Published (up to 31 days)": "发布时间（最多 31 天）",
    "Model status": "模型状态",
    "Early Access": "抢先体验",
    "Paid Access": "付费访问",
    "Hide Paid": "隐藏付费",
    "On-site Generation": "站内生成",
    "Made On-site": "站内制作",
    Featured: "精选",
    "Model types": "模型类型",
    // 技术名词标签保持原文：用「自身映射」阻断大小写回退误翻
    // （例如 poses 分类=姿势，但 Poses 模型类型必须保持 Poses）
    "Aesthetic Gradient": "Aesthetic Gradient",
    CLIP: "CLIP",
    Checkpoint: "Checkpoint",
    Controlnet: "Controlnet",
    DoRA: "DoRA",
    Hypernetwork: "Hypernetwork",
    LLM: "LLM",
    LoRA: "LoRA",
    LyCORIS: "LyCORIS",
    Motion: "Motion",
    Other: "Other",
    Poses: "Poses",
    "Text Encoder": "Text Encoder",
    Embedding: "Embedding",
    UNet: "UNet",
    Upscaler: "Upscaler",
    VAE: "VAE",
    VLM: "VLM",
    Wildcards: "Wildcards",
    Workflows: "Workflows",
    "ComfyUI Workflows": "ComfyUI Workflows",
    Detection: "Detection",
    "Base model": "基础模型",
    "All Base Models": "全部基础模型",
    Modifiers: "修饰项",
    Hidden: "隐藏",
    Reset: "重置",
    "Apply filters": "应用筛选",
    // 筛选面板（按字段筛选）
    "Sort models by": "模型排序方式",
    Relevancy: "相关度",
    "Highest Rated": "最高评分",
    "Most Liked": "最多点赞",
    "Most Discussed": "最多讨论",
    "Most Images": "最多图片",
    "Filter by Base Model": "按基础模型筛选",
    "Search Filter by Base Model": "搜索基础模型",
    "Filter by Model Type": "按模型类型筛选",
    "Filter by Checkpoint Type": "按 Checkpoint 类型筛选",
    Merge: "Merge",
    Trained: "Trained",
    "Filter by Last Updated At": "按最近更新时间筛选",
    From: "从",
    "Start date": "开始日期",
    To: "至",
    "End date": "结束日期",
    "Filter by File Format": "按文件格式筛选",
    "Filter by Category": "按分类筛选",
    Tags: "标签",
    "Search Tags": "搜索标签",
    "Search Users": "搜索用户",
    "Hide Early Access & paid models": "隐藏抢先体验与付费模型",
    Celebrity: "名人",
    // 标签分类
    character: "角色",
    style: "风格",
    concept: "概念",
    clothing: "服装",
    "base model": "基础模型",
    background: "背景",
    poses: "姿势",
    tool: "工具",
    assets: "素材",
    vehicle: "载具",
    buildings: "建筑",
    objects: "物品",
    action: "动作",
    animal: "动物",

    // ---- 账号菜单 ----
    Pinned: "置顶",
    "Your Profile": "你的主页",
    "Your Stuff": "你的内容",
    "Creator tools": "创作者工具",
    "Rewards and play": "奖励与游戏",
    "Liked Models": "喜欢的模型",
    "Bookmarked Articles": "收藏的文章",
    "Creators You Follow": "你关注的创作者",
    "Download History": "下载历史",
    Vault: "保险库",
    Inventory: "物品栏",
    "Buzz Dashboard": "Buzz 面板",
    "Creator Studio": "创作者工作室",
    "Creator Journey": "创作者历程",
    Training: "训练",
    Placements: "展示位",
    NEW: "新",
    "Get help fast": "快速获取帮助",
    "Switch account": "切换账号",
    Prizes: "奖品",
    Referrals: "推荐",

    // ---- 设置页导航 ----
    Account: "账户",
    Overview: "概览",
    "Profile & Account": "资料与账户",
    Preferences: "偏好设置",
    Notifications: "通知",
    Content: "内容",
    "Content & Browsing": "内容与浏览",
    Creator: "创作者",
    "Billing & access": "账单与权限",
    "Membership & Billing": "会员与账单",
    "Security & Apps": "安全与应用",
    "Jump to": "跳转到",

    // ---- 设置页正文 ----
    "Account info": "账户信息",
    Username: "用户名",
    "Account email": "账户邮箱",
    "Verify email": "验证邮箱",
    "Change email": "更改邮箱",
    "Save changes": "保存更改",
    "Customize profile": "自定义主页",
    "Event hat": "活动帽子",
    "Show my event hat on my avatar": "在我的头像上显示活动帽子",
    "Turn this off to take the event hat off your avatar. You keep your hats and can turn it back on any time.":
      "关闭后即可从头像上取下活动帽子。你仍保留帽子，随时可以重新开启。",
    "Creator profile": "创作者资料",
    "Shown on your public profile.": "显示在你的公开主页上。",
    "Social links": "社交链接",
    "Add link": "添加链接",
    "Sponsorship links": "赞助链接",
    "Account standing": "账户信誉",
    "Creator Score": "创作者积分",
    "Reputation from your content, minus content removed for violations":
      "来自你内容的声誉，减去因违规被移除的内容",
    "Unlocks: judge crucibles.": "解锁：担任擂台评委。",
    "How Creator Score works": "创作者积分如何计算",
    "Your Creator Score measures how much the community values what you share. It grows when":
      "你的创作者积分衡量社区对你分享内容的认可程度。它会在以下情况增长：",
    "Downloads, generations, and positive reviews of models": "模型的下载、生成与好评",
    "Reactions and comments on images": "图片上的反应与评论",
    "Views, reactions, and comments on articles": "文章的浏览、反应与评论",
    "Follower count": "关注者数量",
    "Helping moderation": "协助管理",
    "Reports filed that moderators act on": "被管理员处理的问题举报",
    "Images removed for breaking our rules take points away for six months, some less than others depending on the reason.":
      "因违反规则被移除的图片会扣分六个月，视原因不同，部分扣分较少。",
    "Models a moderator takes down stop counting, and if people unfollow you or remove a reaction, those points go too.":
      "被管理员下架的模型不再计分；若有人取消关注或移除反应，相应积分也会消失。",
    "Your score updates once a day, so today's activity shows up tomorrow.":
      "积分每天更新一次，今天的活动明天才会计入。",
    Strikes: "违规记录",
    "No active strikes.": "无有效违规记录。",
    "Good standing": "信誉良好",
    "Refresh my session": "刷新我的会话",
    "Reloads your account data. Safe to run any time.":
      "重新加载你的账户数据。随时可安全执行。",
    Refresh: "刷新",
    "Delete account": "删除账户",
    "You choose what happens to your models and images. This cannot be undone.":
      "你可以决定模型和图片如何处置。此操作无法撤销。",
    Membership: "会员资格",
    "Buzz balance": "Buzz 余额",
    Standing: "信誉",
    Good: "良好",
    Unverified: "未验证",
    free: "免费",
    "email notifications, on-site, comments": "邮件通知、站内、评论",
    "mature, nsfw, browsing level": "成人、NSFW、浏览级别",
    "subscription, membership, payment methods": "订阅、会员、支付方式",
    "sign in, connected accounts, api keys": "登录、关联账户、API 密钥",
    Email: "邮箱",
    "social links": "社交链接",
    "sponsorship links": "赞助链接",
    "See your journey": "查看你的历程",
    "people use, react to, and follow your work": "人们使用、反应并关注你的作品",
    // ---- Civitai Link / Vault（支持者功能卡片）----
    "Civitai Vault": "Civitai 保险库",
    "Civitai Link is a Supporter feature, still in early access.":
      "Civitai Link 是支持者功能，仍在抢先体验中。",
    "Are you a supporter and seeing this message?": "你是支持者却看到这条消息？",
    "Click here": "点击这里",
    "Send models straight to your machine": "将模型直接发送到你的设备",
    "Supporters get one-click sending to the ComfyUI node pack or the Link desktop app.":
      "支持者可一键发送到 ComfyUI 节点包或 Link 桌面应用。",
    "ComfyUI node pack": "ComfyUI 节点包",
    "Link desktop app": "Link 桌面应用",
    "See how it works": "了解详情",
    "Become a Supporter": "成为支持者",

    // ---- 设置：偏好 Preferences ----
    "Media playback": "媒体播放",
    "Autoplay GIFs": "自动播放 GIF",
    "Swipe between images on gallery cards": "在画廊卡片上滑动切换图片",
    "Swipe through a post's images instead of using the arrows.":
      "滑动浏览帖子的图片，无需使用箭头。",
    "Animate stickers placed on images": "为图片上的贴纸添加动画",
    "Off keeps them still; they stay visible either way.":
      "关闭后保持静止；无论开关如何它们都会显示。",
    "Larger Images in Generator": "生成器中更大的图片",
    "Images displayed in the generator will be larger on small screens":
      "生成器中显示的图片在小屏幕上会更大",
    "Native Video Controls": "原生视频控件",
    "Use your browser's built-in video player controls (with a seek bar) for all videos.":
      "对所有视频使用浏览器内置的视频播放器控件（带进度条）。",
    Generation: "生成",
    "Advanced Mode": "高级模式",
    "Allow unrestricted mixing of additional resources and base models.":
      "允许不受限制地混用附加资源和基础模型。",
    "File preferences": "文件偏好",
    "Defaults for the download button.": "下载按钮的默认设置。",
    "Preferred model format": "首选模型格式",
    "Preferred precision": "首选精度",
    "fp16 halves the size of most checkpoints.":
      "fp16 可将大多数 Checkpoint 的体积减半。",
    "CivBot Assistant": "CivBot 助手",
    "A helpful chat assistant that can answer questions about Stable Diffusion, Civitai, and more! We're still training it, so please report any issues you find!":
      "一个有用的聊天助手，可以回答有关 Stable Diffusion、Civitai 等的问题！我们仍在训练它，如发现问题请反馈！",
    Personality: "个性",
    "Available to subscribers.": "订阅者可用。",
    "Hide me from 'who reacted' and 'who collected' lists":
      "在「谁反应了」和「谁收藏了」列表中隐藏我",
    "Creators and other users will not see your name when you react to or publicly collect their content. Your reactions still count, and you still see your own.":
      "创作者和其他用户不会在你对他们的内容作出反应或公开收藏时看到你的名字。你的反应仍然计入，你仍然能看到自己的。",
    "Show my older image reactions in 'who reacted' lists":
      "在「谁反应了」列表中显示我较早的图片反应",
    "Image reactions you made before September 23, 2026, when creators could first see who reacted, stay out of those lists unless you turn this on.":
      "你在 2026 年 9 月 23 日（创作者首次可以看到谁反应）之前作出的图片反应，除非开启此项，否则不会出现在这些列表中。",
    Features: "功能",
    "Training Studio": "训练工作室",
    Beta: "Beta",
    "Use the new Training Studio for LoRA training. Turn this off to go back to the classic trainer, which will be phased out gradually as Training Studio matures.":
      "使用新的训练工作室进行 LoRA 训练。关闭后将回到经典训练器，随着训练工作室成熟，经典训练器会逐步淘汰。",
    "AI Resource Identifier": "AI 资源标识符",
    "Show the Civitai AIR on resources for easy use within the Civitai Services API or Civitai Comfy Nodes.":
      "在资源上显示 Civitai AIR，便于在 Civitai Services API 或 Civitai Comfy Nodes 中使用。",
    Chats: "聊天",
    "Send and receive DMs from users across the site.": "在全站用户之间收发私信。",
    "Hide Blue Buzz in the header": "在顶栏隐藏蓝色 Buzz",
    "Leaves it out of the header balance. You can still spend it.":
      "从顶栏余额中隐藏。你仍可花费它。",
    "Fit post images to screen": "让帖子图片适应屏幕",
    "Shows each image in a post whole, sized to fit your screen, instead of at full width.":
      "完整显示帖子中的每张图片，按屏幕大小缩放，而不是全宽显示。",
    "Join the early-adopter program": "加入抢先体验计划",
    "Features before they roll out. They may be rough or change without notice.":
      "在功能全面推出前提前体验。它们可能不完善或随时变更，恕不另行通知。",

    // ---- 设置：通知 Notifications ----
    Delivery: "发送方式",
    "On-site notifications": "站内通知",
    "The bell in the header. Off silences every category below.":
      "顶栏的铃铛。关闭会静音下方所有类别。",
    Newsletter: "订阅邮件",
    "Product news by email. Separate from the categories below.":
      "通过邮件发送的产品新闻。与下方类别独立。",
    Comment: "评论",
    Milestone: "里程碑",
    Update: "更新",
    System: "系统",
    Moderation: "管理",
    Referral: "推荐",
    "Knights of New Order: Performance Check Failed":
      "新秩序骑士：性能检查失败",
    "Knights of New Order: Smite": "新秩序骑士：惩击",
    "Knights of New Order: Cleansed Smite": "新秩序骑士：净化惩击",
    "Knights of New Order: Game Over": "新秩序骑士：游戏结束",
    "Knights of New Order: Templar Promotion": "新秩序骑士：圣殿骑士晋升",
    "Knights of New Order: Knight Demotion": "新秩序骑士：骑士降级",
    "Knights of New Order: Blessed Buzz Granted": "新秩序骑士：获得祝福 Buzz",

    // ---- 搜索分类 ----
    Users: "用户",
    Collections: "收藏集",
    Tools: "工具",
    Bounties: "悬赏",
    Bounty: "悬赏",

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
    storylines: "Storylines",
    challenges: "Challenges",
    articles: "Articles",
    comics: "Comics",
    crucibles: "Crucibles",
    crucible: "Crucible",
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
    cap: "Cap",
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
      "Featured Models": "精选模型",
      "Top Videos This Week": "本周热门视频",
      "New & Upcoming Creators": "新锐与即将上线的创作者",
      "New & Upcoming Model Creators": "新锐与即将上线的模型创作者",
      "Buzz Beggars Board": "Buzz 乞讨榜",
      "Beg or Give": "乞讨或赠予",
      "Curated Collection by": "精选收藏集，策展人：",
      "Top Creators": "顶尖创作者",
      "Master Generators (Video)": "生成大师（视频）",
      "Sticker Magnets": "贴纸磁铁",
      "Sticker Placers": "贴纸达人",
      Pink: "粉色",
      Green: "绿色",
      Blue: "蓝色",
      Yellow: "黄色",
    },

    // ---- 模型列表 ----
    models: {
      "Become a Member to turn off ads today.": "成为会员，立即关闭广告。",
      "Do It": "去开通",
    },

    // ---- 上传模型 ----
    "models-create": {
      "Publish a Model": "发布模型",
      "Use a template": "使用模板",
      "Create your model": "创建你的模型",
      "Add version": "添加版本",
      "Upload files": "上传文件",
      "Create a post": "创建帖子",
      "Title, description & cover": "标题、描述与封面",
      "Your model has a card on civitai.red and a card on civitai.com. These are the parts each card can set for itself; everything else about the model is shared across both sites.":
        "你的模型在 civitai.red 和 civitai.com 各有一张卡片。以下内容是每张卡片可单独设置的；模型的其他一切在两个站点间共享。",
      "Same on both sites": "两个站点相同",
      "civitai.com shows the same card as civitai.red.":
        "civitai.com 显示与 civitai.red 相同的卡片。",
      "Set up a civitai.com card to give this model its own title, description and cover there. civitai.com is for a general audience, so its card is checked for that.":
        "为 civitai.com 设置单独卡片，让它在那里拥有自己的标题、描述和封面。civitai.com 面向大众，因此该卡片会按此标准审核。",
      "Customize for civitai.com": "为 civitai.com 自定义",
      "Draft a civitai.com version": "起草 civitai.com 版本",
      "You can select your main cover after you publish this model's first images. A default cover will be selected for you from there.":
        "发布该模型的首批图片后即可选择主封面。在此之前会为你自动选择一个默认封面。",
      "Checkpoint Type": "Checkpoint 类型",
      Type: "类型",
      Category: "分类",
      "Selecting the closest match helps users find your resource.":
        "选择最接近的分类有助于用户找到你的资源。",
      "Search or create tags for your model": "为模型搜索或创建标签",
      "Showcase Collection": "展示收藏集",
      "Select the collection this model belongs to": "选择该模型所属的收藏集",
      "Click here to select a collection": "点击此处选择收藏集",
      "Creator Controls: metric privacy": "创作者控制：指标隐私",
      "Metric privacy applies while you hold an active Creator Program membership. These stats are shown until then.":
        "指标隐私在你是有效创作者计划成员期间生效。在此之前这些统计会公开展示。",
      "When using this model, I give permission for users to:":
        "使用此模型时，我允许用户：",
      "Use without crediting me": "使用但无需署名我",
      "Share merges of this model": "分享此模型的合并版",
      "Use different permissions on merges": "对合并版使用不同权限",
      "Learn more about how licensing works by reading our": "阅读我们的",
      "Licensing Guide": "许可指南",
      "Commercial Use": "商业用途",
      "Select all permissions you would like to apply to your model.":
        "勾选你想应用于此模型的所有权限。",
      "Sell generated images": "出售生成的图片",
      "Use on Civitai generation service": "在 Civitai 生成服务上使用",
      "Use on other generation services": "在其他生成服务上使用",
      "Sell this model": "出售此模型",
      "Sell merges using this model": "出售使用此模型的合并版",
      "This resource:": "此资源：",
      "Depicts an actual person": "描绘真实人物",
      "This model was trained on real imagery of a living, or deceased, person, or depicts a character portrayed by a real-life actor or actress. E.g. Tom Cruise or Tom Cruise as Maverick.":
        "此模型使用在世或已故真实人物的真实影像训练，或描绘由真人演员饰演的角色。例如汤姆·克鲁斯或汤姆·克鲁斯饰演的独行侠。",
      Yes: "是",
      "Is intended to produce mature themes": "意在生成成人主题",
      "Intended to depict a minor character": "意在描绘未成年角色",
      "Cannot be used for NSFW generation": "不可用于 NSFW 生成",
      "I acknowledge that I have reviewed the choices above, selected the appropriate option, and understand that my account may be at risk if the selection is found to be incorrect.":
        "我确认已审阅上述选项、选择了合适的选项，并了解若选择被认定有误，我的账号可能面临风险。",
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
      // 评测评级
      "Overwhelmingly Positive": "好评如潮",
      "Very Positive": "特别好评",
      Positive: "好评",
      Mixed: "褒贬不一",
      Negative: "差评",
      "Very Negative": "特别差评",
      "Overwhelmingly Negative": "差评如潮",
      Joined: "加入于",
      "Full precision, largest file": "完整精度，最大文件",
      "Half precision, best balance (pruned)": "半精度，最佳平衡（已裁剪）",
      "Download Selected": "下载所选",
      "Generation License Fee": "生成许可费",
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
      "Daily free sticker": "每日免费贴纸",
      "What's a remix gallery?": "什么是重混画廊？",
      "Any creator can appear on a popular image, and you get to see other takes on work you liked. Iterate on it, restyle it, edit it, or turn it into a video - the creator reviews every submission.":
        "任何创作者都可能出现在热门图片上，你也能看到别人如何演绎你喜欢的作品。你可以迭代、改风格、编辑，或把它做成视频 - 每次提交都会由创作者审核。",
      "Why we built this": "为什么我们要做这个",
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
      "My hubs": "我的 Hub",
      "How hubs work": "Hub 如何运作",
      "Pick the creators, models and tags you want to keep an eye on. New images show up in your hub as they are posted - you never have to add them.":
        "挑选你想关注的创作者、模型和标签。新图片发布后会自动出现在你的 Hub 中——你无需手动添加。",
      "You have not made a hub yet. Pick a starting point above, or make an empty one.":
        "你还没有创建 Hub。从上方选一个起点，或创建一个空的。",
    },

    // ---- 文章列表 ----
    articles: {
      "My checkpoints": "我的 Checkpoint",
      // 文章分类（站点定义的筛选项；DOM 里是大小写混合，靠 CSS 转大写）
      "Civitai Official": "Civitai 官方",
      announcement: "公告",
      story: "故事",
      musing: "随笔",
      workflows: "工作流",
      "generation guide": "生成指南",
      news: "新闻",
      "tool guide": "工具指南",
      "training guide": "训练指南",
      "resource guide": "资源指南",
      "comparative study": "对比研究",
      "video generation guide": "视频生成指南",
      "data prep": "数据准备",
      "ML Research": "机器学习研究",
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
      "ch.": "章",
      Browse: "浏览",
      chapters: "章",
      "Start Reading": "开始阅读",
      Chapters: "章节",
      page: "页",
      pages: "页",
      "New Chapter": "新章节",
    },

    // ---- Crucibles ----
    crucibles: {
      "Crucible Discovery": "擂台发现",
      "Welcome to the Crucible": "欢迎来到擂台",
      "Start Judging": "开始评审",
      "Create Crucible": "创建擂台",
      "Create a crucible": "创建擂台",
      "A new way to play and earn Buzz on Civitai: head-to-head competitions where the community, not an AI, picks the winner.":
        "在 Civitai 上边玩边赚 Buzz 的新方式：正面交锋的比赛，由社区而非 AI 决定赢家。",
      "Submit your best image or video to a crucible whose theme it fits. Every entry fee grows the prize pool.":
        "将你最好的图片或视频提交到主题契合的擂台。每笔参赛费都会扩充奖池。",
      "Pick the better of two entries, head to head. Every vote moves the rankings, and every judge's vote counts the same.":
        "在两件作品之间一对一选出更好的。每一票都会改变排名，每位评委的票权重相同。",
      "Prize Pool": "奖池",
      "Enter Competition": "参加比赛",
      "Your crucible record": "你的擂台战绩",
      "Crucibles Entered": "参加擂台数",
      "Buzz Won": "赢得 Buzz",
      "Best Finish": "最佳名次",
      "Avg Finish": "平均名次",
      "Votes Cast": "投票数",
      "From ended crucibles": "来自已结束的擂台",
      "Ending Soon": "即将结束",
      "Most Entries": "参赛最多",
      "Content type": "内容类型",
      Active: "进行中",
      Completed: "已结束",
      "Report crucible": "举报擂台",
      Enter: "参赛",
      Judge: "评审",
      Win: "获胜",
      "When the timer runs out, the top-ranked entries split the prize pool in Buzz.":
        "倒计时结束时，排名靠前的作品将平分 Buzz 奖池。",
      "Biggest prize pool": "最大奖池",
      "Time Remaining": "剩余时间",
      Entries: "参赛作品",
      "Discover Crucibles": "探索擂台",
      "Ending soon": "即将结束",
      left: "剩余",
      entries: "件作品",
      entrants: "位参赛者",
      "You are all caught up": "你已经看完了",
      "Consider changing your period or filters to find more":
        "试试更换时间段或筛选条件来发现更多",
      "Back to the top": "回到顶部",
    },

    // ---- 更新日志（正文不翻，仅 UI）----
    // ---- 更新日志 ----
    changelog: {
      Changelog: "更新日志",
      Announcement: "公告",
      "New Features": "新功能",
      "🚀 New Features": "🚀 新功能",
      "Bug Fixes": "问题修复",
      "🐛 Bug Fixes": "🐛 问题修复",
      Improvements: "改进",
      "✨ Improvements": "✨ 改进",
      "Read the announcement": "阅读公告",
      ", or see": "，或查看",
      "the guide": "指南",
    },

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
      Try: "试试",
      generating: "生成",
      "new images with our resources": "用我们的资源创作新图片",
      "Welcome to the content generation tool! This tour will guide you through the process.":
        "欢迎使用内容生成工具！本引导将带你走完整个流程。",
      "our content policies": "我们的内容政策",
      "will result in the loss of your access to the image generator. Illegal or exploitative content will be removed and reported.":
        "将导致你失去图像生成器的访问权限。违法或剥削性内容将被删除并上报。",
      "View presets": "查看预设",
      "Save current values": "保存当前值",
      "Manage presets": "管理预设",
      Queue: "队列",
      Feed: "信息流",
      "No download needed": "无需下载",
      "Type out what you'd like to generate in the prompt, add aspects you'd like to avoid in the negative prompt.":
        "在提示词中输入你想生成的内容，在反向提示词中加入你想避免的元素。",
      "Controls how closely the generation follows the text prompt.":
        "控制生成结果与文本提示词的贴合程度。",
      High: "高",
      Highest: "最高",
      Reactions: "反应",
      Favorited: "已收藏",
      Liked: "已喜欢",
      Disliked: "不喜欢",
      "Generation Type": "生成类型",
      Audio: "音频",
      Ecosystem: "生态",
      Workflow: "工作流",
      "Date Range": "日期范围",
      From: "起",
      "Start date": "开始日期",
      To: "至",
      "End date": "结束日期",
      "Hide Failed": "隐藏失败",
    },

    // ---- 挑战 ----
    challenges: {
      "Community Challenges": "社区挑战",
      "No challenges found": "未找到挑战",
      // 挑战详情页
      Live: "进行中",
      entries: "件作品",
      "What To Create": "创作主题",
      "Theme Elements": "主题元素",
      Starts: "开始",
      Ends: "结束",
      "Max Entries": "最大提交数",
      "per user": "每位用户",
      "AI Reviews": "AI 评审",
      Generate: "生成",
      Submit: "提交",
      "We're featuring": "本期推荐",
      "Participation Prize Requirement": "参与奖条件",
      Min: "最少",
      "entries to qualify": "件作品即可获得资格",
      "Allowed Ratings": "允许的分级",
      Participation: "参与奖",
      Judging: "评审",
      by: "由",
      "1st Place": "第 1 名",
      "2nd Place": "第 2 名",
      "3rd Place": "第 3 名",
      "Only entries the judge scores can place. The highest scores make a shortlist, and a final review of that shortlist decides the places, so a higher score doesn't guarantee a place.":
        "只有经过评委打分的作品才有机会获奖。得分最高的作品会进入候选名单，最终由评审决定名次，因此高分并不保证获奖。",
      Theme: "主题",
      "How well the entry fits and interprets the challenge theme; higher for a clear, strong, on-theme interpretation.":
        "作品对挑战主题的贴合与诠释程度；诠释越清晰、强烈、切题，得分越高。",
      Wittiness: "巧思",
      "Cleverness and conceptual wit of the idea; higher for sharp, clever concepts.":
        "创意的机智与概念巧妙程度；概念越犀利、巧妙，得分越高。",
      Humor: "幽默",
      "How funny or amusing the entry is; higher for genuinely funny results.":
        "作品的搞笑或有趣程度；越真正好笑，得分越高。",
      Aesthetic: "美感",
      "Overall visual appeal - composition, color, lighting, and style; higher for striking, well-composed images.":
        "整体视觉吸引力——构图、色彩、光线与风格；画面越出彩、构图越好，得分越高。",
      "Eligible Models": "可用模型",
      total: "总计",
      "Generate Entries": "生成作品",
      "Submit Entries": "提交作品",
    },

    // ---- Storylines ----
    storylines: {
      "Start a storyline": "开始故事线",
      "Welcome to Storylines": "欢迎来到 Storylines",
      "Watch the video": "观看视频",
      "Got it": "知道了",
      New: "新",
      Read: "阅读",
      Ongoing: "连载中",
      "Collaborators only": "仅协作者",
      "Secret class": "私密等级",
      chapters: "章",
      "Start reading": "开始阅读",
      Chapters: "章节",
      Contributors: "贡献者",
      "About continuing": "关于续写",
      "'s collaborators can continue it.": " 的协作者可以续写。",
      "Up to": "最多",
      "This chapter is hidden by your browsing level": "此章节因你的浏览等级被隐藏",
      Only: "仅",
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
      "Welcome to auctions! This tour will guide you through the process.":
        "欢迎来到拍卖！本引导将带你走完整个流程。",
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
      "Crucible Judges": "擂台评委",
      "Crucible Competitors": "擂台参赛者",
      "Crucible Hosts": "擂台主办者",
      "Top model creators in the community": "社区顶级模型创作者",
      "As of": "截至",
      ". Refreshes in:": "。刷新倒计时：",
    },

    // ---- 收藏集 ----
    // ---- 收藏集 ----
    collections: {
      "Likes & bookmarks": "点赞与收藏",
      "Bookmarked Model": "已收藏模型",
      "Pick a collection": "选择一个收藏集",
      "Choose one from the list on the left to view it.":
        "从左侧列表中选择一个以查看。",
      "Create collection": "创建收藏集",
      Article: "文章",
      Model: "模型",
    },

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
      "A summary of our policies, guidelines, and approach to keeping Civitai safe.":
        "我们政策、准则以及维护 Civitai 安全方式的概述。",
      "How we keep generation and sharing safe": "我们如何保障生成与分享的安全",
      Welcome: "欢迎",
      "Responsible Resource Development": "负责任的资源开发",
      "Content Policies": "内容政策",
      "Using Civitai to Generate": "使用 Civitai 生成",
      "How We Moderate Content": "我们如何审核内容",
      Minors: "未成年人",
      "Models intended for creating photorealistic depictions of minors are prohibited.":
        "禁止制作意在生成未成年人照片级写实描绘的模型。",
      "Take care not to include any photorealistic images of minors (under 18) in training data.":
        "注意不要在训练数据中包含任何未成年（18 岁以下）的照片级写实图像。",
      "Avoid all depictions of minors when training resources that are capable of depicting nudity or sexual themes.":
        "训练能够描绘裸露或性主题的资源时，避免出现任何未成年人形象。",
      "Extreme or Illegal Conduct": "极端或违法行为",
      "Do not create resources with the purpose of depicting extreme fetishes or illegal conduct, such as rape, sexual abuse, scat or bestiality.":
        "不要制作意在描绘极端癖好或违法行为的资源，例如强奸、性虐待、粪便癖或兽交。",
      "Do not create resources with a tendency to produce disturbing imagery, such as graphic violence, gore, animal abuse, severe injuries or human death.":
        "不要制作倾向于生成令人不适图像的资源，例如血腥暴力、猎奇、虐待动物、重伤或人类死亡。",
      Testing: "测试",
      "Prior to contributing a resource to Civitai, ensure that it does not have a tendency to produce:":
        "在向 Civitai 贡献资源前，请确保它不会倾向于生成：",
      "Photorealistic images of minors (under 18)": "未成年（18 岁以下）的照片级写实图像",
      "Minors in inappropriate clothing, poses, or themes":
        "穿着不当、姿势不当或主题不当的未成年人",
      "Disturbing imagery, such as graphic violence, gore, animal abuse, severe injuries or human death":
        "令人不适的图像，如血腥暴力、猎奇、虐待动物、重伤或人类死亡",
      "All photorealistic images of minors are prohibited.":
        "禁止所有未成年人的照片级写实图像。",
      "All sexual depictions of minors are prohibited, including anime genres such as loli and shotacon":
        "禁止所有未成年人的性描绘，包括 loli、shotacon 等动漫类型",
      "Depicting Minors": "描绘未成年人",
      "Portraying minors in any inappropriate or suggestive context is strictly prohibited. This includes:":
        "严禁在任何不当或暗示性语境中描绘未成年人，包括：",
      "Clothing:": "服装：",
      Photorealism: "照片级写实",
      "Photorealism:": "照片级写实：",
      "Photorealistic images that could be mistaken for a real minor are strictly prohibited.":
        "严禁可能被误认为真实未成年人的照片级写实图像。",
      "Poses:": "姿势：",
      "Poses should be natural, innocent, and age-appropriate. Avoid any poses and facial expressions that could be misinterpreted as suggestive or inappropriate.":
        "姿势应自然、纯真且符合年龄。避免任何可能被误解为暗示性或不当的姿势与表情。",
      "Interactions:": "互动：",
      "Interactions between minors and adults, or between minors themselves, should be appropriate, non-suggestive, and common in a wholesome, everyday context.":
        "未成年人与成年人之间，或未成年人之间的互动，应得体、无暗示性，并且是健康日常语境中常见的。",
      FAQs: "常见问题",
      "Q: How are these guidelines enforced?": "问：这些准则如何执行？",
      "A:": "答：",
      "Q: How can I report content that I believe violates the community guidelines?":
        "问：如何举报我认为违反社区准则的内容？",
      "Q: Why are you so strict about this?": "问：为什么你们对此如此严格？",
      "Great question! We have two key reasons:": "好问题！我们有两个关键原因：",
      "Ethical:": "伦理上：",
      "Child exploitation is universally unacceptable. Our guidelines are designed to protect and respect the dignity of all individuals, especially minors.":
        "剥削儿童在任何地方都不可接受。我们的准则旨在保护并尊重所有人的尊严，尤其是未成年人。",
      "Legal:": "法律上：",
      "Being a US-based entity, we're obliged to follow laws governing content involving minors.":
        "作为总部位于美国的实体，我们必须遵守涉及未成年人内容的相关法律。",
      "Q: I've used terms that invoke youth in my prompt, but the image doesn't resemble that. Is that okay?":
        "问：我在提示词里用了暗示年幼的词，但图像并不像那样。这样可以吗？",
      "Q: How do you determine if a character is a minor or not?":
        "问：你们如何判断一个角色是否未成年？",
      "Q: My resource is meant to depict a fictional character who is a minor. Can I depict them in a manner that is not age-appropriate?":
        "问：我的资源意在描绘一个未成年的虚构角色。我能以不符合年龄的方式描绘他们吗？",
      "No, we apply the same standards to fictional characters who are minors as we do to real-life minors. They should be depicted in an age-appropriate manner.":
        "不可以。我们对未成年的虚构角色与真实未成年人适用相同标准，应以符合年龄的方式描绘。",
      "Q: Are there any restrictions on using AI to create child-like models?":
        "问：使用 AI 创建儿童般的模型有什么限制吗？",
      "Yes, creating photorealistic models of minors is strictly prohibited.":
        "有。严禁创建未成年人的照片级写实模型。",
      "Q: What happens if someone repeatedly violates the community guidelines?":
        "问：如果有人反复违反社区准则会怎样？",
      "We take guideline violations seriously. We have a 0 strike policy for violations involving minors. Offending content will be removed, and the uploader will be banned from the platform.":
        "我们严肃对待违反准则的行为。涉及未成年人的违规实行零容忍政策：违规内容将被删除，上传者将被封禁。",
      "Q: I'm not sure if my content adheres to the guidelines. What should I do?":
        "问：我不确定我的内容是否符合准则，该怎么办？",
      "When in doubt, err on the side of caution. Contact our moderation team with questions or concerns before posting your content. We're here to assist!":
        "拿不准时请谨慎行事。发布内容前，如有疑问或顾虑请联系我们的审核团队。我们随时提供帮助！",
      "Q: Can I provide feedback or suggest changes to the community guidelines?":
        "问：我可以对社区准则提供反馈或建议修改吗？",
      "Absolutely! Your input is valuable to us. If you have suggestions for improving the guidelines or notice something we missed, let us know by submitting feedback or reaching out to us on Discord.":
        "当然可以！你的意见对我们很有价值。如果你有改进准则的建议，或发现我们遗漏的地方，请提交反馈或在 Discord 联系我们。",
      "Real People": "真实人物",
      "Content that reproduces the likeness of real people, in any context, is prohibited.":
        "禁止在任何语境中再现真实人物肖像的内容。",
      "This prohibition includes fan-art or representations of characters as portrayed by a recognizable individual (e.g., Indiana Jones as portrayed by Harrison Ford).":
        "该禁令包括同人创作，或以可辨认的个人形象呈现的角色（例如哈里森·福特饰演的印第安纳·琼斯）。",
      "The use of names, facial features, or any other personally identifiable attributes to reference or imply a real individual is also disallowed.":
        "同样不允许使用姓名、面部特征或任何其他可识别个人身份的特征来指代或暗示真实个人。",
      "Disturbing Imagery and Hate Speech": "令人不适的图像与仇恨言论",
      "Do not post extremely disturbing images, such as graphic violence, gore, animal abuse, severe injuries or human death":
        "不要发布极度令人不适的图像，例如血腥暴力、猎奇、虐待动物、重伤或人类死亡",
      "Do not post images that are disrespectful, demeaning or otherwise harmful towards people or groups of people on the basis of their:":
        "不要发布基于以下因素对个人或群体不尊重、贬低或造成伤害的图像：",
      "Religion or religious beliefs": "宗教或宗教信仰",
      "Nationality, ethnicity, or race": "国籍、民族或种族",
      "Gender or sexual orientation": "性别或性取向",
      "Disability or medical conditions": "残疾或健康状况",
      "Content Duplication and Impersonation": "内容重复与冒充",
      "Only post original images that you generated yourself.":
        "只发布你自己生成的原创图像。",
      "Do not falsely label images as having been created or endorsed by another creator or otherwise impersonate another creator.":
        "不要虚假标注图像由其他创作者创作或认可，也不要冒充其他创作者。",
      "When using our onsite image generating services, all prompts and resulting images must comply with our content policies.":
        "使用站内图像生成服务时，所有提示词及生成的图像都必须遵守我们的内容政策。",
      "This includes, but is not limited to, restrictions on mature content as it applies to minors, illegal or violent activities, and disrespectful or offensive content.":
        "这包括但不限于：涉及未成年人的成人内容限制、违法或暴力活动，以及不尊重或冒犯性内容。",
      "Prohibited Image Generation Attempts": "禁止的图像生成尝试",
      "Attempts to generate content that violate our content policies are strictly prohibited.":
        "严禁尝试生成违反我们内容政策的内容。",
      "Moderation and Enforcement": "审核与执行",
      "Reporting and Accountability": "举报与问责",
      "Users found to be repeatedly attempting to generate content that violates our rules may face additional consequences, including potential suspension or termination of their Civitai account.":
        "被认定反复尝试生成违规内容的用户可能面临额外后果，包括暂停或终止其 Civitai 账号。",
      "Transparency and Appeals": "透明度与申诉",
      "Decisions made by our moderation team concerning onsite image generation are subject to the same transparency and appeal processes as other content on Civitai.":
        "审核团队就站内图像生成作出的决定，与 Civitai 上其他内容一样适用相同的透明度与申诉流程。",
      "Users can request an explanation or appeal a moderation decision using our":
        "用户可以要求解释或通过我们的",
      "Appeal Form": "申诉表单",
      "For how these checks work when you generate, share, upload or train, see":
        "关于生成、分享、上传或训练时这些检查如何运作，请参阅",
      "How Civitai Keeps Generation and Sharing Safe": "Civitai 如何保障生成与分享安全",
      "User Control": "用户控制",
      "We prioritize user control and offer options to customize the content you see on our platform, including:":
        "我们优先考虑用户控制，提供多种自定义平台上所见内容的选项，包括：",
      "Tag-Based Filtering:": "基于标签的筛选：",
      "Users can hide specific content based on tags. For instance, if a user":
        "用户可以根据标签隐藏特定内容。例如，如果用户",
      "doesn't": "不",
      "want to view anime content, they can hide the anime tag.":
        "想看动漫内容，可以隐藏 anime 标签。",
      "Selective Hiding:": "选择性隐藏：",
      "Users can choose to hide specific images, models, or even all models created by a specific user.":
        "用户可以选择隐藏特定图片、模型，甚至某个用户创建的全部模型。",
      "Automated Content Labeling and Moderation": "自动内容标记与审核",
      "We facilitate this high degree of user control through a combination of checkpoints:":
        "我们通过多重关卡实现这种高度的用户控制：",
      "Automated Content Labeling": "自动内容标记",
      ": We use a number of automated image tagging systems to automatically apply content labels and screen images for moderated content.":
        "：我们使用多种自动图像标记系统，自动为图像添加内容标签并筛出受审核内容。",
      "Community-Driven Moderation": "社区驱动的审核",
      ": Users can vote on the content labels applied to images, helping us refine our image classification system. We encourage users to report content violations and reward their efforts through a":
        "：用户可以对图像的内容标签投票，帮助我们改进图像分类系统。我们鼓励用户举报违规内容，并通过",
      "Guardian's": "守护者",
      "leaderboard that highlights the most helpful community members.":
        "排行榜奖励他们的付出，表彰最有帮助的社区成员。",
      "Manual Reviews": "人工审核",
      ": Certain combinations of tags or resources trigger a manual review before the content becomes publicly visible.":
        "：某些标签或资源组合会在内容公开可见前触发人工审核。",
      "Community Participation": "社区参与",
      "others'": "他人的",
      "models where possible, and promptly reporting any content that violates our policies.":
        "模型，并及时举报任何违反我们政策的内容。",
      "Policy Feedback and Suggestions": "政策反馈与建议",
      "Appeals Process": "申诉流程",
      "If you believe your content has been removed unfairly, you can submit an appeal for further review through our":
        "如果你认为你的内容被不公正地移除，可以通过我们的",
      "Reporting Violations": "举报违规",
      "If you find content that": "如果你发现内容",
      "adhere to our guidelines, especially concerning minors, please":
        "违反我们的准则，尤其涉及未成年人时，请",
      "don't": "不要",
      "hesitate to report it. A": "犹豫，立即举报。",
      "\"Report\"": "「举报」",
      "button is available on most images and models throughout the site.":
        "按钮在站内大多数图片和模型上都有。",
      "If you need additional help, you can always reach out to our moderators on our Discord server. Your vigilance helps us maintain a safe and respectful community.":
        "如需更多帮助，可随时在 Discord 服务器联系我们的审核员。你的警惕有助于我们维护安全、互相尊重的社区。",
      "Together we can better navigate the development of new AI content while upholding the openness and inclusivity of this platform and community.":
        "携手并进，我们能在推动新 AI 内容发展的同时，维护这个平台与社区的开放与包容。",
      // 长段落（引擎允许精确词条不限长）
      "At Civitai, we recognize the transformative power of artificial intelligence and are committed to harnessing this potential responsibly. As part of this commitment, we have established clear guidelines to safeguard minors, respect real individuals, and prevent the generation of harmful or illegal content.":
        "在 Civitai，我们认识到人工智能的变革力量，并致力于负责任地发挥这一潜力。为此，我们制定了明确的准则，以保护未成年人、尊重真实个人，并防止生成有害或非法内容。",
      "Our platform is dedicated to fostering creativity and innovation while upholding standards of safety and respect. We understand the importance of balancing the freedom to create with the need to protect vulnerable groups and individuals. Therefore, we have stringent policies against the creation of photorealistic images of minors, depictions of extreme or illegal conduct, and any content that may be deemed disturbing or offensive. We also prohibit the use of our resources to generate the likeness of real-world individuals.":
        "我们的平台致力于在坚持安全与尊重标准的同时促进创意与创新。我们理解在创作自由与保护弱势群体和个人之间取得平衡的重要性。因此，我们对制作未成年人照片级写实图像、描绘极端或违法行为，以及任何可能被视为令人不适或冒犯的内容制定了严格政策。我们也禁止使用我们的资源生成现实人物的肖像。",
      "At Civitai, we utilize AI systems along with the power of community to maintain a safe and inclusive environment. We encourage you to be an active participant in upholding our standards by accurately tagging content, reporting violations, and providing feedback. Your involvement is crucial in shaping a safe AI community. Together, we can navigate the exciting world of AI, ensuring that Civitai remains a platform for innovation, creativity, and respect.":
        "在 Civitai，我们借助 AI 系统与社区的力量共同维护安全、包容的环境。我们鼓励你积极参与维护标准：准确标记内容、举报违规并提供反馈。你的参与对塑造安全的 AI 社区至关重要。携手并进，我们能在令人兴奋的 AI 世界中前行，让 Civitai 始终是创新、创意与尊重的平台。",
      "Civitai is committed to creating a safe, inclusive, and respectful environment for everyone. We are dedicated to harnessing the potential of AI responsibly, prioritizing the safety and wellbeing of minors and identifiable individuals.":
        "Civitai 致力于为所有人营造安全、包容、互相尊重的环境。我们专注负责任地发挥 AI 的潜力，优先保障未成年人及可识别个人的安全与福祉。",
      "As our community grows, we're committed to creating a safe, inclusive, and respectful environment for everyone. We are dedicated to harnessing the potential of AI responsibly, prioritizing the safety and wellbeing of minors. In line with this, we've refined our guidelines for content depicting minors.":
        "随着社区壮大，我们致力于为所有人营造安全、包容、互相尊重的环境。我们专注负责任地发挥 AI 的潜力，优先保障未成年人的安全与福祉。为此，我们完善了涉及未成年人内容的准则。",
      "Remember, these guidelines are here to ensure our community remains a safe, respectful, and constructive space for all. With your cooperation and input, we can make this community a shining example of responsible and creative use of AI.":
        "请记住，这些准则旨在确保我们的社区始终是安全、尊重且建设性的空间。有了你的配合与意见，我们能让这个社区成为负责任且富有创意地使用 AI 的典范。",
      "Our moderation team actively monitors onsite image generation activities. Content that violates our rules, or attempts to circumvent our content restrictions, will result in appropriate actions, which may include content removal, flagging of the account, suspension of access to the image generation feature, or a ban from the platform.":
        "我们的审核团队会主动监控站内图像生成活动。违反规则或试图绕过内容限制的内容将导致相应处理，包括删除内容、标记账号、暂停图像生成功能访问权限，或封禁平台账号。",
      "Users are encouraged to report any inappropriate image generation attempts or results they come across. Reports can be submitted through our standard reporting mechanism, and should include relevant information to assist in the investigation.":
        "我们鼓励用户举报遇到的任何不当图像生成尝试或结果。可通过我们的标准举报机制提交，并附上有助于调查的相关信息。",
      "As a platform, our goal is to foster an environment of openness and inclusivity while empowering users with tools to see content that is the most interesting and relevant to them. We do this through a combination of user controls, automated content labeling, and content moderation.":
        "作为平台，我们的目标是营造开放包容的环境，同时为用户提供工具，让他们看到最有趣、最相关的内容。我们通过用户控制、自动内容标记与内容审核相结合来实现这一点。",
      "We value your input. After all, this community is like a potluck – everyone brings something to the table. If you have suggestions for improving the guidelines or have spotted something we might have missed, please let us know by submitting feedback or reaching out to us on Discord.":
        "我们重视你的意见。毕竟这个社区就像百乐餐——每个人都带来点什么。如果你有改进准则的建议，或发现我们可能遗漏的地方，请提交反馈或在 Discord 联系我们。",
      "Remember, these guidelines are here to make sure that Civitai remains an innovative, respectful, and constructive community. With your cooperation and input, we can continue to make this community a shining example of how AI can be harnessed responsibly and creatively.":
        "请记住，这些准则旨在确保 Civitai 始终是创新、尊重且建设性的社区。有了你的配合与意见，我们能继续让这个社区成为负责任且富有创意地运用 AI 的典范。",
    },

    // ---- 创作者计划（含折叠栏正文）----
    "creator-program": {
      "Earn on Civitai": "在 Civitai 赚取收益",
      "Your models, LoRAs, and images power Civitai. Here's every way to earn from your work - and how the Creator Program lets you turn the Buzz you earn into real payouts.":
        "你的模型、LoRA 和图片驱动着 Civitai。以下是你靠作品赚取收益的所有方式，以及创作者计划如何把赚到的 Buzz 变成真实收入。",
      "How is my Banking Cap calculated?": "我的存入上限如何计算？",
      "Why doesn't this month's earning count toward my Cap?":
        "为什么本月收益不计入我的上限？",
      "Why does the Cap look at the last 12 months?": "为什么上限参考最近 12 个月？",
      "You make Civitai": "你在成就 Civitai",
      "Every model, LoRA, and image posted here is what brings people to Civitai and keeps them generating. When your work drives that activity, you should share in what it creates — that's what earning on Civitai is all about, whether you're building models or filling the feeds with great generations.":
        "这里发布的每一个模型、LoRA 和图片，都是吸引人们来到 Civitai 并持续生成的原因。当你的作品推动这些活动时，你理应分享它所创造的收益——无论你是在制作模型，还是在信息流里贡献优秀作品，这就是在 Civitai 赚取收益的意义。",
      "How you earn": "如何赚取",
      "Every creator earns from their work — no membership required. These are open to everyone.":
        "每位创作者都能靠作品赚取收益——无需会员。以下对所有创作者开放。",
      "Generation compensation": "生成补偿",
      "Earn every time someone generates with your models.":
        "每当有人用你的模型生成，你都能获得收益。",
      "Generator tips": "生成器打赏",
      "Receive tips from the people generating with your work.":
        "接收使用你作品生成的人打赏。",
      "Image rewards": "图片奖励",
      "Earn Buzz when the community reacts to the images you post.":
        "社区对你发布的图片作出反应时获得 Buzz。",
      "Early access": "抢先体验",
      "Offer timed early access to your newest models.": "为你最新的模型提供限时抢先体验。",
      "Paid access": "付费访问",
      "Sell permanent access to your models.": "出售模型的永久访问权。",
      "Licensing fees": "许可费",
      "Set a per-generation fee on your models.": "为你的模型设置按次生成的费用。",
      "Creator Shops": "创作者商店",
      "Sell custom cosmetics, your models, and soon merch, right on your profile.":
        "直接在个人主页出售自定义装饰、你的模型，以及即将上线的周边。",
      "Manage it all in the Creator Studio": "在创作者工作室统一管理",
      "See your earnings and analytics, set licensing fees and paid access, and bulk-edit across your whole catalogue — all in one place. The Creator Studio is open to every creator.":
        "查看收益与分析、设置许可费和付费访问，并批量编辑整个作品目录——全部集中在一处。创作者工作室对所有创作者开放。",
      "Open Creator Studio": "打开创作者工作室",
      "The Civitai Creator Program": "Civitai 创作者计划",
      "Get paid for your work.": "让你的作品获得报酬。",
      "The Creator Program is how you earn more and unlock the ability to cash out. Bank the Buzz you earn to claim your share of our monthly Creator Compensation Pool, then get paid your share.":
        "创作者计划让你赚得更多并解锁提现能力。将赚到的 Buzz 存入银行，即可领取每月创作者补偿池中属于你的份额，然后获得报酬。",
      "Join the Creator Program": "加入创作者计划",
      "Charge more as you climb": "等级越高，定价越高",
      "Every creator can monetize their work — your membership tier decides how much you can charge. The higher your tier, the higher your caps.":
        "每位创作者都能变现——会员等级决定你的收费上限。等级越高，上限越高。",
      "Higher licensing fee caps.": "更高的许可费上限。",
      "Set a per-generation licensing fee on your models and raise your ceiling as you move up tiers — Bronze, Silver, then Gold each unlock a higher maximum fee.":
        "为模型设置按次生成的许可费，并随等级提升上限——青铜、白银、黄金会依次解锁更高的最高费用。",
      "Higher paid-access price caps.": "更高的付费访问价格上限。",
      "Charge for early or permanent access to your resources. Higher tiers let you set higher access prices, so top-tier members can price their most in-demand work accordingly.":
        "为资源的抢先体验或永久访问收费。更高等级允许设置更高的访问价格，让顶级会员能为最抢手的作品定价。",
      "Here is every tier's ceiling. Upgrading raises how much you can earn per resource.":
        "以下是各等级的上限。升级即可提高每个资源的收益上限。",
      "Compare membership tiers": "对比会员等级",
      "Model versions you can monetize each month": "每月可变现的模型版本数",
      "— a licensing fee or paid access": "——许可费或付费访问",
      Tier: "等级",
      "Monetized / month": "每月可变现",
      Free: "免费",
      Bronze: "青铜",
      Silver: "白银",
      Gold: "黄金",
      Unlimited: "无限",
      "A licensing fee or a permanent paid-access price each count once, per version, the first time you set one. Changing or removing a price you have already set costs nothing, and a timed early-access window never counts.":
        "许可费或永久付费访问价格，按每个版本首次设置时各计一次。修改或移除已设置的价格不产生费用，限时抢先体验窗口不计入。",
      "How much you charge is the same at every tier: up to":
        "各等级的收费上限相同：最高",
      "⚡ per generation as a licensing fee (": "⚡ 每次生成作为许可费（",
      "⚡ for video models), and any price you like for paid access.":
        "⚡ 用于视频模型），付费访问可任意定价。",
      "How cash-out works": "提现如何运作",
      "Generating a lot of Buzz? Bank it to claim your share of the pool.":
        "赚了很多 Buzz？存入银行即可领取补偿池中属于你的份额。",
      "Earn Buzz": "赚取 Buzz",
      "Bank your Buzz": "存入 Buzz",
      "Claim your Share": "领取你的份额",
      "The Basics": "基础说明",
      "If you meet the program requirements, join!": "符合计划要求就加入吧！",
      "Each month Civitai allocates a Creator Compensation Pool from a portion of our revenue based off of":
        "Civitai 每月会从收入中按一定比例划出创作者补偿池，依据是",
      "purchased.": "的购买量。",
      "During the Banking Phase, you Bank Buzz to secure your share of the Compensation Pool":
        "在存入阶段，存入 Buzz 以锁定你在补偿池中的份额",
      "During the Extraction Phase, you can choose to keep Buzz in the Bank to get paid or Extract it to save it for the future":
        "在提取阶段，你可以选择把 Buzz 留在银行领取报酬，或提取出来留待日后使用",
      "Get paid!": "获得报酬！",
      "How do I join?": "如何加入？",
      "Program requirements:": "计划要求：",
      "Have a Creator Score of at least 40,000": "创作者积分至少达到 40,000",
      "Your Creator Score grows when": "你的创作者积分会增长，当",
      "people use, react to, and follow your work": "人们使用、反应并关注你的作品时",
      ", and it updates once a day.": "，每天更新一次。",
      "See your journey": "查看你的历程",
      "Be a Civitai Green Member": "成为 Civitai Green 会员",
      "Become a Civitai Member Now!": "立即成为 Civitai 会员！",
      "Join Now!": "立即加入！",
      "Want to know more? Check out the full Guide!": "想了解更多？查看完整指南！",
      "Earning with the Creator Program": "通过创作者计划赚取收益",
      "Compensation Pool": "补偿池",
      "Current Banked Buzz": "当前已存入 Buzz",
      "How is this determined?": "这是如何确定的？",
      "Creator Banking Caps": "创作者存入上限",
      "Every creator in the program has a Cap to the amount of Buzz they can Bank in a month. Caps align with membership tiers as outlined below.":
        "计划中的每位创作者每月可存入的 Buzz 都有上限。上限按下方的会员等级划分。",
      Member: "会员",
      "125% of your Peak Earning Month with": "你的峰值收益月的 125%，搭配",
      "150% of your Peak Earning Month with": "你的峰值收益月的 150%，搭配",
      "no cap": "无上限",
      "How your Peak Earning Month is picked": "如何选取你的峰值收益月",
      "We take your best month of licensing fees and Buzz other people spent on your work, in the last":
        "我们取你最近",
      completed: "完整",
      "months. From": "个月中，许可费与他人为你的作品花费 Buzz 最高的月份。自",
      ", generation compensation no longer counts toward your peak, including for earlier months. Tips and rewards do not set your peak.":
        "起，生成补偿不再计入峰值，包括更早的月份。打赏和奖励不计入峰值。",
      "The month you are in does not count.": "当前月份不计入。",
      "Buzz earned today cannot raise today's Cap, so your Cap holds steady.":
        "今天赚到的 Buzz 无法提高今天的上限，因此上限保持稳定。",
      "The last": "最近",
      "completed months are what count.": "个完整月份才计入。",
      "The Cap follows what you earn now, keeping the Pool shared between active creators.":
        "上限跟随你当前的收益，让补偿池在活跃创作者之间共享。",
      "Ready to get paid for your work?": "准备好靠作品获得报酬了吗？",
      "Frequently asked questions": "常见问题",
      "Do I need a membership to earn on Civitai?":
        "在 Civitai 赚取收益需要会员吗？",
      "No. Generation compensation, tips, image rewards, early access, paid access, licensing fees, and Creator Shops are open to every creator, member or not. The Creator Program is how you earn more and unlock the ability to cash out your Buzz.":
        "不需要。生成补偿、打赏、图片奖励、抢先体验、付费访问、许可费和创作者商店对所有创作者开放，无论是否为会员。创作者计划则是让你赚得更多并解锁 Buzz 提现能力的方式。",
      "What's the difference between earning Buzz and the Creator Program?":
        "赚取 Buzz 和创作者计划有什么区别？",
      "You earn Buzz from your work automatically as people generate with, tip, and react to it. The Creator Program lets you bank that Buzz to claim a share of the monthly Creator Compensation Pool and get paid.":
        "当人们使用你的作品生成、打赏并作出反应时，你会自动赚取 Buzz。创作者计划让你把这些 Buzz 存入银行，以领取每月创作者补偿池的份额并获得报酬。",
      "Where do I manage my fees, paid access, and earnings?":
        "我在哪里管理费用、付费访问和收益？",
      "In the": "在",
      "Creator Studio": "创作者工作室",
      ". It shows your earnings and analytics and lets you set licensing fees and paid access across your models. It's open to every creator.":
        "中。它会显示你的收益与分析，并可跨模型设置许可费和付费访问。它对所有创作者开放。",
      "Is the Creator Program voluntary?": "创作者计划是自愿的吗？",
      "Yes! If you're eligible for the program, but don't want to participate, nobody's forcing you! Even if you do join the program, but don't want to contribute Buzz, that's fine – there's no requirement to Bank anything.":
        "是的！如果你符合计划资格但不想参与，没有人会强迫你！即使加入了计划，不想存入 Buzz 也没问题——没有任何存入要求。",
      "Can I bank both Yellow and Green Buzz?": "我可以同时存入黄色和绿色 Buzz 吗？",
      "Yes! There is a single unified Compensation Pool. You can bank either Yellow or Green Buzz (or both) into the same pool each month. Your earnings are based on your total banked Buzz across both types.":
        "可以！补偿池是统一的一个。你每月可以存入黄色或绿色 Buzz（或两者）。你的收益基于两种 Buzz 的存入总量。",
      "Would buying a higher Membership Tier (Silver or Gold) increase my earnings?":
        "购买更高会员等级（白银或黄金）会增加我的收益吗？",
      "Not your earnings, as such, but it does increase the maximum you can Bank each month.":
        "不会直接增加收益，但会提高你每月可存入的上限。",
      "Will I get my Banked Buzz back?": "存入的 Buzz 会退还吗？",
      "No, your Banked Buzz will be consumed each month, unless you choose to Extract it during the Extraction Phase!":
        "不会，存入的 Buzz 每月会被消耗，除非你在提取阶段选择提取！",
      "What types of Buzz can be Banked?": "哪些类型的 Buzz 可以存入？",
      "Do I need an active membership to Bank Buzz?": "存入 Buzz 需要有效会员吗？",
      "Yes, you must have an active Civitai membership to bank Buzz in the Creator Program. If your membership expires, you will not be able to bank additional Buzz until you renew your subscription.":
        "需要。你必须有有效的 Civitai 会员才能在创作者计划中存入 Buzz。会员到期后，在续订前无法继续存入。",
      "What happens if cancel my Civitai Membership?": "如果我取消 Civitai 会员会怎样？",
      "If you deactivate your Subscription you'll remain in the Program until the end of the month, allowing you to Bank your Buzz and withdraw through the end of the period.":
        "如果你停用订阅，你仍会保留在计划中直到月底，期间可以存入 Buzz 并提现。",
      "When, and how, do I sign up with your Payment Partner to withdraw my cash?":
        "何时以及如何注册支付合作伙伴来提现？",
      "When you have at least $50 in Ready to Withdraw status, you'll be invited to set up your account with our Payment Partner, via the email tied to your Civitai account, and a link on the Creator Program interface.":
        "当你有至少 $50 处于「可提现」状态时，我们会通过你 Civitai 账号绑定的邮箱以及创作者计划界面上的链接，邀请你注册支付合作伙伴账户。",
      "Must I withdraw my “Ready to Withdraw” funds each month?":
        "我必须每月提取「可提现」资金吗？",
      "No, funds can accumulate in your account until you're ready to pay out! There's no requirement to pay out each month.":
        "不必，资金可以在账户中累积，直到你准备提现！没有每月必须提现的要求。",
      "What happens if I decide I want my Banked Buzz back?":
        "如果我想要回已存入的 Buzz 会怎样？",
    },

    // ---- 用户主页 ----
    // ---- 帖子详情 ----
    posts: {
      "Posted to": "发布到",
      "No comments yet.": "暂无评论。",
      Reply: "回复",
    },

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
      // 主页
      "Sticker Book": "贴纸册",
      "Post an announcement to tell your followers what you're working on.":
        "发布公告，让关注者知道你在做什么。",
      "Open Creator Studio": "打开创作者工作室",
      "View all images": "查看全部图片",
      // 用户主页：模型 / 贴纸册 / 商店等标签页
      Published: "已发布",
      Draft: "草稿",
      Private: "私密",
      "Upload a Model": "上传模型",
      "Train a LoRA": "训练 LoRA",
      "'s Sticker Book": " 的贴纸册",
      "earned from stickers on": "来自贴纸的收益，贴于",
      your: "你的",
      "Images you stickered": "你贴过贴纸的图片",
      "You haven't had a sticker accepted on anyone else's image yet.":
        "你还没有在别人的图片上被采纳过贴纸。",
      "Your images that got stickered": "被你贴纸的图片",
      "Nobody has put a sticker on your work yet. Accepted placements show up here.":
        "还没有人在你的作品上贴贴纸。被采纳的贴纸会显示在这里。",
      "Nothing in your book yet. Buy a sticker in the": "你的册子还是空的。在",
      "and put one on an image, or turn stickers on for your own images from the gear above.":
        "购买贴纸并贴到图片上，或用上方的齿轮为自己的图片开启贴纸。",
      "'s Shop": " 的商店",
      "Add a shop description in Shop settings.": "在商店设置中添加商店描述。",
      "Manage Your Shop": "管理你的商店",
      "Your shop is in draft": "你的商店还是草稿",
      "It's hidden from visitors until you publish it.": "发布前对访客隐藏。",
      "Publish shop": "发布商店",
      "Your shop is empty": "你的商店是空的",
      "List cosmetics for your fans to collect and buy with Buzz. Submit your first item to open your shop.":
        "上架装饰品，让粉丝用 Buzz 收集和购买。提交第一件商品即可开店。",
      "Create your first item": "创建你的第一件商品",
      "Clear History": "清除历史记录",
      Model: "模型",

      // ---- 设置：内容与浏览 ----
      "Mature content": "成人内容",
      "The eye button in the header overrides this for one session. These are the defaults it returns to.":
        "顶栏的眼睛按钮可临时覆盖此设置（仅本次会话）。这里设置的是它会恢复的默认值。",
      "Show mature content": "显示成人内容",
      "Confirms you are over 18.": "确认你已年满 18 岁。",
      "Blur mature content": "模糊成人内容",
      "Browsing level": "浏览级别",
      "Everything at or below your highest pick is shown.":
        "显示你所选最高级别及以下的所有内容。",
      "Safe for work. No naughty stuff": "适合工作场合。无露骨内容",
      "Revealing clothing, small bulges, subtle nipple outline, posing/sexualized bare chested men, light gore, violence":
        "暴露衣着、轻微凸起、隐约乳首轮廓、摆姿势/性化的裸上身男性、轻度血腥、暴力",
      "Adult themes and situations, partial nudity, bikinis, big bulges, sexual situations, graphic violence":
        "成人题材与情境、部分裸露、比基尼、明显凸起、性相关情境、血腥暴力",
      "Graphic nudity, genitalia, adult objects, or settings":
        "露骨裸露、生殖器、成人道具或场景",
      "Sexual Acts, masturbation, ejaculation, cum, vore, anal gape, extremely disturbing content":
        "性行为、自慰、射精、精液、吞食、肛门扩张、极度令人不适的内容",
      "Search tags to hide": "搜索要隐藏的标签",
      "Search users to hide": "搜索要隐藏的用户",
      "Recently Added": "最近添加",
      Topics: "主题",
      "Selected topics appear less often while browsing.":
        "选中的主题在浏览时会较少出现。",
      "Hide anime": "隐藏动漫",
      "Hide furry": "隐藏兽人",
      "Hide gore": "隐藏血腥",
      "Hide political": "隐藏政治",
      "Hidden tags": "隐藏的标签",
      "Content with these tags is hidden from you.": "带有这些标签的内容对你隐藏。",
      political: "政治",
      anthro: "兽人",
      furry: "兽人",
      "Hidden users": "隐藏的用户",
      "Unhide all": "全部取消隐藏",
      "Their models, images and comments are hidden from you.":
        "他们的模型、图片和评论对你隐藏。",
      "Hidden models": "隐藏的模型",
      "Hidden models are left out of search, feeds and model pages.":
        "隐藏的模型不会出现在搜索、信息流和模型页面中。",
      hidden: "隐藏",

      // ---- 设置：创作者 ----
      "Creator Showcase": "创作者展示",
      "Hide me from the Creator Showcase": "在创作者展示中隐藏我",
      "Leaves you out of Mythic, the Hall of Fame and New Supernovas. Your badges still show on your profile.":
        "你将不会出现在神话、名人堂和新星中。你的徽章仍会显示在主页上。",
      "Metric visibility": "指标可见性",
      "You and moderators still see your real stats on model pages and cards. On search results you see the hidden state, same as the public.":
        "你和管理员在模型页面和卡片上仍能看到真实数据。在搜索结果中，你看到的是隐藏状态，与公众一致。",
      "The default for all your models. Creator Program members only; reverts if your membership lapses.":
        "你所有模型的默认设置。仅限创作者计划成员；会员失效后会恢复原状。",
      "Creator Program members only": "仅限创作者计划成员",
      "Gain more control over how your models are presented, plus the rest of the Creator Program:":
        "更好地控制模型的展示方式，并享受创作者计划的其余权益：",
      "Hide your model metrics and donation goals": "隐藏模型指标和捐赠目标",
      "Earn real cash from your creations": "从你的作品赚取真实收入",
      "Join the Creator Program": "加入创作者计划",
      "Hide tipped / earned Buzz": "隐藏打赏/赚取的 Buzz",
      "Others won't see Buzz earned on your models, unless a model or version overrides it.":
        "其他人看不到你模型上赚取的 Buzz，除非某个模型或版本覆盖此设置。",
      "Hide download count": "隐藏下载数",
      "Others won't see your download counts, unless a model or version overrides it.":
        "其他人看不到你的下载数，除非某个模型或版本覆盖此设置。",
      "Hide generation count": "隐藏生成数",
      "Others won't see your generation counts, unless a model or version overrides it.":
        "其他人看不到你的生成数，除非某个模型或版本覆盖此设置。",
      "Hide my donation goals from public view": "对公众隐藏我的捐赠目标",
      "Others won't see the progress or amount. The goal still works.":
        "其他人看不到进度或金额。目标仍然有效。",
      "Stickers on your images": "你图片上的贴纸",
      "Let other people pay to place a sticker on your work. You keep most of what they pay, and you can decline anything you don't want. Individual posts and images can override this.":
        "允许他人付费在你的作品上放置贴纸。你保留他们支付的大部分费用，也可以拒绝任何你不想要的内容。单个帖子和图片可以覆盖此设置。",
      "No stickers": "不允许贴纸",
      "Review each one": "逐个审核",
      "Accept all": "全部接受",
      "Allow stickers on": "允许贴纸用于",
      "Price per placement": "每次放置价格",
      "Your cap is": "你的上限为",
      "Buzz, set by your creator score and membership tier. We store the price you choose, so if the cap rises later your price takes effect on its own.":
        "Buzz，由创作者积分和会员等级决定。我们保存你选择的价格，因此若上限之后提高，你的价格会自动生效。",
      "Use the platform default": "使用平台默认值",
      "Placers pay 100 Buzz": "放置者支付 100 Buzz",
      "Largest sticker allowed": "允许的最大贴纸",
      "As a share of the image's width, so it scales with however large the image is drawn. Placements already on your work keep the size they were accepted at.":
        "以图片宽度的占比计算，因此会随图片显示尺寸缩放。已放置在你作品上的贴纸保持其被接受时的尺寸。",
      "of the size of the image": "图片尺寸的",
      Free: "免费",
      stickers: "贴纸",
      "you'll accept": "你将接受",
      ", set by your creator score and membership tier. Paid placements never use these up.":
        "，由创作者积分和会员等级决定。付费放置从不占用这些额度。",
      "per image": "每张图片",
      "Review pending stickers": "审核待处理的贴纸",
      "Stickers you've placed": "你已放置的贴纸",
      "Your sticker inventory": "你的贴纸库存",
      "Browse and manage your stickers in the Stickerbook.":
        "在贴纸册中浏览和管理你的贴纸。",
      "Remix galleries on your images": "你图片上的重混画廊",
      "No remix gallery": "无重混画廊",
      "Price per submission": "每次提交价格",
      "Submitters pay 100 Buzz": "提交者支付 100 Buzz",
      "What people may submit": "人们可以提交什么",
      "Free submissions you'll accept": "你会接受的免费提交",
      "Free stickers you'll accept": "你会接受的免费贴纸",
      "People get one free placement a day across the whole site, and these are the slots they can spend it on. A slot is held while one waits for you, and comes back if you decline it or let it expire. Your maximum is":
        "每人每天在全站有一个免费放置名额，这些名额就是你可以把它花在上面的格子。当有人等待你时，该名额会被占用；若你拒绝或让它过期，名额会退回。你的上限是",
      "Either way you review every submission before it appears. This only decides what can be offered to you in the first place.":
        "无论哪种方式，每个提交在出现前都会经过你审核。这只决定一开始可以向您提供什么。",
      "At or below my image's rating": "等于或低于我图片的分级",
      "Any rating": "任何分级",
      submissions: "提交",
      "Submitted to you": "提交给你的",
      "You've submitted": "你已提交",
      "Hat Turf on my images": "我图片上的帽子地盘",
      "Let people play Hat Turf on my images": "允许人们在我的图片上玩帽子地盘",
      "Off hides team hats on your images and they stop counting. They're back if you turn it on.":
        "关闭后你图片上的队伍帽子会隐藏且不再计分。开启后会恢复。",

      // ---- 设置：会员与账单 ----
      "No active membership": "无有效会员",
      "You're on the free plan. A membership adds:":
        "你当前是免费方案。会员可额外获得：",
      "A monthly Buzz allowance": "每月 Buzz 额度",
      "Ad-free browsing": "无广告浏览",
      "Exclusive Discord channels and early access": "专属 Discord 频道和抢先体验",
      "See membership plans": "查看会员方案",
      Payouts: "提现",
      "Where your earnings and withdrawals land.": "你的收益和提现去向。",
      "Set up payouts once you join the Creator Program:":
        "加入创作者计划后即可设置提现：",
      "Withdraw your earnings to your bank": "将收益提现到你的银行",

      // ---- 设置：安全与应用 ----
      "Sign-in methods": "登录方式",
      "Sign in with any account you connect.": "使用你连接的任何账户登录。",
      Connect: "连接",
      "API keys": "API 密钥",
      "Add API key": "添加 API 密钥",
      "Programmatic access to your account. Treat them like passwords.":
        "对你的账户的程序化访问权限。请像对待密码一样对待它们。",
      "Full Access": "完全访问",
      "Can generate": "可生成",
      "No limit": "无限制",
      "OAuth applications": "OAuth 应用",
      "Register App": "注册应用",
      "Let third-party apps call the API on a user's behalf.":
        "允许第三方应用代表用户调用 API。",
      "No OAuth applications registered yet": "尚未注册 OAuth 应用",
      "Register your first OAuth application to enable third-party integrations.":
        "注册你的第一个 OAuth 应用以启用第三方集成。",
    },

    // ---- 创作者工作室（creator-studio.civitai.com）----
    "creator-studio": {
      Dashboard: "仪表盘",
      Monetization: "变现",
      Sales: "销售",
      Earnings: "收益",
      Analytics: "分析",
      "Base models": "基础模型",
      Engagement: "互动",
      Audience: "受众",
      Storage: "存储",
      Calendar: "日历",
      Settings: "设置",
      "Public files, all types": "公开文件，所有类型",
      "Not Found": "未找到页面",
      "Back to dashboard": "返回仪表盘",
      // 设置页
      "Your membership, payouts, and fee defaults.": "你的会员、提现与费用默认设置。",
      "Not a member": "非会员",
      "You don't have an active Civitai membership.": "你没有有效的 Civitai 会员。",
      "Get a membership": "获取会员",
      Payouts: "提现",
      Locked: "已锁定",
      "Payout setup unlocks once you have": "提现设置需先拥有",
      "$50 in settled cash": "50 美元已结算现金",
      "ready to withdraw - so there's nothing to set up yet.":
        "可提现——所以目前还无需设置。",
      "Fee defaults": "费用默认值",
      "Licensing fees stay off until you set one. We suggest a fee by model type - Checkpoints":
        "许可费在你设置前保持关闭。我们按模型类型给出建议费用——Checkpoint",
      "⚡ / generation, LoRAs": "⚡ / 次生成，LoRA",
      "⚡ / 10 generations - which you can apply or override per version on":
        "⚡ / 10 次生成——你可以在每个版本上应用或覆盖",
      "Join Creator Program": "加入创作者计划",
      "Toggle Sidebar": "切换侧边栏",
      "Become a member": "成为会员",
      "Your activity - last 30 days": "你的活动 - 最近 30 天",
      "View analytics →": "查看分析 →",
      Reactions: "反应",
      "New followers": "新关注者",
      "Images posted": "已发布图片",
      "Posts published": "已发布帖子",
      "Profile views": "主页浏览量",
      "Yellow Buzz": "黄色 Buzz",
      "Green Buzz": "绿色 Buzz",
      "Blue Buzz": "蓝色 Buzz",
      Withdrawable: "可提现",
      "View earnings →": "查看收益 →",
      "Buzz earned": "已赚 Buzz",
      "Last 30 days": "最近 30 天",
      "Top-earning model": "收益最高的模型",
      "No model earnings yet": "暂无模型收益",
      "View storage →": "查看存储 →",
      "Counting your images and videos": "正在统计你的图片和视频",
      "Set licensing fees, manage access, run sales.":
        "设置许可费、管理访问权限、开展促销。",
      "Your earnings broken down by source.": "按来源细分的收益。",
      "Usage that drives your fees.": "影响你费用的使用情况。",
      "Payout status, membership, defaults.": "提现状态、会员、默认设置。",

      // ---- 创作者工作室：变现 / 销售 ----
      "Set licensing fees, manage early/paid access, and sell access indefinitely - per version.":
        "按版本设置许可费、管理抢先/付费访问，并可无限期出售访问权。",
      "Fees and paid access are open to everyone. A membership raises how many new prices you can set each month.":
        "设置费用和付费访问对所有人开放。会员可提高每月可设置的新价格数量。",
      "See tiers": "查看会员等级",
      "Not unlocked yet - grows with your creator score":
        "尚未解锁 - 会随你的创作者积分增长",
      "Monetization limits · free": "变现额度 · 免费",
      "What used your pricing slots": "已占用你定价名额的内容",
      "Per page": "每页",
      "You have no models yet.": "你还没有模型。",
      "Upload one on civitai.com": "在 civitai.com 上传一个",
      "to get started.": "即可开始。",
      "Temporary discounts across your paid versions. Start one by selecting the versions you want to discount.":
        "为你的付费版本提供限时折扣。选中要打折的版本即可开始。",
      "New sale": "新建促销",
      "Scheduling a sale needs a creator score of 10,000":
        "安排促销需要 10,000 创作者积分",
      "Score comes from followers, model usage and engagement, so it climbs as people use what you publish.":
        "积分来自关注者、模型使用和互动，因此会随着人们使用你发布的内容而增长。",
      "You're at": "你当前为",

      // ---- 创作者工作室：收益 / 分析 ----
      "What you earned and where it came from - shown in the currency received, without conversion.":
        "你赚了什么、来自哪里 - 以收到的货币显示，不做换算。",
      "These totals are creator-level.": "这些是创作者级别的总计。",
      "For earnings broken down by individual model, see":
        "要查看按单个模型拆分的收益，请参阅",
      "Model analytics": "模型分析",
      "to start earning.": "开始赚取收益。",
      "to turn buzz into cash.": "将 Buzz 兑换为现金。",
      "Your content and model performance.": "你的内容与模型表现。",
      "Image views": "图片浏览量",
      "Model views": "模型浏览量",
      "Article views": "文章浏览量",
      "All-time:": "历史总计：",
      "reactions across your content ·": "你的内容获得的反应 ·",
      "comments on your images": "你图片上的评论",
      "Image views over time": "图片浏览量趋势",
      "· counted through yesterday": "· 统计截至昨日",
      "Reactions received over time": "收到的反应趋势",
      Line: "折线",
      Bar: "柱状",
      "Per-version performance": "各版本表现",
      "Nothing to review": "暂无需要查看的内容",
      "- none of your published models have downvotes or comments.":
        "- 你已发布的模型没有点踩或评论。",
      "All-time reactions (all your content)": "历史反应（你的全部内容）",
      "All-time comments (your images only)": "历史评论（仅你的图片）",
      "New followers over time": "新关注者趋势",
      // 侧栏/顶栏徽标
      studio: "工作室",
      member: "会员",
      "Requires a membership": "需要会员",
      "Search models…": "搜索模型…",
      vs: "对比",
      "your models": "你的模型",
      "Join the Creator Program": "加入创作者计划",
    },

    // ---- 创作者历程（/creators/journey）----
    "creator-journey": {
      "Your Creator Journey": "你的创作者历程",
      "Where your Creator Score stands, what it unlocks next, and the badges you have earned. Only you can see this page.":
        "查看你的创作者积分现状、接下来能解锁什么，以及你已获得的徽章。此页面仅你可见。",
      "See the Creator Showcase": "查看创作者展示",
      "Your Creator Score": "你的创作者积分",
      "Next:": "下一级：",
      "to go.": "分",
      "tier badges": "等级徽章",
      "The Ladder": "等级阶梯",
      Spark: "星火",
      Kindle: "引燃",
      Flame: "烈焰",
      Blaze: "炽焰",
      Beacon: "信标",
      Nova: "新星",
      Star: "星耀",
      Supernova: "超新星",
      Legend: "传奇",
      Mythic: "神话",
      "Judge crucibles": "担任擂台评委",
      "Post up to 60 times a day (120 as a member)":
        "每天最多发布 60 次（会员 120 次）",
      "Post up to 150 times a day (300 as a member)":
        "每天最多发布 150 次（会员 300 次）",
      "Higher comment limits": "更高的评论上限",
      "Higher reaction limits": "更高的反应上限",
      "Publish up to 5 articles a day": "每天最多发布 5 篇文章",
      "Publish up to 10 articles a day": "每天最多发布 10 篇文章",
      "Publish up to 20 articles a day": "每天最多发布 20 篇文章",
      "Charge for access to your model versions": "为模型版本设置付费访问",
      "Run sales on your model versions": "为模型版本开展促销",
      "Early access for up to 3 days": "抢先体验最长 3 天",
      "Early access for up to 5 days": "抢先体验最长 5 天",
      "Early access for up to 7 days": "抢先体验最长 7 天",
      "Early access for up to 9 days": "抢先体验最长 9 天",
      "Early access for up to 12 days": "抢先体验最长 12 天",
      "Early access for up to 15 days": "抢先体验最长 15 天",
      "One version in early access at a time": "同一时间仅 1 个版本可抢先体验",
      "2 versions in early access at once": "同一时间最多 2 个版本可抢先体验",
      "4 versions in early access at once": "同一时间最多 4 个版本可抢先体验",
      "6 versions in early access at once": "同一时间最多 6 个版本可抢先体验",
      "8 versions in early access at once": "同一时间最多 8 个版本可抢先体验",
      "20 versions in early access at once": "同一时间最多 20 个版本可抢先体验",
      "Post creator announcements": "发布创作者公告",
      "Higher price cap on stickers, remix galleries, gallery promotions, and model promotions":
        "提高贴纸、重混画廊、画廊推广和模型推广的价格上限",
      "More free placements on stickers, remix galleries, gallery promotions, and model promotions":
        "贴纸、重混画廊、画廊推广和模型推广获得更多免费名额",
      "Join the": "加入",
      "Supernova badge": "超新星徽章",
      "A Supernova name plate on your username": "用户名上的超新星铭牌",
      "Eligible for New Supernovas on the": "有资格登上创作者展示的",
      ", the month you cross": "，当你跨越的那个月",
      "A Supernova role on our Discord": "我们 Discord 上的超新星身份",
      "How to claim": "如何领取",
      "Animated Legend badge": "动态传奇徽章",
      "An animated Legend name plate on your username": "用户名上的动态传奇铭牌",
      "\"Legend since\" and the month you crossed": "主页上的「传奇始于」及跨越月份",
      "on your profile": "显示在你的主页上",
      ", or \"Founding Legend\" if you were already there at launch":
        "，若上线时你已在此等级则为「创始传奇」",
      "A place in the": "在以下位置获得一席之地：",
      "Hall of Fame": "名人堂",
      "A Legend role and the #legends channel on our Discord":
        "我们 Discord 上的传奇身份和 #legends 频道",
      "Mythic badge": "神话徽章",
      "A Mythic glow on your creator card, everywhere it appears":
        "你的创作者卡片在所有出现处都会带有神话光效",
      "A place in the Mythic section of the": "在以下页面的神话分区获得一席之地：",
      "A Mythic role on our Discord": "我们 Discord 上的神话身份",
      "Where Your Score Comes From": "积分来源",
      Reports: "举报",
      "Removed content": "已移除内容",
      pts: "分",
      "How Creator Score is earned": "创作者积分如何获得",
      Followers: "关注者",
      Achievements: "成就",
      "Closest next": "最接近的下一个",
      reactions: "反应",
      "more for": "还需",
      "100 Reactions": "100 个反应",
      "0 published": "已发布 0",
      "First Model": "第一个模型",
      "First Article": "第一篇文章",
      "5 Articles": "5 篇文章",
      "25 Articles": "25 篇文章",
      "50 Articles": "50 篇文章",
      "100 Articles": "100 篇文章",
      Reach: "触达",
      Downloads: "下载",
      "0 total": "总计 0",
      "1k Downloads": "1k 次下载",
      "10k Downloads": "10k 次下载",
      "100k Downloads": "100k 次下载",
      "100 Followers": "100 个关注者",
      "500 Followers": "500 个关注者",
      "1k Followers": "1k 个关注者",
      "5k Followers": "5k 个关注者",
      "10k Followers": "10k 个关注者",
      Reactions: "反应",
      "1k Reactions": "1k 个反应",
      "10k Reactions": "10k 个反应",
      "100k Reactions": "100k 个反应",
      "1M Reactions": "1M 个反应",
      Earn: "赚取",
      Sales: "销售",
      "0 Buzz": "0 Buzz",
      "100k Sales": "100k 销售",
      "250k Sales": "250k 销售",
      "500k Sales": "500k 销售",
      "1M Sales": "1M 销售",
      "2M Sales": "2M 销售",
      Community: "社区",
      "Crucible votes": "擂台投票",
      "0 cast": "已投 0",
      "500 Judged": "已评审 500",
      "1k Judged": "已评审 1k",
      "5k Judged": "已评审 5k",
      "10k Judged": "已评审 10k",
      "25k Judged": "已评审 25k",
      Compete: "竞赛",
      Wins: "获胜",
      "First Win": "首次获胜",
      "5 Wins": "5 次获胜",
      "10 Wins": "10 次获胜",
      "25 Wins": "25 次获胜",
      "100 Wins": "100 次获胜",
      "Special Achievements": "特殊成就",
      found: "已获得",
      "Someone else won with your work.": "别人用你的作品获胜了。",
      "You saw it before everyone else.": "你比别人更早发现了它。",
      "One of your models found its audience late.": "你的某个模型后来才找到受众。",
      "Every step of the podium.": "包揽领奖台每一步。",
      "Lots of ratings, almost no complaints.": "评分很多，几乎无人差评。",
      "Good at more than one thing.": "不只擅长一件事。",
      "Top of the board.": "榜首。",
      "Badges Earned": "已获得的徽章",
      "No badges yet.": "暂无徽章。",
      "Your first arrives at Spark, a Creator Score of 500.":
        "你的第一枚徽章将在星火（500 创作者积分）时获得。",
      "Badges you earn are yours to keep.": "获得的徽章永久保留。",
      "Creator Showcase": "创作者展示",
      "Progress to the next rung": "距离下一级的进度",
      "Next rung": "下一级",
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
    [/^yesterday$/i, "昨天"],
    [/^today$/i, "今天"],
    [/^just now$/i, "刚刚"],
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
    // 注册时间：Member since Apr 19, 2024 / Member since April 19, 2024
    [
      new RegExp(`^Member since\\s+(${MONTH_RE}|${FULL_MONTH_RE})\\s+(\\d{1,2}),\\s+(\\d{4})$`),
      (m, mon, day, year) => `${year}年${(MONTHS[mon] || FULL_MONTHS[mon])}${day}日加入`,
    ],
    // 保险库容量：100 GB of model storage
    [/^(\d+)\s*GB of model storage$/i, "$1 GB 模型存储空间"],
    // 完整月份 + 年份：November 2026 / November 2023.
    [
      new RegExp(`^(${FULL_MONTH_RE})\\s+(\\d{4})(\\.?)$`),
      (match, mon, year, dot) => `${year}年${FULL_MONTHS[mon]}${dot ? "。" : ""}`,
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
    // 缩写日期 + 大写时间（挑战详情）：Nov 06, 2026 08:00 AM
    [
      new RegExp(`^(${MONTH_RE})\\s+(\\d{1,2}),\\s+(\\d{4})\\s+(\\d{1,2}):(\\d{2})\\s*(AM|PM)$`, "i"),
      (m, mon, day, year, h, min, ap) => {
        const raw = Number(h) % 12;
        const hour = ap.toUpperCase() === "PM" ? raw + 12 : raw;
        const monKey = mon.charAt(0).toUpperCase() + mon.slice(1).toLowerCase();
        return `${year}年${MONTHS[monKey]}${day}日 ${hour}:${min}`;
      },
    ],
    // 更新日志周报：Weekly Update: October 24 to October 30, 2026
    [
      new RegExp(
        `^Weekly Update:\\s+(${FULL_MONTH_RE})\\s+(\\d{1,2})\\s+to\\s+(${FULL_MONTH_RE})\\s+(\\d{1,2}),\\s+(\\d{4})$`
      ),
      (m, m1, d1, m2, d2, y) =>
        `每周更新：${y}年${FULL_MONTHS[m1]}${d1}日 至 ${FULL_MONTHS[m2]}${d2}日`,
    ],
    // 更新日志标题：Civitai Changelog: October 24 to October 30, 2026
    [
      new RegExp(
        `^Civitai Changelog:\\s+(${FULL_MONTH_RE})\\s+(\\d{1,2})\\s+to\\s+(${FULL_MONTH_RE})\\s+(\\d{1,2}),\\s+(\\d{4})$`
      ),
      (m, m1, d1, m2, d2, y) =>
        `Civitai 更新日志：${y}年${FULL_MONTHS[m1]}${d1}日 至 ${FULL_MONTHS[m2]}${d2}日`,
    ],
    // 剩余时间：1 hour / 2 days
    [
      /^(\d+)\s+(second|minute|hour|day|week|month|year)s?$/,
      (m, n, unit) =>
        `${n} ${({ second: "秒", minute: "分钟", hour: "小时", day: "天", week: "周", month: "个月", year: "年" })[unit]}`,
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
    // 拍卖分类：Featured Resources - Anima
    [/^Featured Resources\s*-\s*(.+)$/, "精选资源 - $1"],
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
    // 擂台战绩：0 of 0 won
    [/^(\d+)\s+of\s+(\d+)\s+won$/i, "$1 / $2 获胜"],
    // 欢迎回来：Welcome back, cyberlangke! / Welcome back, cyberlangke.
    [/^Welcome back,\s+(.+?)[!.]$/, "欢迎回来，$1！"],
    // 用户名被单独包成 <span> 时的前半句
    [/^Welcome back,?\s*$/, "欢迎回来，"],
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
    // ---- 创作者工作室 ----
    // 简写月份 + 年份：Nov 2026
    [
      new RegExp(`^(${MONTH_RE})\\s+(\\d{4})$`),
      (m, mon, year) => `${year}年${MONTHS[mon]}`,
    ],
    // 变现进度：Creator score 20 of 10,000 to monetize
    [
      /^Creator score\s+([\d,]+)\s+of\s+([\d,]+)\s+to monetize$/,
      "创作者积分 $1 / $2 可开启变现",
    ],
    // 销售额度说明：You're at 20. Score comes from followers, model usage and engagement, so it climbs as people use what you publish.
    [
      /^You're at\s+([\d,]+)\.\s*Score comes from .+$/,
      "你当前为 $1。积分来自关注者、模型使用与互动，会随着人们使用你发布的内容而增长。",
    ],
    // 促销剩余：3 sale-days left
    [/^(\d+)\s+sale-days? left$/, "剩余 $1 个促销日"],
    // 无收益提示：No buzz earnings for Nov 1, 2026 - Nov 6, 2026. Set access prices on
    [
      /^No buzz earnings for\s+(.+?)\.\s*Set access prices on$/,
      "在 $1 期间没有 Buzz 收益。请在以下位置设置访问价格",
    ],
    // 统计区间：Totals for Nov 1, 2026 - Nov 6, 2026
    [/^Totals for\s+(.+?)\s+-\s+(.+)$/, "$1 至 $2 总计"],
    // 受众区间：for Nov 1, 2026 - Nov 6, 2026
    [/^for\s+(\w{3}\s+\d{1,2},\s+\d{4})\s+-\s+(\w{3}\s+\d{1,2},\s+\d{4})$/, "$1 至 $2"],
    // 无版本活动：- no version activity for Nov 1, 2026 - Nov 6, 2026 yet.
    [
      /^-\s*no version activity for\s+(.+?)\s+yet\.$/,
      "- $1 期间暂无版本活动。",
    ],
    // 距离下一等级：480 to Spark. Unlocks: judge crucibles.
    [
      /^([\d,]+)\s+to\s+([A-Z][A-Za-z ]+?)\.\s*Unlocks:\s*(.+?)\.$/,
      (m, n, tier, unlock) => {
        const tiers = {
          Spark: "星火",
          Kindle: "引燃",
          Flame: "烈焰",
          Blaze: "炽焰",
          Beacon: "信标",
          Nova: "新星",
          Star: "星耀",
          Supernova: "超新星",
          Legend: "传奇",
          Mythic: "神话",
        };
        const unlocks = { "judge crucibles": "担任擂台评委" };
        const tierName = tiers[tier.trim()] || tier.trim();
        const unlockName = unlocks[unlock.trim()] || unlock;
        return `距 ${tierName} 还差 ${n} 分。解锁：${unlockName}。`;
      },
    ],
    // 等级门槛：(from 25,000)
    [/^\(from\s+([\d,]+)\)$/, "（$1 起）"],
    // 距下一等级：Spark at 500
    [
      /^(Spark|Kindle|Flame|Blaze|Beacon|Nova|Star|Supernova|Legend|Mythic) at\s+([\d,]+)$/,
      (m, tier, n) =>
        `${({ Spark: "星火", Kindle: "引燃", Flame: "烈焰", Blaze: "炽焰", Beacon: "信标", Nova: "新星", Star: "星耀", Supernova: "超新星", Legend: "传奇", Mythic: "神话" })[tier]}（${n} 分）`,
    ],
    // 数字被拆成独立节点：Spark at
    [
      /^(Spark|Kindle|Flame|Blaze|Beacon|Nova|Star|Supernova|Legend|Mythic) at$/,
      (m, tier) =>
        `${({ Spark: "星火", Kindle: "引燃", Flame: "烈焰", Blaze: "炽焰", Beacon: "信标", Nova: "新星", Star: "星耀", Supernova: "超新星", Legend: "传奇", Mythic: "神话" })[tier]} 至`,
    ],
    // 历程统计：0 published / 0 total / 0 cast
    [/^([\d,]+)\s+published$/, "已发布 $1"],
    [/^([\d,]+)\s+total$/, "总计 $1"],
    [/^([\d,]+)\s+cast$/, "已投 $1"],
    [/^([\d,]+)\s+pts$/, "$1 分"],
    [/^([\d,]+)\s+reactions$/, "$1 个反应"],
    // 距离下一等级还差：500 to go.
    [/^([\d,]+)\s+to go\.$/, "还差 $1 分。"],
    // 故事线章节：Chapter 3
    [/^Chapter\s+(\d+)$/, "第 $1 章"],
    // 故事线章节缩写：Ch 3
    [/^Ch\s+(\d+)$/, "第 $1 章"],
    // 挑战 AI 评审说明：Only 6-12 entries selected at random every 10 min
    [
      /^Only\s+(\d+)\s*-\s*(\d+)\s+entries\s+selected at random every\s+(\d+)\s+min$/,
      "每 $3 分钟随机选出 $1-$2 件作品",
    ],
    // 里程碑差额：5 more for 100 Reactions
    [/^([\d,]+)\s+more for\s+(.+)$/, "距 $2 还需 $1"],
    // 竞赛战绩：0 challenge wins · 0 Crucible wins
    [
      /^([\d,]+)\s+challenge wins?\s*·\s*([\d,]+)\s+Crucible wins?$/,
      "$1 次挑战获胜 · $2 次擂台获胜",
    ],
    // Buzz 分色提示：Blue: 61 / Green: 300 / Yellow: 1,234
    [
      /^(Blue|Green|Yellow):\s*([\d,]+)$/,
      (m, color, n) => `${({ Blue: "蓝色", Green: "绿色", Yellow: "黄色" })[color]} Buzz：${n}`,
    ],
    // 小写复数：0 models
    [/^([\d,]+)\s+models?$/, "$1 个模型"],
    // 隐藏模型提示：191 models have been hidden due to your settings.
    [
      /^([\d,]+)\s+models? (?:have|has) been hidden due to your settings\.$/,
      "因你的设置，已隐藏 $1 个模型。",
    ],
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
      "Civitai 擂台 | 一对一图像竞赛",
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
    "Civitai | Share your models": "Civitai | 分享你的模型",
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
    ["models-create", /^\/models\/create(?:\/|$)/],
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
    ["creator-journey", /^\/creators\/journey(?:\/|$)/],
    ["posts", /^\/posts\/\d+/],
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
    // 创作者工作室是独立子域，路径判断不适用
    if (location.hostname.startsWith("creator-studio.")) return "creator-studio";
    const path = pathname || location.pathname;
    for (const [key, re] of PAGE_RULES) {
      if (re.test(path)) return key;
    }
    return "other";
  }

  /* ------------------------------------------------------------------------
   *  normalizeText：统一文本形态，避免「看着一样却匹配不上」
   *  - 去零宽字符（React 有时会插入）
   *  - NBSP / 多空白压成单空格
   *  - 弯引号、弯破折号归一成 ASCII
   *  输入：任意文本 / 输出：归一化后的文本
   * ---------------------------------------------------------------------- */
  function normalizeText(text) {
    return String(text == null ? "" : text)
      .replace(/[\u200b-\u200d\ufeff]/g, "")
      .replace(/[\u2018\u2019\u02bc]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[\s\u00a0]+/g, " ")
      .trim();
  }

  /* ------------------------------------------------------------------------
   *  buildDict：合并通用词库 + 当前页面词库（键统一归一化）
   *  输出：普通对象（页面词条覆盖通用词条）
   * ---------------------------------------------------------------------- */
  function buildDict(pageKey) {
    const raw = Object.create(null);
    Object.assign(raw, COMMON);
    const pageDict = PAGES[pageKey];
    if (pageDict) Object.assign(raw, pageDict);

    const dict = Object.create(null);
    // 额外维护一份全小写索引：UI 常用 CSS 转大写，源文本大小写不统一
    const lower = Object.create(null);
    for (const key of Object.keys(raw)) {
      const k = normalizeText(key);
      dict[k] = raw[key];
      lower[k.toLowerCase()] = raw[key];
    }
    State.dictLower = lower;
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
  function transText(text, el) {
    if (typeof text !== "string") return null;
    const trimmed = normalizeText(text);
    if (!trimmed) return null;
    if (!/[a-zA-Z]/.test(trimmed)) return null;

    // 作用域覆盖优先：处理 Save（表单=保存 / 内容=收藏）这类多义词
    if (el && el.closest && CONFIG.scopedDict) {
      for (const rule of CONFIG.scopedDict) {
        if (!el.closest(rule.selector)) continue;
        if (Object.prototype.hasOwnProperty.call(rule.map, trimmed)) return rule.map[trimmed];
      }
    }

    const dict = State.dict;
    // 精确词条不限制长度：长段落（折叠栏正文）也能命中
    if (Object.prototype.hasOwnProperty.call(dict, trimmed)) return dict[trimmed];

    // 带「·」前缀的短文案：翻译后半段并保留前缀（如「· yesterday」）
    const bulletMatch = trimmed.match(/^(·\s*)(.+)$/);
    if (bulletMatch) {
      const inner = transText(bulletMatch[2], el);
      if (inner != null) return bulletMatch[1] + inner;
    }

    // 小写别名：仅限导航/页脚等已知 UI 词
    const alias = CASE_ALIASES[trimmed.toLowerCase()];
    if (alias && Object.prototype.hasOwnProperty.call(dict, normalizeText(alias))) {
      return dict[normalizeText(alias)];
    }

    const lowerKey = trimmed.toLowerCase();
    // 大小写回退：处理 ALL CAPS / 首字母大写等同一 UI 文案
    if (trimmed.length <= 60 && State.dictLower &&
        Object.prototype.hasOwnProperty.call(State.dictLower, lowerKey)) {
      return State.dictLower[lowerKey];
    }

    // 正则只处理短文本，避免误伤长正文
    if (trimmed.length > CONFIG.maxTextLength) return null;

    for (const [re, rep] of REGEXPS) {
      try {
        if (re.test(trimmed)) return trimmed.replace(re, rep);
      } catch (err) {
        if (CONFIG.debug) console.warn("[civitai-zh] 正则失败", re, err);
      }
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

    // 记录首次见到的原文，供整段词组还原（只记一次，避免覆盖）
    if (!originalText.has(node)) originalText.set(node, raw);

    // 拆开的比例连接词：<span>0</span> of <span>10</span> 只在前后都是数字时翻译
    const trimmedRaw = raw.trim();
    if (trimmedRaw === "of") {
      const prev = node.previousSibling ? node.previousSibling.textContent.trim() : "";
      const next = node.nextSibling ? node.nextSibling.textContent.trim() : "";
      if (/\d$/.test(prev) && /^\d/.test(next)) {
        node.nodeValue = raw.replace(trimmedRaw, "/");
        return;
      }
    }

    const out = transText(raw, parent);
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
    while ((node = walker.nextNode())) {
      // 单节点失败不影响整棵树：否则一个异常会让后面全部漏翻
      safe(() => transNode(node), "transNode");
    }
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
   *  walkReadonlyValues：翻译只读输入框的显示值
   *  Mantine Select 把当前选项放在 readonly input 的 value 里
   *  输入：根节点 / 输出：无
   * ---------------------------------------------------------------------- */
  function walkReadonlyValues(root) {
    if (!root || root.nodeType !== 1) return;
    const nodes = [root];
    if (root.querySelectorAll) nodes.push(...root.querySelectorAll('input[readonly]'));
    for (const el of nodes) {
      if (el.nodeType !== 1 || el.tagName !== "INPUT" || !el.readOnly) continue;
      if (isIgnored(el)) continue;
      const raw = el.value;
      if (!raw) continue;
      const out = transText(raw);
      if (out != null && out !== raw) el.value = out;
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
   *  consolidatePhrases：合并被 React 拆开的整句文本
   *  React 常把一句话拆成多个文本节点（如 "Free " + "submissions" + " you'll accept"），
   *  逐节点翻译会语序错乱。这里先看元素整体文本能否命中静态词条，命中就直接替换。
   *  限制：只处理纯行内内容（无链接/按钮/图片/表单），避免破坏交互元素。
   *  输入：根节点 / 输出：无
   * ---------------------------------------------------------------------- */
  const PHRASE_SELECTOR = "p, span, label, li, h1, h2, h3, h4, h5, h6";

  // 文本节点翻译前的原文快照：React 把一句话拆成多个节点时，
  // 整段词组还原需要原文，否则拿到的已经是译好的中文片段
  const originalText = new WeakMap();

  /* 取元素内所有文本节点的原文（优先用快照），等价于保留原文的 textContent */
  function collectOriginalText(el) {
    if (el.nodeType === 3) {
      return originalText.has(el) ? originalText.get(el) : el.nodeValue;
    }
    let out = "";
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      out += originalText.has(node) ? originalText.get(node) : node.nodeValue;
    }
    return out;
  }
  // 带这些子元素的句子不能整段替换（会破坏交互/媒体）
  const PHRASE_BLOCKERS = "button, img, svg, input, textarea, select, video, canvas, br";

  /* 把连续的文本节点合并后翻译；成功则替换成一个节点 */
  function replaceSegment(nodes, rawText) {
    const out = transText(rawText);
    if (!out || out === rawText) return false;
    const first = nodes[0];
    if (!first || !first.parentNode) return false;
    const merged = document.createTextNode(out);
    first.parentNode.replaceChild(merged, first);
    for (let i = 1; i < nodes.length; i++) nodes[i].remove();
    return true;
  }

  function consolidatePhrases(root) {
    if (!root || !root.querySelectorAll) return;
    const els = [];
    // 根元素本身也可能是被拆句的容器（MutationObserver 只给新增节点）
    if (root.nodeType === 1 && root.matches && root.matches(PHRASE_SELECTOR)) els.push(root);
    els.push(...root.querySelectorAll(PHRASE_SELECTOR));

    // 纯文本 div：Mantine 菜单项等把整句拆在多个文本节点里，容器是普通 div
    for (const div of root.querySelectorAll("div")) {
      if (div.childNodes.length > 0 && [...div.childNodes].every((n) => n.nodeType === 3)) {
        els.push(div);
      }
    }

    let checked = 0;
    for (const el of els) {
      if (checked++ > 5000) break;
      if (el.childNodes.length <= 1) continue;
      if (isIgnored(el) || el.querySelector(PHRASE_BLOCKERS)) continue;

      // 含链接时只在链接之间分段处理，保住 <a> 本身
      if (el.querySelector("a")) {
        let run = [];
        for (const child of [...el.childNodes]) {
          if (child.nodeType === 1 && child.tagName === "A") {
            if (run.length > 0) {
              const text = run.map((n) => collectOriginalText(n)).join("").trim();
              if (/[a-zA-Z]/.test(text) && text.length <= 200) replaceSegment(run, text);
            }
            run = [];
          } else if (child.nodeType === 3 || (child.nodeType === 1 && !child.querySelector(PHRASE_BLOCKERS))) {
            run.push(child);
          } else {
            run = [];
          }
        }
        if (run.length > 0) {
          const text = run.map((n) => collectOriginalText(n)).join("").trim();
          if (/[a-zA-Z]/.test(text) && text.length <= 200) replaceSegment(run, text);
        }
        continue;
      }

      const raw = collectOriginalText(el);
      if (!raw || !/[a-zA-Z]/.test(raw)) continue;

      const trimmed = normalizeText(raw);
      if (!trimmed || trimmed.length > 200) continue;
      if (!State.dict) continue;

      let out = null;
      if (Object.prototype.hasOwnProperty.call(State.dict, trimmed)) {
        out = State.dict[trimmed];
      } else if (trimmed.length <= 60 && State.dictLower &&
                 Object.prototype.hasOwnProperty.call(State.dictLower, trimmed.toLowerCase())) {
        out = State.dictLower[trimmed.toLowerCase()];
      }
      if (out && out !== trimmed && /[\u4e00-\u9fa5]/.test(out)) {
        el.textContent = out;
      }
    }
  }

  /* ------------------------------------------------------------------------
   *  translatePage：整页翻译（幂等）
   *  输出：无
   * ---------------------------------------------------------------------- */
  function translatePage() {
    if (!State.enabled) return;
    const root = document.body || document.documentElement;
    safe(() => consolidatePhrases(root), "phrases");
    safe(() => walk(root), "walk");
    safe(() => walkAttributes(root), "walkAttributes");
    safe(() => walkReadonlyValues(root), "readonly-values");
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
        if (node.nodeType === 3) {
          // 先看父元素的整句能否命中，避免拆开的句子被逐节点翻译
          if (node.parentElement) safe(() => consolidatePhrases(node.parentElement), "mutation-phrase");
          if (node.isConnected) transNode(node);
        } else if (node.nodeType === 1) {
          safe(() => consolidatePhrases(node), "mutation-phrase");
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
   *  collectUntranslated：导出当前页所有未命中的英文可见文本
   *  用途：折叠栏/悬浮窗里的漏网文案，直接复制给我补词库
   *  输出：去重后的字符串数组（已过滤用户内容无关的数字/链接）
   * ---------------------------------------------------------------------- */
  function collectUntranslated() {
    const root = document.body || document.documentElement;
    if (!root) return [];

    const result = [];
    const seen = new Set();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || isIgnored(parent)) return NodeFilter.FILTER_REJECT;
        return normalizeText(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      // 诊断时跳过不可见节点（隐藏弹窗残留）
      if (parent && typeof parent.checkVisibility === "function" && !parent.checkVisibility()) continue;
      const text = normalizeText(node.nodeValue);
      if (text.length < 2 || text.length > 200) continue;
      if (!/[a-zA-Z]/.test(text)) continue;
      if (/[\u4e00-\u9fa5]/.test(text)) continue;
      if (/^https?:/.test(text)) continue;
      if (/^[\d\s.,:#%+/\-]+$/.test(text)) continue;
      if (transText(text) != null) continue;
      if (seen.has(text)) continue;
      seen.add(text);
      result.push(text);
    }
    return result;
  }

  /* ------------------------------------------------------------------------
   *  菜单：开关翻译 / 导出未翻译文本
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

    register("导出未翻译文本到控制台", () => {
      const list = collectUntranslated();
      console.info(`[civitai-zh] 未翻译 ${list.length} 条：`, list);
    });
  }

  /* ------------------------------------------------------------------------
   *  init：入口
   *  输出：无 / 预期：DOM 就绪后翻译整页并开始监听
   * ---------------------------------------------------------------------- */
  function init() {
    // 自检标记：控制台或元素面板可确认脚本是否真的注入
    safe(() => document.documentElement.setAttribute("data-civitai-zh", VERSION), "marker");
    safe(() => console.info(`[civitai-zh] 已加载 v${VERSION} · 页面类型：${getPageKey()}`), "log");

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
    collectUntranslated,
    get pageKey() {
      return State.pageKey;
    },
  };
})(window, document);
