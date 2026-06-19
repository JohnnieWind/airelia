# Tailwind CSS v3 升 v4，我实际改了哪些东西

> 平台：微信公众号 | 字数：约2700字 | 调性：实战、直接、偏工程记录

---

最近把一个 Vite + React 项目里的 Tailwind CSS 从 v3 升到了 v4。

先说一下 Tailwind CSS 是什么。

和 Ant Design、Element UI 这类组件库相比，Tailwind CSS 更底层一些。Ant Design、Element UI 给的是按钮、表格、弹窗；Tailwind 给的是一组很细的 CSS 工具类。写界面时，你可以直接在 HTML 或 JSX 里组合 `flex`、`gap-4`、`rounded-md`、`bg-white`、`text-sm` 这些 class，而不用先给每块样式起 `.card`、`.button-primary` 这类名字。

喜欢它的人觉得直接、可控、改起来快。

不喜欢它的人会觉得 class 太长，HTML 看起来像被样式塞满了。

这两个感受都真实。我以前也纠结过。但到了 AI 编程越来越常见的今天，我反而觉得 Tailwind 的优势变得更明显了。

原因很简单：AI 写 UI 时，更擅长在局部上下文里生成可运行、可观察、可修改的界面代码。让它先抽象一套设计系统，再给每个 CSS 类取一个优雅名字，反而容易绕远。

Tailwind 正好贴着这个工作方式。

你让 AI 改一个按钮，它能直接把 `px-3 py-2` 调成 `px-4 py-2.5`。你让它把一个面板改得更紧凑，它会去动 `gap`、`padding`、`text-sm`、`border`。这些变化都在组件里，看得见，也容易 review。

这就是我说的“AI 时代的原生性”。

Tailwind 出现时还没有今天这波 AI 编程热潮，但它的表达方式很适合 AI 参与协作：样式和结构离得近，反馈链路短，模型改到真实界面之前，不需要穿过一堆命名和间接抽象。

当然，这也有代价。Tailwind 写不好，一样会变成一坨 class。AI 写 Tailwind 如果没人审，也会堆出很怪的界面。设计判断还在，只是修改界面的颗粒度变小了。

也正因为这样，v3 升 v4 这件事值得认真看一下。这次升级会改版本号，也会把 Tailwind 往更贴近 CSS 本身的方向推一步。

一开始我以为就是改依赖版本。后来发现没这么简单。v4 的变化不算难，但它会逼你清理掉不少 v3 时代留下来的东西：`tailwind.config.ts`、`postcss.config.js`、CSS 里的三段 `@tailwind` 指令，还有一些你平时不太会看的 utility 细节。

如果你只是把包升上去，让项目勉强跑起来，后面大概率还会回来补坑。

我这篇不讲发布会式的新特性，主要讲迁移时真正要动的地方。

## 先看一个变化：CSS 入口变重要了

v3 项目里，我们通常先看 `tailwind.config.js` 或 `tailwind.config.ts`。

颜色放这里，字体放这里，扫描路径也放这里。时间久了，很多项目的 Tailwind 配置文件会变成一个小仓库。

v4 以后，官方更推荐 CSS-first 的写法。简单说，很多主题配置可以直接写进 CSS 入口：

```css
@import "tailwindcss";

@theme {
  --color-brand: #2563eb;
  --font-sans: Inter, ui-sans-serif, system-ui, sans-serif;
}
```

这个变化刚看会有点别扭。

以前我们写：

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        brand: "#2563eb"
      }
    }
  }
}
```

现在可以改成：

```css
@theme {
  --color-brand: #2563eb;
}
```

组件里还是这么用：

```tsx
<button className="bg-brand text-white">Save</button>
```

utility class 还在。类名还是那些类名，只是背后的 token 从 JS 配置挪到了 CSS 变量体系里。

我个人觉得这一步挺合理。颜色、字体、圆角这些东西，最后本来就要落到 CSS。v4 只是少绕了一圈。

## Vite 项目，直接用 `@tailwindcss/vite`

如果你的项目是 Vite，迁移路线很清楚。先装 v4 相关依赖：

```bash
npm install tailwindcss @tailwindcss/vite
```

然后改 `vite.config.ts`：

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), react()]
});
```

CSS 入口改成：

```css
@import "tailwindcss";
```

到这里，基本链路就对了。

这里最容易漏掉的是旧的 PostCSS 配置。很多 v3 项目会有一个 `postcss.config.js`：

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

这套写法在 v4 里不该继续照搬。

v4 里，原来的 PostCSS 插件用法已经换了位置。如果你真的需要走 PostCSS，要换成 `@tailwindcss/postcss`。但 Vite 项目没必要绕这一步，官方推荐的是 `@tailwindcss/vite`。

还有一点也可以顺手清掉：v4 已经处理 CSS import 和 vendor prefixing，老项目里为 Tailwind 配的 `postcss-import`、`autoprefixer`，很多时候可以删。

删之前看一眼项目里有没有别的工具依赖它们。没有的话，别留着。构建链路越干净，后面越少猜谜。

## CSS 里的三段 `@tailwind` 要换掉

v3 时代常见的入口是这样：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

v4 换成：

```css
@import "tailwindcss";
```

不要两个都写。

我见过一些迁移写法是先加 `@import "tailwindcss"`，旧的三段指令也留着，想着“能跑就先这样”。这种状态很麻烦。它可能不会马上报错，后面却会在某个样式、某次构建、某个插件上变成奇怪问题。

升级这件事，宁可小步改，也别混着两代写法。

## `tailwind.config` 还能不能留？

能。

但别再默认把它当作所有配置的中心。

v4 仍然支持 JavaScript 配置文件，只是很多项目已经不需要它了。像颜色、字体这些简单 token，放到 `@theme` 里更顺手。

比如原来是：

```ts
export default {
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        shell: "#f7f4ee"
      }
    }
  }
}
```

可以改成：

```css
@theme {
  --color-ink: #17202a;
  --color-shell: #f7f4ee;
}
```

页面里继续用：

```tsx
<main className="bg-shell text-ink" />
```

什么时候该保留 `tailwind.config`？

如果你里面有复杂插件、兼容历史包袱、特殊的 source 扫描逻辑，那就别急着删。先确认 v4 的写法怎么迁过去。反过来，如果里面只是几个颜色和字体，删掉反而更清楚。

## 升级后别只看构建

Tailwind v4 有一些细节变化，很多变化不会让构建失败。

官方升级指南里列了不少 utility 重命名，例如：

```txt
shadow-sm       -> shadow-xs
shadow          -> shadow-sm
blur-sm         -> blur-xs
rounded         -> rounded-sm
outline-none    -> outline-hidden
ring            -> ring-3
```

这类东西最烦的地方在于，页面可能还能打开，但视觉已经不一样了。

还有几个我会重点扫：

默认 border 颜色变了。v3 里很多人没写 `border-gray-200`，只写了一个 `border`，升级后要看看边框是不是变得太淡或太怪。

`ring` 的默认宽度也要看。尤其是按钮、输入框、focus 状态，别只看静态截图。

`hover` 在 v4 里更尊重设备能力。桌面端通常没问题，但移动端如果以前靠 hover 做了一些状态展示，需要重新点一遍。

任意值语法也要留心。特别是 CSS 变量相关写法，v4 有一些更明确的新语法。

所以我建议：构建通过以后，至少打开核心页面看一眼。按钮、表单、导航、卡片、弹窗，这些地方最容易暴露问题。

## 我会按这个顺序迁移

这是我比较喜欢的顺序，不一定适合所有项目，但至少不容易把自己绕进去。

### 1. 先确认 v3 下是正常的

升级前先跑：

```bash
npm test
npm run build
```

再截几张关键页面。别嫌麻烦。

升级以后页面变了，你得知道“原来长什么样”。不然你只能凭记忆猜，这个体验很差。

### 2. 换依赖

Vite 项目可以改成这样：

```json
{
  "dependencies": {
    "tailwind-merge": "^3.3.1"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.3",
    "tailwindcss": "^4.0.3"
  }
}
```

这里顺便说一下 `tailwind-merge`。如果项目里有大量条件 class 拼接，它最好也跟着升到支持 v4 的版本，别让 class 合并逻辑拖后腿。

### 3. 改 Vite 配置

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), react()]
});
```

### 4. 改 CSS 入口

```css
@import "tailwindcss";

@theme {
  --color-ink: #17202a;
  --color-signal: #f5b700;
  --color-mint: #7bd88f;
  --color-shell: #f7f4ee;
  --font-sans: Inter, ui-sans-serif, system-ui, sans-serif;
}
```

### 5. 处理旧配置

如果已经完全迁到 v4 的 Vite 插件和 CSS-first 写法，通常可以删除：

```txt
postcss.config.js
tailwind.config.js
tailwind.config.ts
```

但我再啰嗦一句：很多项目不能直接删。删之前先看内容。里面如果有业务项目积累下来的插件和 safelist，要一个个迁。

### 6. 跑验证

至少跑：

```bash
npm run lint
npm test
npm run build
git diff --check
```

然后打开页面。

Tailwind 升级有一半是代码问题，另一半是肉眼问题。

## 哪些项目可以先不升

v4 没必要无脑升。

如果你的项目还要支持很老的浏览器，先别急。官方文档里写得很清楚，v4 面向的是现代浏览器。老浏览器支持是硬要求的话，留在 v3.4 更稳。

如果你依赖很多 Tailwind 插件，也先查插件兼容性。插件没跟上，你自己硬升，最后可能会变成给插件补课。

还有一种情况：项目快上线了，样式回归时间不够。那也别升。Tailwind 升级看起来是工程配置，实际会影响 UI 细节。临上线前做这种事，心态容易坏。

## 最后说点实话

我对 v4 的感觉是：它没那么吓人，但工作量比“改个版本号”多。

它把很多东西从 JS 配置里拿出来，放回 CSS 里。对新项目来说，这会更清爽；对老项目来说，这意味着你要整理一次历史配置。

这次迁移真正值得做的事，是顺手把链路理一遍：

旧 PostCSS 配置还要不要？

`tailwind.config` 里到底有没有必要留下的东西？

那些没写颜色的 `border`、默认 `ring`、旧 utility 名称，会不会已经悄悄影响界面？

这些问题查完，升级才算踏实。

不然只是把 v4 装进一个 v3 的壳里。能跑，但别扭。

---

## 备选标题

1. Tailwind v3 升 v4，我实际改了哪些东西 - 策略：实战记录
2. Tailwind v4 迁移别只改依赖，这几个旧配置要清掉 - 策略：避坑提醒
3. Vite 项目升级 Tailwind v4：配置、CSS 入口和旧坑 - 策略：干货明确
4. Tailwind v4 没那么难，难的是清理 v3 习惯 - 策略：观点型
5. Tailwind v4 升级后页面变了？先查这几处 - 策略：痛点共鸣

## 配图指导

### 封面图

- 推荐比例：公众号封面 2.35:1
- 视觉风格：深色代码编辑器背景，画面干净一点，不要太多装饰；左侧是 v3 旧配置文件，右侧是 v4 的 CSS 入口
- 生成 prompt：微信公众号技术文章封面图，横向 2.35:1，深色代码编辑器界面，左侧显示 Tailwind CSS v3 和 tailwind.config.ts，右侧显示 Tailwind CSS v4 和 @import "tailwindcss"，中间用简单箭头连接，加入少量 CSS 变量和 Vite 图标元素，现代、克制、清晰，右侧留出标题文字空间

### 正文配图

#### 配图1（位置：第一节后）

- 类型：真实截图
- 作用：让读者看到这次迁移真的发生在项目里，不只是讲概念
- 截图建议：截 `packages/web/src/styles.css`，画面里保留 `@import "tailwindcss";` 和 `@theme` 这一段。编辑器主题用深色或浅色都可以，代码区域尽量干净，别露出无关侧边栏和隐私路径。
- 配文建议：把原来的主题 token 从 `tailwind.config.ts` 挪到 CSS 入口以后，v4 的写法就很清楚了。

#### 配图2（位置：第二节后）

- 类型：真实截图
- 作用：展示 Vite 项目里 Tailwind v4 的接入点
- 截图建议：截 `packages/web/vite.config.ts`，重点露出 `import tailwindcss from "@tailwindcss/vite";` 和 `plugins: [tailwindcss(), react()]`。如果能用红框或浅色高亮标一下这两处，会更容易读。
- 配文建议：Vite 项目不用继续绕 PostCSS，直接把 Tailwind v4 插件放进 Vite 插件数组。

#### 配图3（位置：升级后别只看构建一节后）

- 类型：真实项目截图
- 作用：提醒读者构建通过以后还要看界面
- 截图建议：运行项目后截 Airelia 首页，重点保留状态卡片、Agent Echo 表单和 Runtime Details 区域。这个截图适合放在“升级后别只看构建”一节后，用来说明 border、shadow、按钮 hover/focus 这类细节要靠眼睛确认。
- 配文建议：构建通过以后，我会打开真实页面看一遍。Tailwind 升级有些问题不会报错，只会体现在边框、间距和交互状态上。

#### 备选插图（如果不方便放真实截图）

- 类型：生成插图
- 作用：替代真实项目截图，适合不想暴露项目界面时使用
- 生成 prompt：开发者在双屏显示器前对比两个网页界面，左屏标注 v3，右屏标注 v4，按钮、卡片、边框细节被圈出，现代办公场景，扁平插画风格，色彩克制

## 参考资料

- Tailwind CSS 官方文档：Installing with Vite  
  https://tailwindcss.com/docs/installation/using-vite
- Tailwind CSS 官方文档：Upgrade guide  
  https://tailwindcss.com/docs/upgrade-guide
- Tailwind CSS 官方文档：Theme variables  
  https://tailwindcss.com/docs/theme
