<template>
  <div class="dashboard-page space-y-5">
    <header class="page-intro workspace-hero" data-spotlight>
      <div class="workspace-pendulum" aria-hidden="true"><span></span><i></i></div>
      <div class="workspace-hero-copy">
        <p class="page-eyebrow"><span class="workspace-eyebrow-line" aria-hidden="true"></span>LUXURYIMAGE / OVERVIEW</p>
        <h1>工作空间概览<span class="workspace-title-dot" aria-hidden="true">.</span></h1>
        <p><TypewriterText text="把创作交给灵感，把运行状态尽收眼底。" /></p>
        <div class="workspace-hero-caption"><span>账号资源</span><span>调用趋势</span><span>运行状态</span></div>
        <div class="workspace-reveal-note"><i aria-hidden="true"></i> 灵感有序，创作自由。</div>
      </div>
      <div class="workspace-orbit" aria-hidden="true">
        <i></i><i></i><i></i>
        <div class="workspace-orbit-core"><img src="/logo.svg" alt="" /></div>
        <span>CREATIVE OPERATIONS</span>
      </div>
    </header>
    <PageLoadingState
      v-if="!dashboardDataReady && !dashboardLoadError"
      title="正在加载概览"
      description="读取最新账号和调用数据。"
    />

    <StateBlock
      v-else-if="!dashboardDataReady"
      title="概览加载失败"
      :description="dashboardLoadError"
    >
      <Button size="sm" variant="outline" root-class="mt-4" @click="retryDashboard">
        重新加载
      </Button>
    </StateBlock>

    <template v-else>
    <div
      v-if="dashboardDataWarning"
      class="flex items-center gap-2 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/70 dark:bg-amber-950/30 dark:text-amber-200"
      role="status"
    >
      <Icon icon="lucide:triangle-alert" class="h-4 w-4 shrink-0" />
      <span>{{ dashboardDataWarning }}</span>
    </div>

    <section
      aria-label="账号概览"
      class="motion-stagger grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
    >
      <StatCard
        v-for="stat in accountStats"
        :key="stat.label"
        animate
        data-tilt
        :label="stat.label"
        :value="stat.value"
        :icon="stat.icon"
        :icon-bg="stat.iconBg"
        :icon-color="stat.iconColor"
      />
    </section>

    <section
      aria-label="调用概览"
      class="motion-stagger grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
    >
      <StatCard
        v-for="stat in callStats"
        :key="stat.label"
        animate
        data-tilt
        :label="stat.label"
        :value="stat.value"
        :icon="stat.icon"
        :icon-tone="stat.iconTone"
      />
    </section>

    <section>
      <PagePanel class="!rounded-xl">
        <PanelHeader title="运行环境" align="start" />

        <div class="mt-4 grid min-w-0 gap-5 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.4fr)]">
          <section class="min-w-0 xl:h-full" aria-label="资源占用">
            <div class="grid grid-cols-2 gap-x-5 gap-y-5 xl:h-full xl:grid-rows-2 xl:gap-y-0">
              <div
                v-for="metric in runtimeResourceMetrics"
                :key="metric.label"
                class="min-w-0 xl:flex xl:flex-col xl:justify-center"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="flex min-w-0 items-center gap-2">
                    <Icon :icon="metric.icon" class="h-4 w-4 shrink-0" :class="metric.iconClass" aria-hidden="true" />
                    <p class="truncate text-sm text-muted-foreground">{{ metric.label }}</p>
                  </div>
                  <p class="shrink-0 text-sm font-semibold tabular-nums text-foreground">{{ metric.value }}</p>
                </div>
                <div
                  class="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted/70"
                  :role="metric.progress === null ? undefined : 'progressbar'"
                  :aria-label="metric.progress === null ? undefined : `${metric.label}占用率`"
                  :aria-valuenow="metric.progress === null ? undefined : metric.progress"
                  :aria-valuemin="metric.progress === null ? undefined : 0"
                  :aria-valuemax="metric.progress === null ? undefined : 100"
                >
                  <span
                    v-if="metric.progress !== null"
                    class="block h-full rounded-full bg-current transition-[width] duration-500"
                    :class="metric.progressClass"
                    :style="{ width: `${metric.progress}%` }"
                  ></span>
                </div>
              </div>
            </div>
          </section>

          <section
            class="min-w-0 border-t border-border/60 pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0"
            aria-label="运行信息"
          >
            <dl class="grid min-w-0 grid-cols-1 gap-x-6 sm:grid-cols-2">
              <div
                v-for="detail in runtimeDetails"
                :key="detail.label"
                class="flex min-w-0 items-center justify-between gap-3 border-b border-border/50 py-2 first:pt-0 sm:[&:nth-child(2)]:pt-0"
              >
                <dt class="flex min-w-0 shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <Icon :icon="detail.icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span class="truncate">{{ detail.label }}</span>
                </dt>
                <dd class="min-w-0 truncate text-right text-sm font-medium tabular-nums" :title="detail.value">{{ detail.value }}</dd>
              </div>
            </dl>
          </section>
        </div>
      </PagePanel>
    </section>

    <section class="grid grid-cols-1 gap-4">
      <ChartCard title="模型请求分布">
        <template #title-extra>
          <HelpTip text="仅统计成功及部分成功请求。" />
        </template>
        <template #actions>
          <TimeRangeTabs v-model="modelTimeRange" aria-label="模型请求分布时间范围" />
        </template>
        <div ref="modelChartRef" class="h-72 w-full px-2"></div>
      </ChartCard>
    </section>

    <section class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="调用结果趋势">
        <template #actions>
          <TimeRangeTabs v-model="trendTimeRange" aria-label="调用结果趋势时间范围" />
        </template>
        <div ref="trendChartRef" class="h-56 w-full"></div>
      </ChartCard>

      <ChartCard title="调用活跃度">
        <template #actions>
          <TimeRangeTabs v-model="activityTimeRange" aria-label="调用活跃度时间范围" />
        </template>
        <div class="flex h-56 items-center px-1">
          <div
            v-if="activityHasData"
            class="mx-auto flex w-full flex-col gap-4"
            :style="{ maxWidth: activityGridMaxWidth }"
          >
            <div
              :key="`${activityAnimationEpoch}-${activityTimeRange}`"
              class="grid gap-1.5"
              :style="{ gridTemplateColumns: `repeat(${activityColumnCount}, minmax(0, 1fr))` }"
            >
              <span
                v-for="(bucket, index) in activityBuckets"
                :key="`${activityAnimationEpoch}-${activityTimeRange}-${bucket.start_at}`"
                class="dashboard-activity-cell grid min-w-0"
                :style="{ animationDelay: `${Math.min(index * 2, 32)}ms` }"
              >
                <HoverCard card-class="w-52" :offset="8" focusable>
                  <span
                    class="dashboard-activity-cell-trigger block aspect-square w-full min-w-0 rounded-[3px] border border-transparent transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                    :class="activityCellClass(bucket.total_calls)"
                    role="img"
                    :aria-label="activityTooltip(bucket)"
                  ></span>
                  <template #content>
                    <div class="mb-2 text-xs font-semibold text-foreground">{{ bucket.label }}</div>
                    <div class="grid gap-1.5 text-xs">
                      <div
                        v-for="item in activityTooltipItems(bucket)"
                        :key="item.label"
                        class="flex items-center justify-between gap-4"
                      >
                        <span class="inline-flex items-center gap-1.5 text-muted-foreground">
                          <span class="h-2 w-2 rounded-full" :class="item.markerClass"></span>
                          {{ item.label }}
                        </span>
                        <span class="font-semibold text-foreground">{{ item.value }}</span>
                      </div>
                    </div>
                  </template>
                </HoverCard>
              </span>
            </div>
            <div class="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{{ activityBuckets[0]?.label || '--' }}</span>
              <span class="flex items-center gap-1.5">
                <span>少</span>
                <span class="h-2.5 w-2.5 rounded-[2px] bg-muted/60"></span>
                <span class="h-2.5 w-2.5 rounded-[2px] bg-emerald-100 dark:bg-emerald-950/70"></span>
                <span class="h-2.5 w-2.5 rounded-[2px] bg-emerald-200 dark:bg-emerald-900/70"></span>
                <span class="h-2.5 w-2.5 rounded-[2px] bg-emerald-400 dark:bg-emerald-700"></span>
                <span class="h-2.5 w-2.5 rounded-[2px] bg-emerald-600 dark:bg-emerald-500"></span>
                <span>多</span>
              </span>
              <span>{{ activityBuckets[activityBuckets.length - 1]?.label || '--' }}</span>
            </div>
          </div>
          <p v-else class="w-full text-center text-sm text-muted-foreground" role="status">
            当前范围内暂无可统计请求
          </p>
        </div>
      </ChartCard>

      <ChartCard title="成功耗时趋势">
        <template #actions>
          <TimeRangeTabs v-model="responseTimeTimeRange" aria-label="成功耗时趋势时间范围" />
        </template>
        <div ref="responseTimeChartRef" class="h-56 w-full"></div>
      </ChartCard>

      <ChartCard title="模型耗时">
        <template #actions>
          <TimeRangeTabs v-model="modelResponseTimeTimeRange" aria-label="模型耗时时间范围" />
        </template>
        <div ref="modelResponseTimeChartRef" class="h-56 w-full"></div>
      </ChartCard>
    </section>

    </template>
  </div>
</template>

<script setup lang="ts">
import TypewriterText from '@/components/ui/TypewriterText.vue'
import { computed } from 'vue'
import { Button, ChartCard, HelpTip, HoverCard, StatCard } from '@/components/ui'
import { Icon } from '@iconify/vue'
import PageLoadingState from '@/components/ai/PageLoadingState.vue'
import PagePanel from '@/components/ai/PagePanel.vue'
import PanelHeader from '@/components/ai/PanelHeader.vue'
import StateBlock from '@/components/ai/StateBlock.vue'
import TimeRangeTabs from '@/components/ai/TimeRangeTabs.vue'
import { formatRequestDuration } from '@/lib/requestDuration'
import type { DashboardBucket } from '@/types/api'
import { useDashboardPage } from './dashboard/useDashboardPage'

defineOptions({ name: 'Dashboard' })

const {
  stats: accountStats,
  dashboardRanges,
  dashboardRuntime,
  dashboardOperations,
  dashboardDataReady,
  dashboardLoadError,
  dashboardDataWarning,
  dashboardVersion,
  retryDashboard,
  modelTimeRange,
  trendTimeRange,
  activityTimeRange,
  activityAnimationEpoch,
  responseTimeTimeRange,
  modelResponseTimeTimeRange,
  activityBuckets,
  activityHasData,
  trendChartRef,
  responseTimeChartRef,
  modelResponseTimeChartRef,
  modelChartRef,
} = useDashboardPage()

const callStats = computed(() => {
  const range = dashboardRanges.value?.['24h']
  const totals = range?.totals
  const switching = range?.switching
  return [
    {
      label: '当前并发',
      value: formatCount(dashboardOperations.value?.active_requests),
      icon: 'lucide:layers-3',
      iconTone: 'info' as const,
    },
    {
      label: '总调用量',
      value: formatCount(totals?.total),
      icon: 'lucide:messages-square',
      iconTone: 'neutral' as const,
    },
    {
      label: '成功率',
      value: formatPercent(totals?.success_rate),
      icon: 'lucide:circle-check',
      iconTone: 'success' as const,
    },
    {
      label: '平均成功耗时',
      value: formatRequestDuration(totals?.avg_success_duration_ms) || '--',
      icon: 'lucide:timer',
      iconTone: 'info' as const,
    },
    {
      label: '触发切号',
      value: formatCount(switching?.requests),
      icon: 'lucide:repeat-2',
      iconTone: 'warning' as const,
    },
    {
      label: '切换恢复率',
      value: formatPercent(switching?.recovery_rate),
      icon: 'lucide:shield-check',
      iconTone: 'success' as const,
    },
  ]
})

const activityMaxCalls = computed(() => Math.max(
  0,
  ...activityBuckets.value.map((bucket) => bucket.total_calls),
))
const activityColumnCount = computed(() => {
  if (activityTimeRange.value === '24h') return 12
  if (activityTimeRange.value === '7d') return 7
  return 10
})
const activityGridMaxWidth = computed(() => {
  const columnCount = activityColumnCount.value
  const cellWidthRem = activityTimeRange.value === '7d' ? 5.5 : 3.5
  const gapWidthRem = 0.375
  return `${columnCount * cellWidthRem + (columnCount - 1) * gapWidthRem}rem`
})

const runtimeResourceMetrics = computed(() => {
  const runtime = dashboardRuntime.value
  return [
    {
      label: '应用 CPU',
      value: formatPercent(runtime?.process_cpu_percent),
      icon: 'lucide:cpu',
      iconClass: 'text-primary',
      progress: runtime?.process_cpu_percent ?? null,
      progressClass: 'text-primary',
    },
    {
      label: '应用内存',
      value: formatBytes(runtime?.process_memory_bytes),
      icon: 'lucide:memory-stick',
      iconClass: 'text-primary',
      progress: runtime?.process_memory_percent ?? null,
      progressClass: 'text-primary',
    },
    {
      label: memoryScopeLabel(runtime?.memory_scope),
      value: formatPercent(runtime?.memory_percent),
      icon: 'lucide:memory-stick',
      iconClass: 'text-primary',
      progress: runtime?.memory_percent ?? null,
      progressClass: 'text-primary',
    },
    {
      label: '数据盘',
      value: formatPercent(runtime?.storage_percent),
      icon: 'lucide:hard-drive',
      iconClass: 'text-muted-foreground',
      progress: runtime?.storage_percent ?? null,
      progressClass: 'text-slate-500 dark:text-slate-400',
    },
  ]
})

const runtimeDetails = computed(() => {
  const runtime = dashboardRuntime.value
  return [
    {
      label: '运行方式',
      value: runtime
        ? runtime.runtime_mode === 'docker'
          ? 'Docker'
          : `Python ${runtime.python_version}`
        : '--',
      icon: 'lucide:server-cog',
    },
    { label: '应用版本', value: dashboardVersion.value, icon: 'lucide:tag' },
    {
      label: '实例名称',
      value: runtime?.instance_name || '--',
      icon: 'lucide:hard-drive',
    },
    {
      label: '系统发行版',
      value: runtime?.distribution || '--',
      icon: 'lucide:binary',
    },
    {
      label: '内核 / 架构',
      value: runtime ? `${runtime.kernel_version} / ${runtime.architecture}` : '--',
      icon: 'lucide:binary',
    },
    {
      label: 'CPU 容量',
      value: formatCpuCapacity(runtime?.cpu_capacity),
      icon: 'lucide:cpu',
    },
    {
      label: '服务启动',
      value: formatDateTime(runtime?.service_started_at),
      icon: 'lucide:clock-3',
    },
    {
      label: '入站速率',
      value: formatRate(runtime?.network_rx_bytes_per_sec),
      icon: 'lucide:arrow-down-to-line',
    },
    {
      label: '服务运行',
      value: formatUptime(runtime?.service_uptime_seconds),
      icon: 'lucide:timer',
    },
    {
      label: '出站速率',
      value: formatRate(runtime?.network_tx_bytes_per_sec),
      icon: 'lucide:arrow-up-from-line',
    },
  ]
})

function formatCount(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--'
  return Math.max(0, Math.trunc(value)).toLocaleString('zh-CN')
}

function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined ? '--' : `${value.toFixed(1)}%`
}

function formatBytes(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--'
  if (value < 1_024) return `${Math.round(value)} B`
  if (value < 1_024 ** 2) return `${(value / 1_024).toFixed(1)} KB`
  if (value < 1_024 ** 3) return `${(value / 1_024 ** 2).toFixed(1)} MB`
  if (value < 1_024 ** 4) return `${(value / 1_024 ** 3).toFixed(1)} GB`
  return `${(value / 1_024 ** 4).toFixed(1)} TB`
}

function formatRate(value: number | null | undefined) {
  if (value === null || value === undefined) return '--'
  if (value < 1_000) return `${Math.round(value)} B/s`
  if (value < 1_000_000) return `${(value / 1_000).toFixed(1)} KB/s`
  return `${(value / 1_000_000).toFixed(1)} MB/s`
}

function formatCpuCapacity(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return '--'
  const digits = Number.isInteger(value) ? 0 : 2
  return `${value.toLocaleString('zh-CN', { maximumFractionDigits: digits })} 核`
}

function memoryScopeLabel(scope: 'container' | 'system' | 'visible' | undefined) {
  if (scope === 'container') return '容器内存'
  if (scope === 'system') return '系统内存'
  return '可见内存'
}

function formatUptime(value: number | null | undefined) {
  if (value === null || value === undefined) return '--'
  const seconds = Math.max(0, Math.trunc(value))
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  if (days > 0) return `${days}天 ${hours}小时`
  if (hours > 0) return `${hours}小时 ${minutes}分`
  return `${minutes}分`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '--'
  return value.replace('T', ' ').replace(/([+-]\d\d:\d\d|Z)$/, '')
}

function activityCellClass(value: number) {
  const maximum = activityMaxCalls.value
  if (value <= 0 || maximum <= 0) return 'bg-muted/60'
  const ratio = Math.log1p(value) / Math.log1p(maximum)
  if (ratio <= 0.25) return 'bg-emerald-100 dark:bg-emerald-950/70'
  if (ratio <= 0.5) return 'bg-emerald-200 dark:bg-emerald-900/70'
  if (ratio <= 0.75) return 'bg-emerald-400 dark:bg-emerald-700'
  return 'bg-emerald-600 dark:bg-emerald-500'
}

function activityTooltip(bucket: DashboardBucket) {
  return `${bucket.label} · 调用 ${formatCount(bucket.total_calls)} · 成功 ${formatCount(bucket.success_calls)} · 失败 ${formatCount(bucket.final_failed_calls)} · 成功率 ${formatPercent(bucket.success_rate)}`
}

function activityTooltipItems(bucket: DashboardBucket) {
  return [
    {
      label: '调用',
      value: formatCount(bucket.total_calls),
      markerClass: 'bg-slate-500 dark:bg-slate-400',
    },
    {
      label: '成功',
      value: formatCount(bucket.success_calls),
      markerClass: 'bg-emerald-500',
    },
    {
      label: '失败',
      value: formatCount(bucket.final_failed_calls),
      markerClass: 'bg-rose-500',
    },
    {
      label: '成功率',
      value: formatPercent(bucket.success_rate),
      markerClass: 'bg-amber-500',
    },
  ]
}

</script>

<style scoped>
.workspace-hero {
  --workspace-hero-bg: #edf1fc;
  --workspace-hero-text: #202c49;
  --workspace-hero-muted: #536885;
  --workspace-hero-accent: hsl(176 55% 24%);
  --workspace-hero-divider: hsl(222 22% 15% / 0.2);
  --workspace-hero-note: rgb(255 255 255 / 0.35);
  --workspace-hero-glow: 0.35;
  position: relative;
  isolation: isolate;
  min-height: 216px;
  overflow: hidden;
  padding: 30px 36px;
  border: 1px solid rgb(173 193 255 / 0.18);
  border-radius: 14px;
  background: var(--workspace-hero-bg);
  box-shadow: 0 12px 30px -16px rgb(21 38 82 / 0.38);
}

html[data-theme="dark"] .workspace-hero {
  --workspace-hero-bg: #121c34;
  --workspace-hero-text: #f3f6ff;
  --workspace-hero-muted: #a6b6d0;
  --workspace-hero-accent: hsl(171 53% 73%);
  --workspace-hero-divider: hsl(222 25% 94% / 0.2);
  --workspace-hero-note: hsl(224 25% 11% / 0.35);
  --workspace-hero-glow: 1;
}

.workspace-hero::before { content: ''; position: absolute; z-index: -1; inset: -40%; background: radial-gradient(ellipse at 72% 42%, rgb(45 188 190 / 0.38), transparent 26%), radial-gradient(ellipse at 53% 58%, rgb(103 73 212 / 0.46), transparent 36%); transform: rotate(-12deg); opacity: var(--workspace-hero-glow); }
.workspace-hero-copy { z-index: 1; }
.workspace-hero .page-eyebrow { display: flex; align-items: center; gap: 9px; margin-bottom: 18px; color: var(--workspace-hero-muted); font-size: 9px; letter-spacing: 0.19em; }
.workspace-eyebrow-line { width: 22px; height: 1px; background: var(--workspace-hero-accent); }
.workspace-hero h1 { color: var(--workspace-hero-text); font-size: clamp(24px, 2.6vw, 36px); letter-spacing: -0.06em; font-weight: 600; }
.workspace-title-dot { color: var(--workspace-hero-accent); margin-left: 5px; }
.workspace-hero h1 + p { color: var(--workspace-hero-muted); font-size: 12px; margin-top: 12px; }
.workspace-hero-caption { display: flex; gap: 16px; margin-top: 22px; color: var(--workspace-hero-muted); font-size: 10px; }
.workspace-hero-caption span + span { border-left: 1px solid var(--workspace-hero-divider); padding-left: 16px; }
.workspace-orbit { position: relative; width: 260px; height: 156px; flex-shrink: 0; display: grid; place-items: center; }
.workspace-orbit > i { position: absolute; width: 210px; height: 94px; border: 1px solid rgb(161 213 235 / 0.26); border-radius: 50%; transform: rotate(-25deg); }
.workspace-orbit > i:nth-child(2) { transform: rotate(35deg); width: 184px; height: 120px; border-color: rgb(168 166 255 / 0.4); }
.workspace-orbit > i:nth-child(3) { transform: rotate(95deg); width: 184px; height: 120px; border-color: rgb(100 223 211 / 0.35); }
.workspace-orbit-core { display: grid; place-items: center; width: 68px; height: 68px; border-radius: 18px; transform: rotate(-10deg); background: rgb(210 223 255 / 0.08); border: 1px solid rgb(226 238 255 / 0.25); box-shadow: 0 0 54px rgb(133 148 255 / 0.2); backdrop-filter: blur(8px); }
.workspace-orbit-core img { width: 40px; height: 40px; transform: rotate(10deg); }
.workspace-orbit > span { position: absolute; bottom: -10px; color: var(--workspace-hero-muted); font-size: 8px; letter-spacing: 0.23em; }

.workspace-pendulum { position: absolute; top: 0; left: 20px; width: 14px; height: 35px; transform-origin: top center; pointer-events: none; }
.workspace-pendulum span { display: block; width: 1px; height: 24px; margin: auto; background: var(--workspace-hero-muted); opacity: 0.5; }
.workspace-pendulum i { display: block; width: 10px; height: 10px; margin: auto; border-radius: 3px; background: var(--workspace-hero-accent); box-shadow: 0 0 12px color-mix(in srgb, var(--workspace-hero-accent) 18%, transparent); }
@keyframes workspace-swing { 0%, 100% { transform: rotate(24deg); } 50% { transform: rotate(-24deg); } }
.workspace-reveal-note { display: inline-flex; align-items: center; gap: 8px; margin-top: 16px; padding: 6px 10px; border-radius: 6px; background: var(--workspace-hero-note); color: var(--workspace-hero-muted); font-size: 10px; }
.workspace-reveal-note > i { width: 5px; height: 5px; border-radius: 50%; background: var(--workspace-hero-accent); }
@keyframes workspace-wipe { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }

.workspace-hero::after,
.dashboard-page :deep(.lux-stat-card[data-tilt]::after) {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(280px circle at var(--light-x, 50%) var(--light-y, 50%), rgb(120 148 255 / 0.1), transparent 75%);
  opacity: 0;
  pointer-events: none;
  content: '';
  transition: opacity var(--motion-base);
}

.workspace-hero[data-lit]::after,
.dashboard-page :deep(.lux-stat-card[data-tilt][data-lit]::after) {
  opacity: 1;
}

.dashboard-page :deep(.lux-stat-card[data-tilt]) {
  position: relative;
  border-radius: 14px;
  border-color: hsl(var(--border) / 0.8);
  box-shadow: var(--shadow-soft);
  transition: border-color var(--motion-base), box-shadow var(--motion-base);
}

.dashboard-page :deep(.lux-stat-card[data-tilt]:hover) {
  border-color: hsl(var(--primary) / 0.2);
  box-shadow: var(--shadow-floating);
}

.dashboard-page :deep(.lux-stat-label) {
  font-size: 12px;
  font-weight: 500;
}

.dashboard-page :deep(.lux-stat-icon) {
  width: 30px;
  height: 30px;
  border-radius: 9px;
}

.dashboard-page :deep(.lux-stat-value),
.dashboard-page :deep(.lux-stat-card .el-statistic__content) {
  font-size: 27px;
  font-weight: 550;
  letter-spacing: -0.045em;
}

.dashboard-page :deep(.lux-chart-card) {
  --el-card-border-radius: 16px;
  box-shadow: var(--shadow-soft);
}

@media (prefers-reduced-motion: no-preference) {
  .workspace-pendulum { animation: workspace-swing 1.6s ease-in-out infinite; }
  .workspace-reveal-note { animation: workspace-wipe 1100ms var(--ease-spring) 400ms both; }
  .workspace-orbit > i { animation: orbit-arrive 1100ms var(--ease-spring) both; }
  .workspace-orbit > i:nth-child(2) { animation-delay: 90ms; }
  .workspace-orbit > i:nth-child(3) { animation-delay: 180ms; }
}

@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .workspace-hero::before { animation: workspace-aurora 16s ease-in-out 2 alternate; }

  .dashboard-page :deep(.lux-stat-card[data-tilt]) {
    transform: perspective(800px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
    transition: transform 280ms var(--ease-spring), box-shadow 220ms, border-color 220ms;
  }

  .dashboard-page :deep(.lux-stat-card[data-tilt][data-lit]) {
    z-index: 1;
    transition: transform 100ms linear, box-shadow 220ms, border-color 220ms;
  }
}

@keyframes workspace-aurora { to { transform: translate(4%, -3%) rotate(8deg); } }
@keyframes orbit-arrive { from { opacity: 0; scale: 0.85; } to { opacity: 1; scale: 1; } }

@media (max-width: 767px) {
  .workspace-hero { min-height: 185px; padding: 24px; border-radius: 10px; }
  .workspace-orbit { display: none; }
  .workspace-hero-caption { gap: 12px; }
  .workspace-hero-caption span + span { padding-left: 12px; }
}

.dashboard-activity-cell {
  animation: dashboard-activity-cell-enter 180ms ease-out both;
}

@keyframes dashboard-activity-cell-enter {
  from {
    opacity: 0.35;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-activity-cell,
  .dashboard-activity-cell-trigger {
    animation: none;
    transition: none;
  }

  .dashboard-activity-cell-trigger:hover {
    transform: none;
  }
}
</style>
