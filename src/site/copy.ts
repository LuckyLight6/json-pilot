import type { Locale } from '@/i18n'

/**
 * Product-site copy. Kept apart from the editor's message catalogue: the site
 * is marketing prose, the catalogue is UI labels, and neither should grow the
 * other's bundle. The locale itself is shared — see `I18nProvider`.
 */
export interface SiteCopy {
  meta: { title: string; description: string }
  nav: {
    features: string
    demo: string
    privacy: string
    openApp: string
    theme: string
    language: string
    themes: { system: string; light: string; dark: string }
    languages: { system: string; en: string; 'zh-CN': string }
  }
  hero: {
    badge: string
    titleLead: string
    titleAccent: string
    subtitle: string
    primary: string
    secondary: string
    footnote: string
  }
  demo: {
    eyebrow: string
    title: string
    subtitle: string
    play: string
    pause: string
    soundOn: string
    soundOff: string
  }
  features: {
    eyebrow: string
    title: string
    subtitle: string
    fold: { title: string; body: string; expand: string; collapse: string }
    query: { title: string; body: string; result: string }
    compare: { title: string; body: string; before: string; after: string }
    transform: { title: string; body: string; actions: string[] }
    keyboard: { title: string; body: string }
    privacy: { title: string; body: string }
  }
  privacy: { eyebrow: string; title: string; subtitle: string; stats: { value: string; label: string }[] }
  cta: { title: string; subtitle: string; primary: string; secondary: string }
  footer: { tagline: string; credits: string; app: string; source: string; issues: string }
}

const en: SiteCopy = {
  meta: {
    title: 'JSON Pilot — the JSON workbench that runs in your browser',
    description:
      'Format, query, compare and unfold nested JSON strings. Free, open source and keyboard-first — and nothing ever leaves your browser.',
  },
  nav: {
    features: 'Features',
    demo: 'Demo',
    privacy: 'Privacy',
    openApp: 'Open app',
    theme: 'Theme',
    language: 'Language',
    themes: { system: 'System', light: 'Light', dark: 'Dark' },
    languages: { system: 'System', en: 'English', 'zh-CN': '简体中文' },
  },
  hero: {
    badge: 'Open source · Runs entirely in your browser',
    titleLead: 'Make sense of any JSON —',
    titleAccent: 'even the JSON hiding in strings.',
    subtitle:
      'JSON Pilot is a fast, keyboard-first workbench for JSON. Format, query, compare and unfold stringified payloads in one place — with nothing uploaded, ever.',
    primary: 'Open JSON Pilot',
    secondary: 'Watch the demo',
    footnote: 'Free · No sign-up · No install',
  },
  demo: {
    eyebrow: 'See it in action',
    title: 'From raw payload to answer in seconds',
    subtitle:
      'Paste a document, unfold the JSON buried in its strings, query it and compare versions — without leaving the keyboard.',
    play: 'Play demo',
    pause: 'Pause demo',
    soundOn: 'Sound on',
    soundOff: 'Mute',
  },
  features: {
    eyebrow: 'Features',
    title: 'Everything you reach for, one keystroke away',
    subtitle: 'Built on the editor that powers VS Code, tuned for the way you actually read JSON.',
    fold: {
      title: 'Nested String Fold',
      body: 'Logs, queues and webhooks love to stuff JSON into strings. Click ⊞ to unpack one into a real structure and ⊟ to pack it back — lossless, and fully undoable.',
      expand: 'Expand this JSON string',
      collapse: 'Collapse into a JSON string',
    },
    query: {
      title: 'JSONPath or JavaScript',
      body: 'Point at data with $.users[*].name, or write a real expression. Results open in their own tab with one click.',
      result: 'Result',
    },
    compare: {
      title: 'Side-by-side compare',
      body: 'Diff two documents in a tab of their own. Both sides stay editable — swap them, or promote either one.',
      before: 'Original',
      after: 'Modified',
    },
    transform: {
      title: 'One-click transforms',
      body: 'JSONC comments survive every transform — even Minify and Sort keys — and your cursor stays exactly where it was.',
      actions: ['Format', 'Minify', 'Sort keys', 'Escape', 'Unescape'],
    },
    keyboard: {
      title: 'Keyboard-first',
      body: 'Every action has a shortcut, and every shortcut can be rebound.',
    },
    privacy: {
      title: 'Private by design',
      body: 'No server, no account, no analytics. Documents live in the tab you opened them in.',
    },
  },
  privacy: {
    eyebrow: 'Privacy',
    title: 'Your data never leaves the tab',
    subtitle:
      'JSON Pilot is a static page. Parsing, querying and diffing all happen locally, so it is safe to paste production payloads, tokens and logs.',
    stats: [
      { value: '0', label: 'bytes uploaded' },
      { value: '0', label: 'accounts or trackers' },
      { value: 'MIT', label: 'open source licence' },
      { value: '2', label: 'languages: English & 中文' },
    ],
  },
  cta: {
    title: 'Ready for take-off?',
    subtitle: 'Open JSON Pilot and paste your first document. It is free, and it stays that way.',
    primary: 'Open JSON Pilot',
    secondary: 'Star on GitHub',
  },
  footer: {
    tagline: 'The JSON workbench that runs in your browser.',
    credits: 'MIT licensed · Built with React and Monaco',
    app: 'Open app',
    source: 'Source code',
    issues: 'Report an issue',
  },
}

const zhCN: SiteCopy = {
  meta: {
    title: 'JSON Pilot — 在浏览器里运行的 JSON 工作台',
    description: '格式化、查询、对比、展开嵌套 JSON 字符串。免费开源、键盘优先，数据从不离开你的浏览器。',
  },
  nav: {
    features: '功能',
    demo: '演示',
    privacy: '隐私',
    openApp: '打开应用',
    theme: '主题',
    language: '语言',
    themes: { system: '跟随系统', light: '浅色', dark: '深色' },
    languages: { system: '跟随系统', en: 'English', 'zh-CN': '简体中文' },
  },
  hero: {
    badge: '开源 · 完全在浏览器中运行',
    titleLead: '看懂任何 JSON，',
    titleAccent: '连藏在字符串里的也不例外。',
    subtitle:
      'JSON Pilot 是一款快速、键盘优先的 JSON 工作台。格式化、查询、对比、展开字符串化的数据，一站搞定——全程本地处理，绝不上传。',
    primary: '打开 JSON Pilot',
    secondary: '观看演示',
    footnote: '免费 · 无需注册 · 无需安装',
  },
  demo: {
    eyebrow: '实际演示',
    title: '从原始数据到答案，只需几秒',
    subtitle: '粘贴文档，展开藏在字符串里的 JSON，查询、对比——全程手不离键盘。',
    play: '播放演示',
    pause: '暂停演示',
    soundOn: '开启声音',
    soundOff: '静音',
  },
  features: {
    eyebrow: '功能',
    title: '常用操作，一键直达',
    subtitle: '基于 VS Code 同款编辑器内核，为阅读 JSON 的真实场景而打磨。',
    fold: {
      title: '嵌套字符串折叠',
      body: '日志、消息队列和 Webhook 总爱把 JSON 塞进字符串。点击 ⊞ 把它展开成真正的结构，点击 ⊟ 再收回去——无损往返，随时撤销。',
      expand: '展开该 JSON 字符串',
      collapse: '折叠为 JSON 字符串',
    },
    query: {
      title: 'JSONPath 与 JavaScript 查询',
      body: '用 $.users[*].name 精准定位，或直接写表达式。查询结果一键另存为新标签页。',
      result: '结果',
    },
    compare: {
      title: '左右对比',
      body: '在独立标签页中对比两份文档。两侧均可编辑，可以交换左右，也能把任一侧另存为新文档。',
      before: '原始',
      after: '修改后',
    },
    transform: {
      title: '一键变换',
      body: 'JSONC 注释在格式化、压缩、键排序后都会保留，光标位置也纹丝不动。',
      actions: ['格式化', '压缩', '键排序', '转义', '反转义'],
    },
    keyboard: {
      title: '键盘优先',
      body: '每个操作都有快捷键，每个快捷键都能自定义。',
    },
    privacy: {
      title: '隐私至上',
      body: '没有服务器、没有账号、没有统计脚本。文档只存在于当前标签页。',
    },
  },
  privacy: {
    eyebrow: '隐私',
    title: '你的数据，从不离开这个标签页',
    subtitle: 'JSON Pilot 是一个纯静态页面，解析、查询、对比全部在本地完成——生产环境的数据、令牌和日志都可以放心粘贴。',
    stats: [
      { value: '0', label: '字节上传' },
      { value: '0', label: '账号与追踪' },
      { value: 'MIT', label: '开源许可' },
      { value: '2', label: '种界面语言' },
    ],
  },
  cta: {
    title: '准备起飞？',
    subtitle: '打开 JSON Pilot，粘贴你的第一份文档。永久免费。',
    primary: '打开 JSON Pilot',
    secondary: '在 GitHub 上点星',
  },
  footer: {
    tagline: '在浏览器里运行的 JSON 工作台。',
    credits: 'MIT 许可 · 基于 React 与 Monaco 构建',
    app: '打开应用',
    source: '源代码',
    issues: '反馈问题',
  },
}

export const SITE_COPY: Record<Locale, SiteCopy> = { en, 'zh-CN': zhCN }

export const REPOSITORY_URL = 'https://github.com/LuckyLight6/json-pilot'

/** Relative, so the link works from any host or sub-path and from `vite dev`. */
export const APP_URL = './app/'
