<template>
    <div>
        <TableSearch :query="query" :options="searchOpt" :search="handleSearch" />
        <div class="container">
            <TableCustom
                :columns="columns"
                :tableData="tableData"
                :total="page.total"
                :viewFunc="handleView"
                :delFunc="handleDelete"
                :editFunc="handleEdit"
                :refresh="getData"
                :currentPage="page.index"
                :changePage="changePage">
                <template #toolbarBtn>
                    <el-button type="warning" :icon="CirclePlusFilled" @click="handleCreate">新增活动</el-button>
                </template>
                <template #status="{ rows }">
                    <el-tag :type="getStatusTag(rows.status)">
                        {{ formatStatus(rows.status) }}
                    </el-tag>
                </template>
                <template #summary="{ rows }">
                    <span class="summary-cell">
                        {{ rows.summary || '-' }}
                    </span>
                </template>
                <template #visibility="{ rows }">
                    {{ getSelectLabel(visibilityOptions, rows.visibility) }}
                </template>
                <template #mode="{ rows }">
                    {{ getSelectLabel(modeOptions, rows.mode) }}
                </template>
                <template #feeType="{ rows }">
                    {{ getSelectLabel(feeTypeOptions, rows.feeType) }}
                </template>
                <template #price="{ rows }">
                    <span v-if="rows.price !== undefined && rows.price !== null">
                        {{ rows.currency || 'CNY' }} {{ rows.price }}
                    </span>
                    <span v-else>-</span>
                </template>
            </TableCustom>
        </div>

        <el-dialog
            :title="isEdit ? '编辑活动' : '新增活动'"
            v-model="visible"
            width="720px"
            destroy-on-close
            :close-on-click-modal="false"
            @close="closeDialog">
            <TableEdit :form-data="rowData" :options="options" :edit="isEdit" :update="updateData" />
        </el-dialog>

        <el-dialog title="活动详情" v-model="visibleDetail" width="720px" destroy-on-close>
            <TableDetail :data="detailData" />
        </el-dialog>
    </div>
</template>

<script setup lang="ts" name="activity-list">
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { CirclePlusFilled } from '@element-plus/icons-vue';
import TableCustom from '@/components/table-custom.vue';
import TableDetail from '@/components/table-detail.vue';
import TableEdit from '@/components/table-edit.vue';
import TableSearch from '@/components/table-search.vue';
import type { FormOption, FormOptionList } from '@/types/form-option';
import {
    fetchActivityList,
    createActivity,
    updateActivity,
    deleteActivity,
    type ActivityRecord,
    type ActivityPayload,
} from '@/api/index';
import type { AxiosError } from 'axios';

const statusOptions = [
    { label: '待审核', value: 0, tag: 'warning' },
    { label: '已发布', value: 1, tag: 'success' },
    { label: '已结束', value: 2, tag: 'info' },
];
const visibilityOptions = [
    { label: '公开', value: 0 },
    { label: '私密', value: 1 },
    { label: '仅社区可见', value: 2 },
];
const modeOptions = [
    { label: '线下', value: 0 },
    { label: '线上', value: 1 },
    { label: '线上 + 线下', value: 2 },
];
const feeTypeOptions = [
    { label: '免费', value: 0 },
    { label: '付费', value: 1 },
    { label: '会员', value: 2 },
];

const query = reactive({
    keyword: '',
});
const searchOpt = ref<FormOptionList[]>([{ type: 'input', label: '活动名称：', prop: 'keyword' }]);
const handleSearch = () => {
    changePage(1);
};

const columns = ref([
    { type: 'selection' },
    { type: 'index', label: '序号', width: 55, align: 'center' },
    { prop: 'title', label: '活动名称', align: 'left', width: 220 },
    { prop: 'city', label: '城市' },
    { prop: 'venue', label: '地点', align: 'left', width: 180 },
    { prop: 'startAt', label: '开始时间', width: 160 },
    { prop: 'endAt', label: '结束时间', width: 160 },
    { prop: 'status', label: '状态', width: 110 },
    { prop: 'visibility', label: '可见性', width: 120 },
    { prop: 'mode', label: '形式', width: 120 },
    { prop: 'feeType', label: '费用类型', width: 120 },
    { prop: 'price', label: '票价', width: 140 },
    { prop: 'capacity', label: '人数', width: 90 },
    { prop: 'summary', label: '简介', align: 'left', width: 240 },
    { prop: 'operator', label: '操作', width: 220 },
]);

const page = reactive({
    index: 1,
    size: 10,
    total: 0,
});
const tableData = ref<ActivityRecord[]>([]);

const getSelectLabel = (options: Array<{ label: string; value: number }>, value?: number | null) => {
    const found = options.find((item) => item.value === value);
    return found ? found.label : '未设置';
};

const formatStatus = (value?: number | null) => getSelectLabel(statusOptions, value ?? 0);
const getStatusTag = (value?: number | null) => {
    const found = statusOptions.find((item) => item.value === value);
    return found?.tag ?? 'warning';
};

const getData = async () => {
    try {
        const res = await fetchActivityList({
            page: page.index,
            size: page.size,
            keyword: query.keyword || undefined,
        });
        const payload = res.data.data;
        const list = payload?.list ?? [];
        tableData.value = list;
        page.total = payload?.total ?? list.length ?? 0;
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '加载活动列表失败');
        tableData.value = [];
        page.total = 0;
    }
};
getData();

const changePage = (val: number) => {
    page.index = val;
    getData();
};

const defaultFormValues = {
    status: 0,
    visibility: 0,
    mode: 0,
    feeType: 0,
    currency: 'CNY',
};

const options = ref<FormOption>({
    labelWidth: '120px',
    span: 24,
    list: [
        { type: 'input', label: '活动ID', prop: 'id', disabled: true, placeholder: '保存后自动生成' },
        { type: 'input', label: '活动名称', prop: 'title', required: true },
        { type: 'textarea', label: '活动简介', prop: 'summary', rows: 3, required: true },
        { type: 'textarea', label: '活动详情', prop: 'description', rows: 4 },
        { type: 'select', label: '状态', prop: 'status', opts: statusOptions, required: true },
        { type: 'select', label: '可见性', prop: 'visibility', opts: visibilityOptions },
        { type: 'select', label: '活动形式', prop: 'mode', opts: modeOptions },
        { type: 'input', label: '城市', prop: 'city' },
        { type: 'input', label: '活动地点', prop: 'venue' },
        { type: 'input', label: '开始时间', prop: 'startAt', placeholder: '例如 2025-01-01T10:00:00Z' },
        { type: 'input', label: '结束时间', prop: 'endAt', placeholder: '例如 2025-01-01T12:00:00Z' },
        { type: 'select', label: '费用类型', prop: 'feeType', opts: feeTypeOptions },
        { type: 'number', label: '票价', prop: 'price' },
        { type: 'input', label: '币种', prop: 'currency' },
        { type: 'number', label: '人数上限', prop: 'capacity' },
        { type: 'input', label: '封面 URL', prop: 'coverUrl' },
        { type: 'number', label: '封面资源ID', prop: 'coverResourceId' },
        { type: 'input', label: '发布时间', prop: 'publishedAt', disabled: true },
        { type: 'input', label: '创建时间', prop: 'createdAt', disabled: true },
        { type: 'input', label: '更新时间', prop: 'updatedAt', disabled: true },
    ],
});

const visible = ref(false);
const isEdit = ref(false);
const rowData = ref<Record<string, any>>({ ...defaultFormValues });

const resetForm = () => {
    rowData.value = { ...defaultFormValues };
};

const handleCreate = () => {
    resetForm();
    isEdit.value = false;
    visible.value = true;
};

const handleEdit = (row: ActivityRecord) => {
    rowData.value = { ...defaultFormValues, ...row };
    isEdit.value = true;
    visible.value = true;
};

const toNumberOrUndefined = (value: unknown) => {
    if (value === '' || value === null || value === undefined) {
        return undefined;
    }
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(num) ? undefined : num;
};

const buildActivityPayload = (formValue: Record<string, any>): ActivityPayload => {
    const payload: ActivityPayload = {
        title: formValue.title,
        summary: formValue.summary,
        description: formValue.description,
        coverUrl: formValue.coverUrl,
        city: formValue.city,
        venue: formValue.venue,
        startAt: formValue.startAt,
        endAt: formValue.endAt,
        currency: formValue.currency,
    };
    const numericEntries: Array<[keyof ActivityPayload, unknown]> = [
        ['status', formValue.status],
        ['visibility', formValue.visibility],
        ['mode', formValue.mode],
        ['feeType', formValue.feeType],
        ['price', formValue.price],
        ['capacity', formValue.capacity],
        ['coverResourceId', formValue.coverResourceId],
    ];
    numericEntries.forEach(([key, raw]) => {
        const num = toNumberOrUndefined(raw);
        if (num !== undefined) {
            payload[key] = num as never;
        }
    });
    return payload;
};

const updateData = async (formValue: Record<string, any>) => {
    const payload = buildActivityPayload(formValue);
    try {
        if (isEdit.value && formValue.id) {
            await updateActivity(formValue.id, payload);
            ElMessage.success('活动更新成功');
        } else {
            await createActivity(payload);
            ElMessage.success('活动创建成功');
        }
        closeDialog();
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '保存活动失败');
    }
};

const closeDialog = () => {
    visible.value = false;
    isEdit.value = false;
    resetForm();
};

const visibleDetail = ref(false);
const detailData = ref({
    title: '',
    column: 2,
    row: {},
    list: [] as Array<{ prop: keyof ActivityRecord | string; label: string; span?: number; value?: string | number }>,
});

const handleView = (row: ActivityRecord) => {
    detailData.value = {
        title: row.title,
        column: 2,
        row,
        list: [
            { prop: 'title', label: '活动名称', span: 2 },
            { prop: 'summary', label: '简介', span: 2 },
            { prop: 'description', label: '详情', span: 2 },
            { prop: 'city', label: '城市' },
            { prop: 'venue', label: '地点', span: 2 },
            { prop: 'startAt', label: '开始时间' },
            { prop: 'endAt', label: '结束时间' },
            { prop: 'status', label: '状态', value: formatStatus(row.status) },
            { prop: 'visibility', label: '可见性', value: getSelectLabel(visibilityOptions, row.visibility) },
            { prop: 'mode', label: '活动形式', value: getSelectLabel(modeOptions, row.mode) },
            { prop: 'feeType', label: '费用类型', value: getSelectLabel(feeTypeOptions, row.feeType) },
            { prop: 'price', label: '票价', value: row.price ? `${row.currency || 'CNY'} ${row.price}` : '-' },
            { prop: 'capacity', label: '人数上限' },
            { prop: 'coverUrl', label: '封面 URL', span: 2 },
            { prop: 'createdAt', label: '创建时间' },
            { prop: 'updatedAt', label: '更新时间' },
            { prop: 'publishedAt', label: '发布时间' },
        ],
    };
    visibleDetail.value = true;
};

const handleDelete = async (row: ActivityRecord) => {
    try {
        await deleteActivity(row.id);
        ElMessage.success('删除活动成功');
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '删除活动失败');
    }
};
</script>

<style scoped>
.summary-cell {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
