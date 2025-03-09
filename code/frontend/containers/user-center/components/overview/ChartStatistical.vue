<template>
  <div :class="$style['chart-wrapper']">
    <div :class="$style['chart-header']">
      <div :class="$style['chart-count']">
        <div :class="$style['chart-count-item']">
          <div :class="$style['chart-item-label']">总次数</div>
          <div :class="$style['chart-item-value']">
            <a-skeleton-input active v-if="loading" style="width: 100px" />
            <template v-else>
              <span :class="$style['chart-item-num']">{{ countData.total }}</span>
              <span>次</span>
            </template>
          </div>
        </div>
        <div :class="$style['chart-count-item']">
          <div :class="$style['chart-item-label']">{{ rangeLabel[filter.range] }}</div>
          <div :class="$style['chart-item-value']">
            <a-skeleton-input active v-if="loading" style="width: 100px" />
            <template v-else>
              <span :class="$style['chart-item-num']">{{ countData.rangeTotal }}</span>
              <span>次</span>
            </template>
          </div>
        </div>
      </div>
      <div :class="$style['chart-filter']">
        <a-radio-group v-model:value="filter.range" @change="onRangeChange">
          <a-radio-button value="yesterday">昨日</a-radio-button>
          <a-radio-button value="week">本周</a-radio-button>
          <a-radio-button value="month">本月</a-radio-button>
        </a-radio-group>
      </div>
    </div>
    <div ref="chartRef" :class="$style['chart-content']">
      <a-skeleton-input active style="height: 100%; width: 100%"></a-skeleton-input>
    </div>
  </div>
</template>
<script lang="ts" setup>
import * as echarts from 'echarts/core'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent
} from 'echarts/components'
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { getChatChart } from '~/api'
import dayjs from 'dayjs'

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
  LineChart
])

const rangeMap = {
  yesterday: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')],
  week: [dayjs().startOf('week'), dayjs().endOf('day')],
  month: [dayjs().startOf('month'), dayjs().endOf('day')]
}

const rangeLabel = {
  yesterday: '昨日',
  week: '本周',
  month: '本月'
}

const countData = ref({ total: 0, rangeTotal: 0 })
const filter = ref({ range: 'week' })
const chartRef = ref()
const chartInstance = shallowRef()
const resizeObserver = ref()
const loading = ref(true)

onMounted(() => {
  const myChart = echarts.init(chartRef.value)
  chartInstance.value = myChart
  getData({ createTime: rangeMap['week'] })
})

const getData = async params => {
  const { data } = await getChatChart(params)
  const { list } = data
  countData.value = { total: data.total.toLocaleString(), rangeTotal: data.rangeTotal.toLocaleString() }
  loading.value = false
  chartInstance.value.setOption({
    xAxis: {
      type: 'category',
      data: list.map(i => i.date),
      axisLine: { lineStyle: { color: '#030A1A' } },
      axisTick: { alignWithLabel: true },
      axisLabel: { color: '#858C99' }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      max: list.every(i => i.count < 3) ? 3 : undefined,
      splitNumber: 3,
      splitLine: { lineStyle: { color: '#DCDFE5' } },
      axisLabel: { color: '#858C99' }
    },
    series: [
      {
        data: list.map(i => i.count),
        type: 'line',
        smooth: true
      }
    ],
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#2E384D',
      borderColor: '#2E384D',
      textStyle: { color: '#fff', fontSize: 12, lineHeight: 20 },
      padding: [4, 12, 4, 12],
      formatter: function (params) {
        const dom = [
          '<br />',
          '<span style="display: inline-block;width: 10px; height: 10px;border: 2px solid #1A66FF;border-radius: 50%"></span>',
          '<span style="padding: 0 8px">回复成功</span>'
        ]
        return `<div>${params[0].name + dom.join('') + params[0].value}</div>`
      }
    },
    color: '#1A66FF',
    grid: {
      top: 20,
      bottom: 20,
      right: 0,
      left: Math.max(...list.map(i => i.count)).toString().length * 10 + 10
    }
  })
}

const onRangeChange = e => {
  const params: Record<string, string> = { createTime: rangeMap[e.target.value] }
  if (e.target.value === 'yesterday') {
    params.split = 'hour'
  }
  getData(params)
}

onMounted(() => {
  resizeObserver.value = new ResizeObserver(entries => {
    chartInstance.value.resize()
  })
  resizeObserver.value.observe(chartRef.value)
})

onBeforeUnmount(() => {
  resizeObserver.value.unobserve(chartRef.value)
})
</script>
<style lang="less" module>
.chart-wrapper {
  height: 456px;
  margin-top: 20px;
  .chart-header {
    display: flex;
    justify-content: space-between;
    height: 56px;
    margin-bottom: 30px;
    .chart-count {
      display: flex;
      .chart-count-item {
        margin-right: 98px;
        .chart-item-label {
          color: var(--text-gray-color2);
          line-height: 20px;
        }
        .chart-item-value {
          line-height: 32px;
          margin-top: 4px;
          font-size: 24px;
          color: var(--text-color);
          .chart-item-num {
            font-weight: bold;
            padding-right: 4px;
          }
        }
      }
    }
    .chart-filter {
    }
  }
  .chart-content {
    height: calc(100% - 86px);
    :global {
      .ant-skeleton-input {
        height: 100%;
      }
    }
  }
}
</style>
