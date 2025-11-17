<template>
    <div>
        <el-row :gutter="20" class="mgb20">
            <el-col :span="6">
                <el-card shadow="hover" body-class="card-body">
                    <el-icon class="card-icon bg1">
                        <User />
                    </el-icon>
                    <div class="card-content">
                        <countup class="card-num color1" :end="3260" />
                        <div>用户周活跃量</div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover" body-class="card-body">
                    <el-icon class="card-icon bg2">
                        <HomeFilled />
                    </el-icon>
                    <div class="card-content">
                        <countup class="card-num color2" :end="48" />
                        <div>社区入住量</div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover" body-class="card-body">
                    <el-icon class="card-icon bg3">
                        <Calendar />
                    </el-icon>
                    <div class="card-content">
                        <countup class="card-num color3" :end="37" />
                        <div>活动报名数量</div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover" body-class="card-body">
                    <el-icon class="card-icon bg4">
                        <Opportunity />
                    </el-icon>
                    <div class="card-content">
                        <countup class="card-num color4" :end="129" />
                        <div>机会申请数量</div>
                    </div>
                </el-card>
            </el-col>
        </el-row>

        <el-row :gutter="20" class="mgb20">
            <el-col :span="18">
                <el-card shadow="hover">
                    <div class="card-header">
                        <p class="card-header-title">用户量</p>
                        <p class="card-header-desc">最近一周用户数量走势，记录每天的用户数量</p>
                    </div>
                    <v-chart class="chart" :option="dashOpt1" />
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover">
                    <div class="card-header">
                        <p class="card-header-title">活动偏好</p>
                        <p class="card-header-desc">最近一个月游民最常报名的活动类型</p>
                    </div>
                    <v-chart class="chart" :option="dashOpt2" />
                </el-card>
            </el-col>
        </el-row>
        <el-row :gutter="20">
            <el-col :span="12">
                <el-card shadow="hover" :body-style="{ height: '400px' }">
                    <div class="card-header">
                        <p class="card-header-title">平台动态</p>
                        <p class="card-header-desc">记录社区入住、活动与服务的实时变化</p>
                    </div>
                    <el-timeline>
                        <el-timeline-item v-for="(activity, index) in activities" :key="index" :color="activity.color">
                            <div class="timeline-item">
                                <div>
                                    <p>{{ activity.content }}</p>
                                    <p class="timeline-desc">{{ activity.description }}</p>
                                </div>
                                <div class="timeline-time">{{ activity.timestamp }}</div>
                            </div>
                        </el-timeline-item>
                    </el-timeline>
                </el-card>
            </el-col>
            <el-col :span="12">
                <el-card shadow="hover" :body-style="{ height: '400px' }">
                    <div class="card-header">
                        <p class="card-header-title">热门活动榜</p>
                        <p class="card-header-desc">依报名人数排序，实时体现活动热度</p>
                    </div>
                    <div>
                        <div class="rank-item" v-for="(rank, index) in ranks">
                            <div class="rank-item-avatar">{{ index + 1 }}</div>
                            <div class="rank-item-content">
                                <div class="rank-item-top">
                                <div class="rank-item-title">{{ rank.title }}</div>
                                <div class="rank-item-desc">报名：{{ rank.value }}人</div>
                                </div>
                                <el-progress
                                    :show-text="false"
                                    striped
                                    :stroke-width="10"
                                    :percentage="rank.percent"
                                    :color="rank.color"
                                />
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>
        </el-row>
    </div>
</template>

<script setup lang="ts" name="dashboard">
import countup from '@/components/countup.vue';
import { use } from 'echarts/core';
import { LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';
import { dashOpt1, dashOpt2 } from './chart/options';
use([CanvasRenderer, GridComponent, LineChart, PieChart, TooltipComponent, LegendComponent]);
const activities = [
    {
        content: '杭州·灵感工坊入住率 96%',
        description: '周租房源已售罄，剩余月租名额 4 个',
        timestamp: '30分钟前',
        color: '#00bcd4',
    },
    {
        content: '深圳夜游民主题活动上线',
        description: '已有 68 位游民报名，等待审核 5 人',
        timestamp: '55分钟前',
        color: '#1ABC9C',
    },
    {
        content: '上海共创营发布 3 个创业机会',
        description: '设计、BD、AI 开发者各 1 名，审核中',
        timestamp: '1小时前',
        color: '#3f51b5',
    },
    {
        content: '清迈站发起“远程税务答疑”服务',
        description: '今日预约 22 人，客服已分配导师',
        timestamp: '15小时前',
        color: '#f44336',
    },
    {
        content: '社区代币“游民贝壳”本周发放 2.3w',
        description: '完成活动分享与好友邀约将额外奖励',
        timestamp: '1天前',
        color: '#009688',
    },
];

const ranks = [
    {
        title: '杭州 · 灵感工坊「AI 共创周」',
        value: 320,
        percent: 96,
        color: '#f25e43',
    },
    {
        title: '成都 · 云端协作社「远程工作节」',
        value: 280,
        percent: 92,
        color: '#00bcd4',
    },
    {
        title: '深圳 · 夜游民基地「数字游民市集」',
        value: 245,
        percent: 88,
        color: '#64d572',
    },
    {
        title: '上海 · 共创营地「创业加速营」',
        value: 210,
        percent: 84,
        color: '#e9a745',
    },
    {
        title: '清迈 · 游牧小镇「跨境协同体验营」',
        value: 188,
        percent: 80,
        color: '#009688',
    },
];
</script>

<style>
.card-body {
    display: flex;
    align-items: center;
    height: 100px;
    padding: 0;
}
</style>
<style scoped>
.card-content {
    flex: 1;
    text-align: center;
    font-size: 14px;
    color: #999;
    padding: 0 20px;
}

.card-num {
    font-size: 30px;
}

.card-icon {
    font-size: 50px;
    width: 100px;
    height: 100px;
    text-align: center;
    line-height: 100px;
    color: #fff;
}

.bg1 {
    background: #2d8cf0;
}

.bg2 {
    background: #64d572;
}

.bg3 {
    background: #f25e43;
}

.bg4 {
    background: #e9a745;
}

.color1 {
    color: #2d8cf0;
}

.color2 {
    color: #64d572;
}

.color3 {
    color: #f25e43;
}

.color4 {
    color: #e9a745;
}

.chart {
    width: 100%;
    height: 400px;
}

.card-header {
    padding-left: 10px;
    margin-bottom: 20px;
}

.card-header-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 5px;
}

.card-header-desc {
    font-size: 14px;
    color: #999;
}

.timeline-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 16px;
    color: #000;
}

.timeline-time,
.timeline-desc {
    font-size: 12px;
    color: #787878;
}

.rank-item {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
}

.rank-item-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #f2f2f2;
    text-align: center;
    line-height: 40px;
    margin-right: 10px;
}

.rank-item-content {
    flex: 1;
}

.rank-item-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #343434;
    margin-bottom: 10px;
}

.rank-item-desc {
    font-size: 14px;
    color: #999;
}
</style>
