import fs from 'node:fs'
import path from 'node:path'
import {defineConfig} from 'vitepress'

type ChapterEntry = {
  key: string
  text: string
  isSection: boolean
}

function readMarkdownTitle(filePath: string, fallback: string): string {
  const content = fs.readFileSync(filePath, 'utf-8')
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim()
  if (!heading) return fallback
  return heading.replace(/`/g, '')
}

function parseChaptersYml(chaptersPath: string): ChapterEntry[] {
  if (!fs.existsSync(chaptersPath)) return []

  const lines = fs.readFileSync(chaptersPath, 'utf-8').split(/\r?\n/)
  const entries: ChapterEntry[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^-\s+(.+?):\s*(.+)\s*$/)
    if (!match) continue

    const key = match[1].trim()
    const text = match[2].trim()
    entries.push({key, text, isSection: key.endsWith('/')})
  }

  return entries
}

function mdLink(basePrefix: string, mdPath: string): string {
  return `/${basePrefix}/${mdPath.replace(/\.md$/, '')}`
}

function scanFlatMarkdownItems(docsDir: string, basePrefix: string) {
  const files = fs
    .readdirSync(docsDir)
    .filter((file) => file.endsWith('.md'))
    .sort((a, b) => {
      if (a === 'intro.md') return -1
      if (b === 'intro.md') return 1
      return a.localeCompare(b, 'zh-CN')
    })

  return files.map((file) => {
    const filePath = path.join(docsDir, file)
    const name = file.replace(/\.md$/, '')
    return {
      text: readMarkdownTitle(filePath, name),
      link: `/${basePrefix}/${name}`
    }
  })
}

function buildFlatSidebar(options: {
  docsDir: string
  chaptersPath: string
  basePrefix: string
  sectionText: string
}) {
  const {docsDir, chaptersPath, basePrefix, sectionText} = options
  const chapters = parseChaptersYml(chaptersPath)

  let items = chapters
    .filter((entry) => !entry.isSection && entry.key.endsWith('.md'))
    .filter((entry) => fs.existsSync(path.join(docsDir, entry.key)))
    .map((entry) => ({
      text: entry.text,
      link: mdLink(basePrefix, entry.key)
    }))

  if (items.length === 0) {
    items = scanFlatMarkdownItems(docsDir, basePrefix)
  }

  return [
    {
      text: sectionText,
      collapsed: false,
      items
    }
  ]
}

function buildGroupedSidebar(options: {
  docsDir: string
  chaptersPath: string
  basePrefix: string
  fallbackSectionText: string
}) {
  const {docsDir, chaptersPath, basePrefix, fallbackSectionText} = options
  const chapters = parseChaptersYml(chaptersPath)

  const groups: Array<{ text: string; collapsed: boolean; items: Array<{ text: string; link: string }> }> = []
  let currentGroup: { text: string; collapsed: boolean; items: Array<{ text: string; link: string }> } | null = null

  for (const entry of chapters) {
    if (entry.isSection) {
      if (currentGroup && currentGroup.items.length > 0) groups.push(currentGroup)
      currentGroup = {text: entry.text, collapsed: true, items: []}
      continue
    }

    if (!entry.key.endsWith('.md')) continue
    if (!fs.existsSync(path.join(docsDir, entry.key))) continue

    if (!currentGroup) {
      currentGroup = {text: fallbackSectionText, collapsed: false, items: []}
    }

    currentGroup.items.push({
      text: entry.text,
      link: mdLink(basePrefix, entry.key)
    })
  }

  if (currentGroup && currentGroup.items.length > 0) groups.push(currentGroup)

  if (groups.length === 0) {
    return [
      {
        text: fallbackSectionText,
        collapsed: false,
        items: scanFlatMarkdownItems(docsDir, basePrefix)
      }
    ]
  }

  return groups
}

const htmlSidebar = buildFlatSidebar({
  docsDir: path.resolve(process.cwd(), 'frontend/html/docs'),
  chaptersPath: path.resolve(process.cwd(), 'frontend/html/chapters.yml'),
  basePrefix: 'frontend/html/docs',
  sectionText: 'HTML 教程'
})

const jsSidebar = buildGroupedSidebar({
  docsDir: path.resolve(process.cwd(), 'frontend/js/docs'),
  chaptersPath: path.resolve(process.cwd(), 'frontend/js/chapters.yml'),
  basePrefix: 'frontend/js/docs',
  fallbackSectionText: 'JavaScript 教程'
})

const es6Sidebar = buildFlatSidebar({
  docsDir: path.resolve(process.cwd(), 'frontend/es6/docs'),
  chaptersPath: path.resolve(process.cwd(), 'frontend/es6/chapters.yml'),
  basePrefix: 'frontend/es6/docs',
  sectionText: 'ES6 教程'
})

const tsSidebar = buildFlatSidebar({
  docsDir: path.resolve(process.cwd(), 'frontend/ts/docs'),
  chaptersPath: path.resolve(process.cwd(), 'frontend/ts/chapters.yml'),
  basePrefix: 'frontend/ts/docs',
  sectionText: 'TypeScript 教程'
})

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'XXDocs',
  description: '全栈开发者必备',
  head: [
    ['link', {rel: 'icon', type: 'image/x-icon', href: '/favicon.ico'}],
    ['link', {rel: 'apple-touch-icon', href: '/favicon.ico'}]
  ],
  lang: 'zh-CN',
  srcExclude: ['**/node_modules/**', '**/dist/**', '**/.*/**'],
  themeConfig: {
    logo: '/logo.png',
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      {
        text: 'Web前端开发',
        items: [
          {text: 'HTML', link: '/frontend/html/docs/intro'},
          {text: 'CSS', link: 'https://developer.mozilla.org/zh-CN/docs/Web/CSS'},
          {text: 'JavaScript', link: '/frontend/js/docs/basic/introduction'},
          {text: 'ES6', link: '/frontend/es6/docs/intro'},
          {text: 'TypeScript', link: '/frontend/ts/docs/intro'},
          {
            text: 'JS框架', items: [
              {
                text: 'Vue', link: 'https://cn.vuejs.org/',
              },
              {
                text: 'React', link: 'https://zh-hans.react.dev/learn',
              },
            ]
          }
        ]
      },
      {
        text: '移动端开发',
        items: [
          {text: 'Android', link: 'https://developer.android.com/develop/ui'},
          {text: 'iOS', link: 'https://developer.apple.com/ios/'},
          {text: '鸿蒙', link: 'https://developer.huawei.com/consumer/cn/app'},
        ]
      },
      {
        text: '跨端开发',
        items: [
          {text: 'Flutter', link: 'https://docs.flutter.dev/ui'},
          {text: 'RN', link: 'https://reactnative.dev/docs/getting-started'}]
      },
      {
        text: '后端开发',
        items: [
          {text: 'Node.js', link: 'https://nodejs.org/learn/getting-started/introduction-to-nodejs'},
          {text: 'Spring Boot', link: 'https://spring.io/projects/spring-boot'}]
      },
      {
        text: '编程语言',
        items: [
          {text: 'JavaScript', link: '/frontend/js/docs/basic/introduction'},
          {text: 'TypeScript', link: '/frontend/ts/docs/intro'},
          {text: 'Java', link: 'https://dev.java/learn/'},
          {text: 'Kotlin', link: 'https://kotlinlang.org/docs/home.html'}]
      },
      {
        text: '关于',
        items: [
          {
            text: '关于XXDocs',
            link: '/README'
          },
          {
            text: '更新日志',
            link: '/CHANGELOG'
          }
        ]
      }
    ],

    sidebar: {
      '/frontend/html/docs/': htmlSidebar,
      '/frontend/js/docs/': jsSidebar,
      '/frontend/es6/docs/': es6Sidebar,
      '/frontend/ts/docs/': tsSidebar,
    },

    socialLinks: [
      {icon: 'github', link: 'https://github.com/RumbleTsc/xxdocs'}],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present 柿橙'
    }
  }
})
