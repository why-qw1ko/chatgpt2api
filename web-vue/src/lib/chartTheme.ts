/**
 * ECharts 统一主题配置
 * 基于项目的设计系统，提供一致的图表样式
 */
// 主题色板
export const chartColors = {
  primary: '#149dff',
  success: '#1f9d72',
  warning: '#e09b2d',
  danger: '#e23d5c',
  info: '#4f9cf0',
  purple: '#7b7ff0',
  pink: '#ef7eb3',
  slate: '#5b7c90',
  gray: '#8fa3b3',
  lightGreen: '#7bc47f',
  cyan: '#3cb8c9',
  emerald: '#2fb49a',
}

// 模型图表专用色板，保持明亮、干净、稳定。
export const modelColorPalette = [
  '#149dff',
  '#ffb375',
  '#1f9d72',
  '#7b7ff0',
  '#3cb8c9',
  '#ef7eb3',
  '#e09b2d',
  '#5b7c90',
  '#b9e56a',
  '#8d6cf0',
]

// 当前实际模型显式绑定，避免主力模型在不同图表中颜色漂移。
export const modelColors: Record<string, string> = {
  auto: '#5b7c90',
  'gpt-5.5': modelColorPalette[0],
  'gpt-5-5': modelColorPalette[0],
  'gpt-5-5-thinking': modelColorPalette[9],
  'gpt-5.5-mini': modelColorPalette[6],
  'gpt-5': modelColorPalette[3],
  'gpt-5-1': modelColorPalette[4],
  'gpt-5-2': modelColorPalette[5],
  'gpt-5-3': modelColorPalette[6],
  'gpt-5-3-mini': modelColorPalette[8],
  'gpt-5-mini': modelColorPalette[7],
  'gpt-image-2': modelColorPalette[1],
  'codex-gpt-image-2': modelColorPalette[2],
  'plus-codex-gpt-image-2': modelColorPalette[4],
  'team-codex-gpt-image-2': modelColorPalette[6],
  'pro-codex-gpt-image-2': modelColorPalette[5],
  'gpt-4o': modelColorPalette[7],
  'o3': modelColorPalette[9],
  'gpt-image-1': modelColorPalette[8],
}

const nonModelKeys = new Set([
  '',
  '-',
  'default',
  'unknown',
  'null',
  'none',
  'low',
  'medium',
  'high',
  'standard',
  'hd',
  'portrait',
  'landscape',
  'square',
  'vertical',
  'horizontal',
  'image',
  'images',
  'text',
  'chat',
  'generation',
  'generations',
  'edit',
  'edits',
])

function looksLikeSizeOrRatioLabel(value: string): boolean {
  return /^\d+$/.test(value) || /^\d+k$/i.test(value) || /^\d{1,5}x\d{1,5}$/i.test(value) || /^\d{1,3}:\d{1,3}$/.test(value)
}

function normalizeModelKey(value: string): string {
  return value.trim().toLowerCase()
}

function looksLikeModelLabel(value: string): boolean {
  const key = normalizeModelKey(value)
  if (nonModelKeys.has(key) || key.startsWith('/') || looksLikeSizeOrRatioLabel(key)) return false
  return true
}

function getStablePaletteIndex(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash % modelColorPalette.length
}

// 获取模型颜色：已知模型固定颜色，未知模型按名称稳定映射到 palette，避免全部回退成灰色。
export function getModelColor(model: string): string {
  const key = normalizeModelKey(model)
  if (!key || !looksLikeModelLabel(key)) return chartColors.gray
  return modelColors[key] || modelColorPalette[getStablePaletteIndex(key)]
}

// 过滤有效模型
export function filterValidModels(modelRequests: Record<string, number[]>): Record<string, number[]> {
  const filtered: Record<string, number[]> = {}
  Object.entries(modelRequests || {}).forEach(([model, data]) => {
    if (!Array.isArray(data)) return
    if (looksLikeModelLabel(model)) {
      filtered[model] = data
    }
  })
  return filtered
}

// 文本样式
const textStyle = {
  fontFamily: 'Amiko, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  color: '#5a7180',      // text-muted-foreground
  fontSize: 11,
}

// 网格配置
const gridConfig = {
  left: 24,
  right: 16,
  top: 44,
  bottom: 24,
  containLabel: true,
}

// 工具提示配置
const tooltipConfig = {
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  borderColor: '#e5e5eb',
  borderWidth: 1,
  textStyle: {
    color: '#00141f',
    fontSize: 12,
  },
  padding: [8, 12],
  extraCssText: 'border-radius: 10px; box-shadow: 0 8px 24px rgba(8, 48, 82, 0.12);',
}

// 图例配置
const legendConfig = {
  textStyle: {
    ...textStyle,
    fontSize: 11,
  },
  itemWidth: 14,
  itemHeight: 14,
  itemGap: 16,
}

/**
 * 折线图主题配置
 */
export function getLineChartTheme() {
  return {
    animation: true,
    animationThreshold: 4000,
    animationDuration: 700,
    animationEasing: 'cubicOut',
    animationDurationUpdate: 420,
    animationEasingUpdate: 'cubicOut',
    tooltip: {
      ...tooltipConfig,
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: '#d0d1db',
          type: 'dashed',
        },
      },
    },
    legend: {
      ...legendConfig,
      right: 0,
      top: 0,
    },
    grid: gridConfig,
    xAxis: {
      type: 'category',
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: '#d0d1db',
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        ...textStyle,
        fontSize: 10,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        ...textStyle,
        fontSize: 10,
      },
      splitLine: {
        lineStyle: {
          color: '#e5e5eb',
          type: 'solid',
        },
      },
    },
  }
}

/**
 * 饼图主题配置
 */
export function getPieChartTheme(isMobile = false) {
  const legendPosition = isMobile
    ? {
      left: 'center',
      bottom: 0,
      orient: 'horizontal' as const,
    }
    : {
      left: 0,
      top: 'middle',
      orient: 'vertical' as const,
    }

  const pieCenter = isMobile ? ['50%', '42%'] : ['60%', '50%']
  const pieRadius = isMobile ? ['35%', '55%'] : ['45%', '70%']

  return {
    animation: true,
    animationDuration: 600,
    animationEasing: 'cubicOut',
    animationDurationUpdate: 300,
    animationEasingUpdate: 'cubicOut',
    tooltip: {
      ...tooltipConfig,
      trigger: 'item',
    },
    legend: {
      ...legendConfig,
      ...legendPosition,
      type: isMobile ? 'scroll' : 'plain',
      pageIconSize: 10,
    },
    series: {
      type: 'pie',
      radius: pieRadius,
      center: pieCenter,
      startAngle: 90,
      animationType: 'scale',
      animationEasing: 'cubicOut',
      avoidLabelOverlap: true,
      label: {
        show: true,
        fontSize: 11,
        color: '#656777',
      },
      labelLine: {
        show: true,
        length: 12,
        length2: 10,
        lineStyle: {
          color: '#d0d1db',
        },
      },
      itemStyle: {
        borderWidth: 2,
        borderColor: '#fff',
        borderRadius: 8,
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 13,
          fontWeight: 'bold',
        },
      },
    },
  }
}

/**
 * 创建折线图系列配置
 */
export function createLineSeries(
  name: string,
  data: Array<number | null>,
  color: string,
  options?: {
    smooth?: boolean
    showSymbol?: boolean
    areaOpacity?: number
    lineWidth?: number
    zIndex?: number
    lineStyle?: {
      type?: 'solid' | 'dashed' | 'dotted'
      width?: number
    }
  }
) {
  const {
    smooth = true,
    showSymbol = false,
    areaOpacity = 0.25,
    lineWidth = 2,
    zIndex = 1,
    lineStyle,
  } = options || {}

  return {
    name,
    type: 'line',
    data,
    smooth,
    showSymbol,
    lineStyle: {
      width: lineStyle?.width ?? lineWidth,
      ...(lineStyle?.type && { type: lineStyle.type }),
    },
    areaStyle: {
      opacity: areaOpacity,
    },
    itemStyle: {
      color,
    },
    emphasis: {
      disabled: true,
    },
    z: zIndex,
  }
}

/**
 * 创建饼图数据项配置
 */
export function createPieDataItem(
  name: string,
  value: number,
  color: string
) {
  return {
    name,
    value,
    itemStyle: {
      color,
      borderRadius: 8,
    },
  }
}
