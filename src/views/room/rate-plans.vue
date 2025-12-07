<template>
    <div>
        <TableSearch :query="query" :options="searchOpt" :search="handleSearch" />
        <div class="container">
            <TableCustom
                :columns="columns"
                :tableData="tableData"
                :total="page.total"
                :refresh="getData"
                :currentPage="page.index"
                :changePage="changePage"
                :delSelection="handleBatchDelete"
                @selection-change="handleSelectionChange">
                <template #toolbarBtn>
                    <el-button type="primary" :icon="CirclePlusFilled" @click="handleCreate">新增方案</el-button>
                    <el-button type="primary" plain :icon="Refresh" @click="getData" style="margin-left: 10px">
                        刷新
                    </el-button>
                </template>
                <template #isActive="{ rows }">
                    <el-tag :type="rows.isActive ? 'success' : 'info'">{{ rows.isActive ? '启用' : '停用' }}</el-tag>
                </template>
                <template #baseAmount="{ rows }">
                    {{ formatAmount(rows.baseAmount, rows.currency) }}
                </template>
                <template #operator="{ rows }">
                    <el-space wrap>
                        <el-button type="primary" size="small" :icon="View" @click="handleView(rows)">详情</el-button>
                        <el-button type="primary" plain size="small" :icon="Edit" @click="handleEdit(rows)">
                            编辑
                        </el-button>
                        <el-button type="danger" plain size="small" :icon="Delete" @click="handleDelete(rows)">
                            删除
                        </el-button>
                    </el-space>
                </template>
            </TableCustom>
        </div>

        <el-dialog
            :title="isEdit ? '编辑计价方案' : '新增计价方案'"
            v-model="visible"
            width="640px"
            destroy-on-close
            :close-on-click-modal="false"
            @close="closeDialog">
            <TableEdit :form-data="rowData" :options="options" :edit="isEdit" :update="updateData" />
        </el-dialog>

        <el-dialog title="计价方案详情" v-model="detailVisible" width="640px" destroy-on-close>
            <TableDetail :data="detailData">
                <template #baseAmount="{ rows }">
                    {{ formatAmount(rows.baseAmount, rows.currency) }}
                </template>
                <template #isActive="{ rows }">
                    <el-tag :type="rows.isActive ? 'success' : 'info'">{{ rows.isActive ? '启用' : '停用' }}</el-tag>
                </template>
            </TableDetail>
        </el-dialog>
    </div>
</template>

<script setup lang="ts" name="room-rate-plans">
import { reactive, ref } from 'vue';
import { CirclePlusFilled, Delete, Edit, Refresh, View } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import TableCustom from '@/components/table-custom.vue';
import TableDetail from '@/components/table-detail.vue';
import TableEdit from '@/components/table-edit.vue';
import TableSearch from '@/components/table-search.vue';
import type { FormOption, FormOptionList } from '@/types/form-option';
import {
    fetchRoomRatePlanList,
    createRoomRatePlan,
    updateRoomRatePlan,
    deleteRoomRatePlan,
    type RoomRatePlanRecord,
    type RoomRatePlanPayload,
} from '@/api/index';
import type { AxiosError } from 'axios';

const query = reactive({
    keyword: '',
    roomId: '',
    isActive: '',
});

const searchOpt = ref<FormOptionList[]>([
    { type: 'input', label: '方案名称：', prop: 'keyword', placeholder: '方案名称' },
    { type: 'input', label: '房间ID：', prop: 'roomId', placeholder: '房间 ID' },
    {
        type: 'select',
        label: '启用状态：',
        prop: 'isActive',
        placeholder: '全部',
        opts: [
            { label: '启用', value: true },
            { label: '停用', value: false },
        ],
    },
]);

const handleSearch = () => {
    changePage(1);
};

const columns = ref([
    { type: 'selection' },
    { type: 'index', label: '序号', width: 60, align: 'center' },
    { prop: 'id', label: 'ID', width: 90 },
    { prop: 'roomId', label: '房间ID', width: 110 },
    { prop: 'name', label: '方案名称', width: 180, align: 'left' },
    { prop: 'billingUnit', label: '计费单位', width: 110 },
    { prop: 'currency', label: '货币', width: 90 },
    { prop: 'baseAmount', label: '基础金额', width: 140 },
    { prop: 'minDuration', label: '最低租期', width: 100 },
    { prop: 'maxDuration', label: '最高租期', width: 100 },
    { prop: 'isActive', label: '是否启用', width: 110 },
    { prop: 'sortOrder', label: '排序', width: 80 },
    { prop: 'createdAt', label: '创建时间', width: 180 },
    { prop: 'updatedAt', label: '更新时间', width: 180 },
    { prop: 'operator', label: '操作', width: 240 },
]);

const page = reactive({
    index: 1,
    size: 10,
    total: 0,
});

const tableData = ref<RoomRatePlanRecord[]>([]);
const selectedRows = ref<RoomRatePlanRecord[]>([]);

const formatAmount = (amount?: number | null, currency?: string | null) => {
    if (amount === null || amount === undefined) return '-';
    const value = Number(amount);
    if (Number.isNaN(value)) return '-';
    const code = currency || 'CNY';
    return `${code} ${value.toFixed(2)}`;
};

const getData = async () => {
    try {
        const res = await fetchRoomRatePlanList({
            page: page.index,
            size: page.size,
            keyword: query.keyword || undefined,
            roomId: query.roomId || undefined,
            isActive: query.isActive !== '' ? query.isActive : undefined,
        });
        const payload = res.data.data;
        const list = payload?.list ?? [];
        tableData.value = list;
        page.total = payload?.total ?? list.length ?? 0;
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '加载计价方案失败');
        tableData.value = [];
        page.total = 0;
    }
};
getData();

const changePage = (val: number) => {
    page.index = val;
    getData();
};

const defaultFormValues: RoomRatePlanPayload = {
    roomId: undefined,
    name: '',
    billingUnit: '',
    currency: 'CNY',
    baseAmount: 0,
    minDuration: undefined,
    maxDuration: undefined,
    isActive: true,
    sortOrder: 0,
};

const options = ref<FormOption>({
    labelWidth: '120px',
    span: 24,
    list: [
        { type: 'input', label: 'ID', prop: 'id', disabled: true, placeholder: '保存后自动生成' },
        { type: 'number', label: '房间ID', prop: 'roomId', required: true },
        { type: 'input', label: '方案名称', prop: 'name', required: true },
        { type: 'input', label: '计费单位', prop: 'billingUnit', required: true, placeholder: '如 day/month' },
        {
            type: 'select',
            label: '货币',
            prop: 'currency',
            opts: [
                { label: 'CNY', value: 'CNY' },
                { label: 'USD', value: 'USD' },
                { label: 'EUR', value: 'EUR' },
            ],
        },
        { type: 'number', label: '基础金额', prop: 'baseAmount', required: true, placeholder: '支持两位小数' },
        { type: 'number', label: '最低租期', prop: 'minDuration', placeholder: '可选' },
        { type: 'number', label: '最高租期', prop: 'maxDuration', placeholder: '可选' },
        {
            type: 'switch',
            label: '是否启用',
            prop: 'isActive',
            activeValue: true,
            inactiveValue: false,
            activeText: '启用',
            inactiveText: '停用',
        },
        { type: 'number', label: '排序', prop: 'sortOrder', placeholder: '数字越大越靠前' },
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

const handleEdit = (row: RoomRatePlanRecord) => {
    rowData.value = { ...row };
    isEdit.value = true;
    visible.value = true;
};

const closeDialog = () => {
    visible.value = false;
};

const updateData = async (form: Record<string, any>) => {
    const payload = { ...rowData.value, ...form };
    const id = form.id ?? rowData.value.id;
    try {
        if (isEdit.value && id) {
            await updateRoomRatePlan(id, payload);
            ElMessage.success('更新成功');
        } else {
            await createRoomRatePlan(payload);
            ElMessage.success('创建成功');
        }
        visible.value = false;
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '保存失败');
    }
};

const handleDelete = async (row: RoomRatePlanRecord) => {
    try {
        await ElMessageBox.confirm('确定要删除该计价方案吗？', '提示', { type: 'warning' });
        await deleteRoomRatePlan(row.id);
        ElMessage.success('删除成功');
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        if ((err as Error)?.message?.includes('cancel')) return;
        ElMessage.error(err.response?.data?.message || err.message || '删除失败');
    }
};

const handleBatchDelete = async (rows: RoomRatePlanRecord[]) => {
    if (!rows.length) return;
    const ids = rows.map((item) => item.id).filter(Boolean);
    if (!ids.length) {
        ElMessage.error('选中的记录缺少ID');
        return;
    }
    try {
        await ElMessageBox.confirm(`确定删除选中的 ${ids.length} 条计价方案吗？`, '提示', { type: 'warning' });
        await Promise.all(ids.map((id) => deleteRoomRatePlan(id)));
        ElMessage.success('删除成功');
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        if ((err as Error)?.message?.includes('cancel')) return;
        ElMessage.error(err.response?.data?.message || err.message || '删除失败');
    }
};

const handleSelectionChange = (rows: RoomRatePlanRecord[]) => {
    selectedRows.value = rows;
};

const detailVisible = ref(false);
const detailData = ref({
    title: '计价方案详情',
    row: {},
    column: 2,
    list: [] as Array<{ label: string; prop: string; span?: number; value?: unknown }>,
});

const buildDetailData = (row: RoomRatePlanRecord) => {
    detailData.value = {
        title: '计价方案详情',
        row,
        column: 2,
        list: [
            { label: 'ID', prop: 'id' },
            { label: '房间ID', prop: 'roomId' },
            { label: '方案名称', prop: 'name', span: 2 },
            { label: '计费单位', prop: 'billingUnit' },
            { label: '货币', prop: 'currency' },
            { label: '基础金额', prop: 'baseAmount' },
            { label: '最低租期', prop: 'minDuration' },
            { label: '最高租期', prop: 'maxDuration' },
            { label: '是否启用', prop: 'isActive' },
            { label: '排序', prop: 'sortOrder' },
            { label: '创建时间', prop: 'createdAt' },
            { label: '更新时间', prop: 'updatedAt' },
        ],
    };
};

const handleView = (row: RoomRatePlanRecord) => {
    buildDetailData(row);
    detailVisible.value = true;
};
</script>
