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
                    <el-button type="warning" :icon="CirclePlusFilled" @click="handleCreate">新增预订</el-button>
                </template>
                <template #status="{ rows }">
                    <el-tag :type="statusTag(rows.status)">
                        {{ getSelectLabel(statusOptions, rows.status) }}
                    </el-tag>
                </template>
                <template #pricingSnapshot="{ rows }">
                    <span class="summary-cell">{{ rows.pricingSnapshot || '-' }}</span>
                </template>
            </TableCustom>
        </div>

        <el-dialog
            :title="isEdit ? '编辑预订' : '新增预订'"
            v-model="visible"
            width="720px"
            destroy-on-close
            :close-on-click-modal="false"
            @close="closeDialog">
            <TableEdit :form-data="rowData" :options="options" :edit="isEdit" :update="updateData" />
        </el-dialog>

        <el-dialog title="预订详情" v-model="visibleDetail" width="720px" destroy-on-close>
            <TableDetail :data="detailData" />
        </el-dialog>
    </div>
</template>

<script setup lang="ts" name="room-booking">
import { reactive, ref } from 'vue';
import { CirclePlusFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import TableCustom from '@/components/table-custom.vue';
import TableDetail from '@/components/table-detail.vue';
import TableEdit from '@/components/table-edit.vue';
import TableSearch from '@/components/table-search.vue';
import type { FormOption, FormOptionList } from '@/types/form-option';
import {
    fetchRoomBookingList,
    createRoomBookingRequest,
    updateRoomBookingRequest,
    deleteRoomBookingRequest,
    type RoomBookingRequestRecord,
    type RoomBookingPayload,
} from '@/api/index';
import type { AxiosError } from 'axios';

const statusOptions = [
    { label: '已提交', value: 'SUBMITTED', tag: 'warning' },
    { label: '审核通过', value: 'APPROVED', tag: 'success' },
    { label: '已驳回', value: 'REJECTED', tag: 'danger' },
];

const query = reactive({
    keyword: '',
});
const searchOpt = ref<FormOptionList[]>([{ type: 'input', label: '申请人姓名：', prop: 'keyword' }]);
const handleSearch = () => {
    changePage(1);
};

const columns = ref([
    { type: 'selection' },
    { type: 'index', label: '序号', width: 55, align: 'center' },
    { prop: 'guestName', label: '姓名', width: 120 },
    { prop: 'phone', label: '联系电话', width: 150 },
    { prop: 'communityId', label: '社区ID', width: 110 },
    { prop: 'roomId', label: '房间ID', width: 110 },
    { prop: 'checkIn', label: '入住日', width: 140 },
    { prop: 'checkOut', label: '退房日', width: 140 },
    { prop: 'guests', label: '人数', width: 90 },
    { prop: 'status', label: '状态', width: 110 },
    { prop: 'priceQuoteAmount', label: '报价', width: 120 },
    { prop: 'pricingSnapshot', label: '报价快照', align: 'left', width: 220 },
    { prop: 'createdAt', label: '创建时间', width: 160 },
    { prop: 'operator', label: '操作', width: 220 },
]);

const page = reactive({
    index: 1,
    size: 10,
    total: 0,
});
const tableData = ref<RoomBookingRequestRecord[]>([]);

const getSelectLabel = (options: Array<{ label: string; value: string }>, value?: string | null) => {
    const found = options.find((item) => item.value === value);
    return found ? found.label : '未设置';
};

const statusTag = (value?: string | null) => {
    const found = statusOptions.find((item) => item.value === value);
    return found?.tag ?? 'info';
};

const getData = async () => {
    try {
        const res = await fetchRoomBookingList({
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
        ElMessage.error(err.response?.data?.message || err.message || '加载房间预订失败');
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
    status: 'SUBMITTED',
    guests: 1,
    priceQuoteCurrency: 'CNY',
};

const options = ref<FormOption>({
    labelWidth: '120px',
    span: 24,
    list: [
        { type: 'input', label: '申请ID', prop: 'id', disabled: true, placeholder: '保存后自动生成' },
        { type: 'number', label: '用户ID', prop: 'userId', required: true },
        { type: 'number', label: '社区ID', prop: 'communityId', required: true },
        { type: 'number', label: '房间ID', prop: 'roomId' },
        { type: 'number', label: '价目方案ID', prop: 'ratePlanId' },
        { type: 'input', label: '入住日期', prop: 'checkIn', placeholder: '例如 2025-01-05' },
        { type: 'input', label: '退房日期', prop: 'checkOut', placeholder: '例如 2025-01-10' },
        { type: 'number', label: '同行人数', prop: 'guests' },
        { type: 'input', label: '申请人姓名', prop: 'guestName', required: true },
        { type: 'input', label: '联系电话', prop: 'phone', required: true },
        { type: 'input', label: '证件号', prop: 'idNumber' },
        { type: 'input', label: '教育背景', prop: 'education' },
        { type: 'textarea', label: '个人介绍', prop: 'intro', rows: 2 },
        { type: 'textarea', label: '社区期待', prop: 'communityExpect', rows: 2 },
        { type: 'number', label: '报价金额', prop: 'priceQuoteAmount' },
        { type: 'input', label: '报价币种', prop: 'priceQuoteCurrency' },
        { type: 'textarea', label: '报价快照', prop: 'pricingSnapshot', rows: 3 },
        { type: 'select', label: '状态', prop: 'status', opts: statusOptions },
        { type: 'number', label: '审核人', prop: 'reviewedBy' },
        { type: 'input', label: '审核时间', prop: 'reviewedAt' },
        { type: 'textarea', label: '驳回原因', prop: 'rejectionReason', rows: 2 },
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

const handleEdit = (row: RoomBookingRequestRecord) => {
    rowData.value = { ...defaultFormValues, ...row };
    isEdit.value = true;
    visible.value = true;
};

const buildRoomBookingPayload = (formValue: Record<string, any>): RoomBookingPayload => {
    const payload: RoomBookingPayload = {
        userId: formValue.userId,
        communityId: formValue.communityId,
        roomId: formValue.roomId,
        ratePlanId: formValue.ratePlanId,
        checkIn: formValue.checkIn,
        checkOut: formValue.checkOut,
        guests: formValue.guests,
        guestName: formValue.guestName,
        phone: formValue.phone,
        idNumber: formValue.idNumber,
        education: formValue.education,
        intro: formValue.intro,
        communityExpect: formValue.communityExpect,
        priceQuoteAmount: formValue.priceQuoteAmount,
        priceQuoteCurrency: formValue.priceQuoteCurrency,
        pricingSnapshot: formValue.pricingSnapshot,
        status: formValue.status,
        reviewedBy: formValue.reviewedBy,
        reviewedAt: formValue.reviewedAt,
        rejectionReason: formValue.rejectionReason,
    };
    return payload;
};

const updateData = async (formValue: Record<string, any>) => {
    const payload = buildRoomBookingPayload(formValue);
    try {
        if (isEdit.value && formValue.id) {
            await updateRoomBookingRequest(formValue.id, payload);
            ElMessage.success('预订更新成功');
        } else {
            await createRoomBookingRequest(payload);
            ElMessage.success('预订创建成功');
        }
        closeDialog();
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '保存预订失败');
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
    list: [] as Array<{ prop: keyof RoomBookingRequestRecord | string; label: string; span?: number; value?: string | number }>,
});

const handleView = (row: RoomBookingRequestRecord) => {
    detailData.value = {
        title: `${row.guestName || '预订请求'}`,
        column: 2,
        row,
        list: [
            { prop: 'guestName', label: '姓名' },
            { prop: 'phone', label: '联系电话' },
            { prop: 'communityId', label: '社区ID' },
            { prop: 'roomId', label: '房间ID' },
            { prop: 'checkIn', label: '入住日' },
            { prop: 'checkOut', label: '退房日' },
            { prop: 'guests', label: '同行人数' },
            { prop: 'status', label: '状态', value: getSelectLabel(statusOptions, row.status) },
            { prop: 'priceQuoteAmount', label: '报价金额' },
            { prop: 'priceQuoteCurrency', label: '报价币种' },
            { prop: 'pricingSnapshot', label: '报价快照', span: 2 },
            { prop: 'intro', label: '个人介绍', span: 2 },
            { prop: 'communityExpect', label: '社区期待', span: 2 },
            { prop: 'rejectionReason', label: '驳回原因', span: 2 },
            { prop: 'reviewedBy', label: '审核人' },
            { prop: 'reviewedAt', label: '审核时间' },
            { prop: 'createdAt', label: '创建时间' },
            { prop: 'updatedAt', label: '更新时间' },
        ],
    };
    visibleDetail.value = true;
};

const handleDelete = async (row: RoomBookingRequestRecord) => {
    try {
        await deleteRoomBookingRequest(row.id);
        ElMessage.success('删除预订成功');
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '删除预订失败');
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
