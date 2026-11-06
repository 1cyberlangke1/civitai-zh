// ==UserScript==
// @name         Civitai 中文化插件
// @namespace    https://github.com/1cyberlangke1/civitai-zh
// @description  中文化 Civitai 界面的菜单及内容
// @version      0.2.6
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
  const VERSION = "0.2.6";

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
    // ---- 自定义导航弹窗 ----
    "Customize navigation": "自定义导航",
    "Show labels": "显示标签",
    "Turn off for an icon-only nav bar.": "关闭后导航栏只显示图标。",
    "Keep profile tab labels": "保留个人主页标签文字",
    "On narrow screens, scroll the profile tabs instead of shrinking them to icons.":
      "在窄屏上滚动标签，而不是将其缩小为图标。",
    "Primary menu": "主菜单",
    "Shown as tabs, in this order.": "按此顺序显示为标签。",
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
    "Report a bug": "报告问题",
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
    "Aesthetic Gradient": "美学梯度",
    Upscaler: "放大模型",
    Motion: "动态",
    "Text Encoder": "文本编码器",
    Poses: "姿势",
    Wildcards: "通配符",
    Workflows: "工作流",
    "ComfyUI Workflows": "ComfyUI 工作流",
    Detection: "检测",
    Other: "其他",
    "Base model": "基础模型",
    "All Base Models": "全部基础模型",
    Modifiers: "修饰项",
    Hidden: "隐藏",
    Reset: "重置",
    "Apply filters": "应用筛选",
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

      // ---- 设置：内容与浏览 ----
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
        "你将不会出现在 Mythic、名人堂和 New Supernovas 中。你的徽章仍会显示在主页上。",
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
    // 注册时间：Member since Apr 19, 2024 / Member since April 19, 2024
    [
      new RegExp(`^Member since\\s+(${MONTH_RE}|${FULL_MONTH_RE})\\s+(\\d{1,2}),\\s+(\\d{4})$`),
      (m, mon, day, year) => `${year}年${(MONTHS[mon] || FULL_MONTHS[mon])}${day}日加入`,
    ],
    // 保险库容量：100 GB of model storage
    [/^(\d+)\s*GB of model storage$/i, "$1 GB 模型存储空间"],
    // 完整月份 + 年份：November 2026
    [
      new RegExp(`^(${FULL_MONTH_RE})\\s+(\\d{4})$`),
      (m, mon, year) => `${year}年${FULL_MONTHS[mon]}`,
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
   *  translatePage：整页翻译（幂等）
   *  输出：无
   * ---------------------------------------------------------------------- */
  function translatePage() {
    if (!State.enabled) return;
    const root = document.body || document.documentElement;
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
