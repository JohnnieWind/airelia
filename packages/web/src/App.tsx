import {
  Bell,
  Bot,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  Code2,
  Coffee,
  Command,
  FileText,
  Folder,
  Gauge,
  Grid2X2,
  Link2,
  MessageCirclePlus,
  Mic,
  MoreHorizontal,
  Palette,
  PanelLeft,
  Plus,
  Rocket,
  Search,
  Send,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
  Workflow
} from "lucide-react";
import { ReactNode } from "react";

const primaryNav = [
  { label: "新建任务", icon: MessageCirclePlus, active: true },
  { label: "助理", icon: Bot },
  { label: "项目", icon: Share2 },
  { label: "专家", icon: BriefcaseBusiness, note: "技能·连接器" },
  { label: "自动化", icon: Workflow },
  { label: "更多", icon: Grid2X2, note: "资料库·灵感" }
];

const recentTasks = [
  "继续完成未完成任务",
  "询问最终裁决结果",
  "了解本地 Agent 能力",
  "我们的团队技术能力需要提...",
  "你是什么模型"
];

const primaryModes = [
  { label: "日常办公", icon: Coffee, active: true },
  { label: "代码开发", icon: Code2 },
  { label: "设计创意", icon: Palette }
];

const secondaryModes = [
  { label: "文档处理", icon: FileText },
  { label: "资料调研", icon: Folder },
  { label: "项目推进", icon: Grid2X2 },
  { label: "更多", icon: MoreHorizontal }
];

const composerTools = [
  { label: "Craft", icon: WandSparkles },
  { label: "Auto", icon: Gauge },
  { label: "技能", icon: Command },
  { label: "默认权限", icon: ShieldCheck }
];

const practiceCards = [
  { title: "工作总结日报", tone: "green" },
  { title: "行业研报精读摘要", tone: "blue" },
  { title: "项目数据分析仪表盘", tone: "violet" }
];

function App() {
  return (
    <main className="h-screen overflow-hidden bg-[#fbfbfa] text-[#191a1d]">
      <div className="grid h-screen grid-cols-[clamp(136px,22.8vw,264px)_minmax(0,1fr)] overflow-hidden">
        <Sidebar />

        <section className="relative flex h-screen min-h-0 flex-col overflow-hidden px-4 py-3 sm:px-6 lg:px-5 2xl:px-7">
          <div className="flex justify-start lg:justify-end">
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#e8e8e6] bg-white px-2.5 pr-3 text-[13px] font-bold shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition hover:border-[#d7d7d4]"
              type="button"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#18c89a] text-white">
                <Rocket className="h-3.5 w-3.5" />
              </span>
              本地 Agent 已连接
              <ChevronRight className="h-3.5 w-3.5 text-[#77787c]" />
            </button>
          </div>

          <section
            className="mx-auto flex min-h-0 w-full max-w-[690px] flex-1 flex-col justify-start pb-3 pt-[clamp(24px,6.6vh,52px)] sm:max-w-[750px] lg:max-w-[750px]"
            data-testid="workbench-grid"
          >
            <div className="min-w-0">
              <h1 className="mb-[22px] text-[clamp(22px,3.1vw,36px)] font-extrabold leading-[1.12] tracking-normal">
                Airelia
                <br />
                你的桌面智能工作台
              </h1>

              <div className="mb-4 flex w-max max-w-full flex-wrap gap-0 overflow-hidden rounded-[9px] bg-[#eeeeed] sm:mb-12" data-testid="primary-modes">
                {primaryModes.map((mode) => (
                  <ModeButton key={mode.label} {...mode} textSizeClass="text-[13px]" />
                ))}
              </div>

              <div className="mb-3 flex flex-wrap gap-2 sm:mb-4" data-testid="secondary-modes">
                {secondaryModes.map((mode) => (
                  <ModeButton key={mode.label} {...mode} secondary textSizeClass={mode.label === "更多" ? "text-xs" : "text-[13px]"} />
                ))}
              </div>

              <Composer />
            </div>

            <PracticeExamples />
          </section>
        </section>
      </div>
    </main>
  );
}

function Sidebar() {
  return (
    <aside className="grid h-screen min-h-0 grid-rows-[auto_auto_auto_1fr_auto] gap-3.5 overflow-hidden bg-[#eeeeee] px-1.5 py-3.5 sm:gap-[18px] sm:px-2.5 sm:py-5 lg:gap-[18px] lg:px-2.5 lg:py-5">
      <div className="flex items-center justify-between text-[#424346]">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2.5 sm:gap-5 lg:gap-6">
          <IconButton label="切换侧栏">
            <PanelLeft className="h-5 w-5" />
          </IconButton>
          <IconButton label="搜索">
            <Search className="h-5 w-5" />
          </IconButton>
          <IconButton label="筛选">
            <SlidersHorizontal className="h-5 w-5" />
          </IconButton>
        </div>
      </div>

      <div className="flex items-baseline gap-2 text-xs font-bold text-[#b1b2b5] sm:text-[13px]">
        <span>Airelia</span>
        <span className="text-[11px] text-[#c5c6c8]">v0.1.0</span>
      </div>

      <nav aria-label="主导航" className="grid gap-px">
        {primaryNav.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              aria-current={item.active ? "page" : undefined}
              className={`grid min-h-7 grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-1 text-left text-[9px] font-medium leading-none transition ${
                item.active ? "bg-[#e2e2e1] text-[#1c1d20]" : "text-[#55565a] hover:bg-[#e7e7e5]"
              }`}
              type="button"
            >
              <Icon className="h-[13px] w-[13px]" />
              <span className="text-[14px] font-normal leading-none" data-testid="primary-nav-label">
                {item.label}
              </span>
              {item.note ? <span className="text-[14px] font-normal leading-none text-[#b0b1b4]">{item.note}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className="grid content-start gap-4 overflow-hidden sm:gap-6">
        <section aria-labelledby="recent-tasks-title" className="grid gap-2 sm:gap-2.5">
          <div id="recent-tasks-title" className="flex items-center gap-1.5 text-xs font-bold text-[#a0a1a4] sm:text-xs">
            任务 (5)
            <ChevronDown className="h-4 w-4" />
          </div>
          <div className="grid gap-0">
            {recentTasks.map((task) => (
              <button
                key={task}
                className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-0 rounded-lg px-1 py-1 text-left leading-tight text-[#292a2d] transition hover:bg-[#e7e7e5]"
                type="button"
              >
                <span className="truncate text-[12px]" data-testid="recent-task-title">
                  {task}
                </span>
                <span className="min-w-11 text-right text-[12px] text-[#a3a4a7]">2天前</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="spaces-title" className="grid gap-2 sm:gap-2.5">
          <div id="spaces-title" className="flex items-center gap-1.5 text-xs font-bold text-[#a0a1a4] sm:text-xs">
            空间 (1)
            <ChevronDown className="h-4 w-4" />
          </div>
          <button className="flex items-center gap-1.5 text-left text-[11px] text-[#2c2d30] sm:gap-2 sm:text-xs" type="button">
            <Share2 className="h-4 w-4" />
            <span className="text-[11px] text-[#2c2d30] sm:text-xs" data-testid="space-guide-label">
              项目新手指引
            </span>
            <ChevronDown className="h-4 w-4 text-[#8c8d91]" />
          </button>
          <div className="grid grid-cols-[1fr_auto] items-center gap-1.5 pl-5 text-[11px] text-[#2c2d30] sm:gap-2 sm:pl-7 sm:text-xs">
            <span className="text-[11px] text-[#2c2d30] sm:text-xs">生成项目功能介绍</span>
            <span className="min-w-11 text-right text-[#a3a4a7]">2天前</span>
          </div>
        </section>
      </div>

      <footer className="flex items-center justify-between text-[11px] font-bold text-[#4f5054] sm:text-xs">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,#18c89a,#33d4ff)] text-white shadow-[inset_0_-4px_10px_rgba(0,0,0,0.12)] sm:h-8 sm:w-8">
            A
          </span>
          <span>借力好风</span>
        </div>
        <div className="flex items-center gap-4 text-[#55565a]">
          <Bell className="h-4 w-4" />
          <Link2 className="h-4 w-4" />
        </div>
      </footer>
    </aside>
  );
}

function Composer() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute right-6 top-[-70px] hidden h-[82px] w-[104px] overflow-hidden sm:block">
        <span className="absolute left-11 top-1 flex h-5 w-5 items-center justify-center rounded-full border-[3px] border-white bg-[#18c89a] shadow-[0_8px_22px_rgba(24,200,154,0.35)]">
          <Sparkles className="h-3 w-3 text-white" />
        </span>
        <span className="absolute left-3 top-10 h-[76px] w-[76px] rounded-[28px] bg-[radial-gradient(circle_at_50%_52%,#32ffe0_0_4%,transparent_5%),radial-gradient(circle_at_38%_48%,#28f2d3_0_4%,transparent_5%),linear-gradient(180deg,#31343a,#0e1118)] shadow-[0_10px_24px_rgba(0,0,0,0.18)]" />
      </div>

      <section className="overflow-hidden rounded-[15px] border border-[#dddddb] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.045)]">
        <textarea
          aria-label="任务指令"
          className="min-h-[56px] w-full resize-none bg-white px-3.5 py-3 text-xs text-[#191a1d] outline-none placeholder:text-[#a2a3a6] sm:min-h-16 sm:px-5 sm:py-3.5 sm:text-sm"
          placeholder="今天帮你做些什么？ @ 引用对话文件，/ 调用技能与指令"
        />

        <div className="flex flex-col gap-2 px-3.5 pb-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] font-semibold text-[#4e4f53] sm:gap-x-3.5 sm:gap-y-2 sm:text-xs">
            {composerTools.map((tool) => {
              const Icon = tool.icon;

              return (
                <button key={tool.label} className="inline-flex items-center gap-1.5" type="button">
                  <Icon className="h-3.5 w-3.5 sm:h-[15px] sm:w-[15px]" />
                  {tool.label}
                  <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5 text-[#4e4f53] sm:gap-3">
            <IconButton label="添加附件">
              <Plus className="h-4 w-4 sm:h-[19px] sm:w-[19px]" />
            </IconButton>
            <IconButton label="增强提示">
              <Sparkles className="h-4 w-4 sm:h-[19px] sm:w-[19px]" />
            </IconButton>
            <IconButton label="语音输入">
              <Mic className="h-4 w-4 sm:h-[19px] sm:w-[19px]" />
            </IconButton>
            <button
              aria-label="发送任务"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b2b3b6] text-white transition hover:bg-[#97989b] sm:h-8 sm:w-8"
              type="button"
            >
              <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>

        <button
          className="flex h-[34px] w-full items-center gap-2 border-t border-[#f0f0ef] bg-[#f5f5f4] px-4 text-left text-[10px] font-semibold text-[#77787c] sm:h-9 sm:px-6"
          type="button"
        >
          <Folder className="h-4 w-4 sm:h-5 sm:w-5" />
          选择工作空间
          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </section>
    </div>
  );
}

function PracticeExamples() {
  return (
    <section className="mt-[18px] sm:mt-7" aria-labelledby="practice-title">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] font-bold text-[#55565a] sm:mb-3.5 sm:text-xs">
        <h2 id="practice-title" className="text-xs font-bold sm:text-[13px]">
          不知道做什么，试试最佳实践案例
        </h2>
        <button className="inline-flex items-center gap-1" type="button">
          更多
          <ChevronRight className="h-4 w-4 -rotate-45" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        {practiceCards.map((card, index) => (
          <PracticeCard key={card.title} index={index} {...card} />
        ))}
      </div>
    </section>
  );
}

function ModeButton({
  label,
  icon: Icon,
  active = false,
  secondary = false,
  textSizeClass = "text-xs"
}: {
  label: string;
  icon: typeof Coffee;
  active?: boolean;
  secondary?: boolean;
  textSizeClass?: string;
}) {
  const sizingClass = secondary
    ? "sm:min-h-[34px] sm:gap-1.5 sm:px-3"
    : "sm:min-h-[34px] sm:gap-1 sm:px-2";
  const iconClass = secondary ? "h-3.5 w-3.5 sm:h-[15px] sm:w-[15px]" : "h-3.5 w-3.5";

  return (
    <button
      aria-pressed={active}
      className={`inline-flex min-h-8 items-center gap-1.5 px-3 ${textSizeClass} font-bold transition ${sizingClass} ${
        active
          ? "rounded-[10px] bg-[#3f4043] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]"
          : secondary
            ? "rounded-[10px] border border-[#e7e7e5] bg-white text-[#45464a] hover:border-[#d8d8d5]"
            : "text-[#56575a] hover:bg-[#e5e5e3]"
      }`}
      type="button"
    >
      <Icon className={iconClass} />
      {label}
    </button>
  );
}

function PracticeCard({ title, tone, index }: { title: string; tone: string; index: number }) {
  const toneClass =
    tone === "green"
      ? "from-[#e5f7ee] [--accent:#29c178]"
      : tone === "blue"
        ? "from-[#e4f2ff] [--accent:#54a6ff]"
        : "from-[#f0e8ff] [--accent:#8f65ff]";

  return (
    <article
      className={`relative h-[98px] overflow-hidden rounded-[14px] border border-[#e7e7e5] bg-[radial-gradient(circle_at_82%_-18%,rgba(255,255,255,0.8),transparent_34%)] bg-gradient-to-br ${toneClass} to-[#f9faf9] p-2.5 sm:h-[140px] sm:rounded-2xl sm:p-3.5`}
    >
      <h3 className="relative z-10 text-[11px] font-bold tracking-normal sm:text-sm">{title}</h3>
      {index === 2 ? <MiniChart /> : <MiniReport />}
    </article>
  );
}

function MiniReport() {
  return (
    <div className="absolute bottom-[-14px] left-6 right-4 grid h-[88px] rotate-[-4deg] grid-cols-[46px_1fr] gap-2.5 rounded-xl bg-white p-3 shadow-[0_14px_30px_rgba(0,0,0,0.12)] sm:left-6 sm:right-4 sm:h-[92px] sm:grid-cols-[48px_1fr]">
      <div className="rounded-xl bg-[color-mix(in_srgb,var(--accent),white_82%)]" />
      <div className="grid content-start gap-2">
        <div className="h-1.5 rounded-full bg-[color-mix(in_srgb,var(--accent),white_54%)]" />
        <div className="h-1.5 w-[72%] rounded-full bg-[color-mix(in_srgb,var(--accent),white_54%)]" />
        <div className="h-1.5 w-[88%] rounded-full bg-[color-mix(in_srgb,var(--accent),white_54%)]" />
      </div>
    </div>
  );
}

function MiniChart() {
  const bars = [44, 68, 58, 92, 80, 104, 74, 96];

  return (
    <div className="absolute bottom-3 left-4 right-4 grid h-[74px] rotate-[-2deg] grid-cols-8 items-end gap-1.5">
      {bars.map((height) => (
        <div
          key={height}
          className="min-h-[16px] rounded-t-md bg-[color-mix(in_srgb,var(--accent),white_24%)]"
          style={{ height: height * 0.68 }}
        />
      ))}
    </div>
  );
}

function IconButton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <button aria-label={label} className="inline-flex items-center justify-center transition hover:text-[#191a1d]" type="button">
      {children}
    </button>
  );
}

export default App;
