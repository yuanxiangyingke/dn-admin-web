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
                :changePage="changePage"
                @selection-change="handleSelectionChange">
                <template #toolbarBtn>
                    <el-button type="warning" :icon="CirclePlusFilled" @click="handleCreate">新增岗位</el-button>
                    <el-button type="primary" style="margin-left: 10px" @click="openStatusDialog">
                        修改审核状态
                    </el-button>
                </template>
                <template #status="{ rows }">
                    <el-tag :type="getStatusTag(rows.status)">
                        {{ getSelectLabel(statusOptions, rows.status) }}
                    </el-tag>
                </template>
                <template #workMode="{ rows }">
                    {{ getSelectLabel(workModeOptions, rows.workMode) }}
                </template>
                <template #employmentType="{ rows }">
                    {{ getSelectLabel(employmentTypeOptions, rows.employmentType) }}
                </template>
                <template #salaryDisplay="{ rows }">
                    {{ formatSalary(rows) }}
                </template>
                <template #preEmployment="{ rows }">
                    <el-tag :type="rows.preEmployment ? 'success' : 'info'">
                        {{ rows.preEmployment ? '是' : '否' }}
                    </el-tag>
                </template>
            </TableCustom>
        </div>

        <el-dialog
            :title="isEdit ? '编辑岗位' : '新增岗位'"
            v-model="visible"
            width="720px"
            destroy-on-close
            :close-on-click-modal="false"
            @close="closeDialog">
            <TableEdit :form-data="rowData" :options="options" :edit="isEdit" :update="updateData" />
        </el-dialog>

        <el-dialog title="岗位详情" v-model="visibleDetail" width="720px" destroy-on-close>
            <TableDetail :data="detailData" />
        </el-dialog>

        <el-dialog title="修改审核状态" v-model="statusDialogVisible" width="400px" destroy-on-close>
            <el-form label-width="120px">
                <el-form-item label="新的状态">
                    <el-select v-model="statusForm.status" placeholder="请选择">
                        <el-option
                            v-for="option in statusOptions"
                            :key="option.value"
                            :label="option.label"
                            :value="option.value" />
                    </el-select>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="statusDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="confirmStatusChange">确定</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts" name="job-list">
import { reactive, ref } from 'vue';
import { CirclePlusFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import TableCustom from '@/components/table-custom.vue';
import TableDetail from '@/components/table-detail.vue';
import TableEdit from '@/components/table-edit.vue';
import TableSearch from '@/components/table-search.vue';
import type { FormOption, FormOptionList } from '@/types/form-option';
import {
    fetchJobList,
    createJobOpportunity,
    updateJobOpportunity,
    deleteJobOpportunity,
    updateJobOpportunityStatus,
    type JobOpportunityRecord,
    type JobPayload,
} from '@/api/index';
import type { AxiosError } from 'axios';

const statusOptions = [
    { label: '待审核', value: 0, tag: 'warning' },
    { label: '已发布', value: 1, tag: 'success' },
    { label: '已归档', value: 2, tag: 'info' },
];
const workModeOptions = [
    { label: '远程', value: 0 },
    { label: '混合', value: 1 },
    { label: '线下', value: 2 },
];
const employmentTypeOptions = [
    { label: '全职', value: 0 },
    { label: '兼职', value: 1 },
    { label: '合同工', value: 2 },
    { label: '自由职业', value: 3 },
];

const query = reactive({
    keyword: '',
});
const searchOpt = ref<FormOptionList[]>([{ type: 'input', label: '岗位名称：', prop: 'keyword' }]);
const handleSearch = () => {
    changePage(1);
};

const columns = ref([
    { type: 'selection' },
    { type: 'index', label: '序号', width: 55, align: 'center' },
    { prop: 'title', label: '岗位名称', align: 'left', width: 200 },
    { prop: 'companyName', label: '公司' },
    { prop: 'location', label: '地点', width: 160 },
    { prop: 'workMode', label: '工作方式', width: 130 },
    { prop: 'employmentType', label: '岗位类型', width: 130 },
    { prop: 'salaryDisplay', label: '薪资', align: 'left', width: 180 },
    { prop: 'status', label: '状态', width: 120 },
    { prop: 'preEmployment', label: '预就业', width: 120 },
    { prop: 'postedAt', label: '发布时间', width: 160 },
    { prop: 'operator', label: '操作', width: 220 },
]);

const page = reactive({
    index: 1,
    size: 10,
    total: 0,
});
const tableData = ref<JobOpportunityRecord[]>([]);
const selectedRows = ref<JobOpportunityRecord[]>([]);

const getSelectLabel = (options: Array<{ label: string; value: number }>, value?: number | null) => {
    const found = options.find((item) => item.value === value);
    return found ? found.label : '未设置';
};

const getStatusTag = (value?: number | null) => {
    const found = statusOptions.find((item) => item.value === value);
    return found?.tag ?? 'warning';
};

const formatSalary = (row: JobOpportunityRecord) => {
    if (row.salaryDisplay) return row.salaryDisplay;
    if (row.salaryAmount) {
        return `${row.salaryCurrency || 'CNY'} ${row.salaryAmount}`;
    }
    if (row.salaryMinAmount || row.salaryMaxAmount) {
        return `${row.salaryCurrency || 'CNY'} ${row.salaryMinAmount || 0} - ${row.salaryMaxAmount || ''}`;
    }
    return '-';
};

const getData = async () => {
    try {
        const res = await fetchJobList({
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
        ElMessage.error(err.response?.data?.message || err.message || '加载岗位列表失败');
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
    workMode: 0,
    employmentType: 0,
    salaryCurrency: 'CNY',
    preEmployment: false,
};

const options = ref<FormOption>({
    labelWidth: '120px',
    span: 24,
    list: [
        { type: 'input', label: '岗位ID', prop: 'id', disabled: true, placeholder: '保存后自动生成' },
        { type: 'input', label: '岗位名称', prop: 'title', required: true },
        { type: 'input', label: '公司名称', prop: 'companyName' },
        { type: 'input', label: '外部编号', prop: 'externalRef' },
        { type: 'select', label: '工作方式', prop: 'workMode', opts: workModeOptions, required: true },
        { type: 'select', label: '岗位类型', prop: 'employmentType', opts: employmentTypeOptions, required: true },
        { type: 'input', label: '工作地点', prop: 'location', required: true },
        { type: 'select', label: '状态', prop: 'status', opts: statusOptions },
        { type: 'number', label: '固定薪资', prop: 'salaryAmount' },
        { type: 'number', label: '薪资下限', prop: 'salaryMinAmount' },
        { type: 'number', label: '薪资上限', prop: 'salaryMaxAmount' },
        { type: 'input', label: '薪资币种', prop: 'salaryCurrency' },
        { type: 'input', label: '薪资展示文案', prop: 'salaryDisplay' },
        { type: 'textarea', label: '岗位描述', prop: 'description', rows: 3 },
        { type: 'textarea', label: '岗位职责', prop: 'responsibility', rows: 3 },
        { type: 'textarea', label: '任职要求', prop: 'requirement', rows: 3 },
        { type: 'textarea', label: '团队介绍', prop: 'teamIntro', rows: 3 },
        { type: 'textarea', label: '薪酬福利', prop: 'benefitsSummary', rows: 3 },
        { type: 'input', label: '联系方式', prop: 'contact' },
        { type: 'switch', label: '预就业岗位', prop: 'preEmployment', activeValue: true, inactiveValue: false },
        { type: 'input', label: '发布时间', prop: 'postedAt', placeholder: '例如 2025-01-01T08:00:00Z' },
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

const handleEdit = (row: JobOpportunityRecord) => {
    rowData.value = { ...defaultFormValues, ...row };
    isEdit.value = true;
    visible.value = true;
};

const toNumberOrUndefined = (value: unknown) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(num) ? undefined : num;
};

const buildJobPayload = (formValue: Record<string, any>): JobPayload => {
    const payload: JobPayload = {
        title: formValue.title,
        companyName: formValue.companyName,
        externalRef: formValue.externalRef,
        location: formValue.location,
        salaryCurrency: formValue.salaryCurrency,
        salaryDisplay: formValue.salaryDisplay,
        description: formValue.description,
        responsibility: formValue.responsibility,
        requirement: formValue.requirement,
        teamIntro: formValue.teamIntro,
        benefitsSummary: formValue.benefitsSummary,
        contact: formValue.contact,
        postedAt: formValue.postedAt,
        preEmployment: formValue.preEmployment,
    };
    const numericEntries: Array<[keyof JobPayload, unknown]> = [
        ['workMode', formValue.workMode],
        ['employmentType', formValue.employmentType],
        ['status', formValue.status],
        ['salaryAmount', formValue.salaryAmount],
        ['salaryMinAmount', formValue.salaryMinAmount],
        ['salaryMaxAmount', formValue.salaryMaxAmount],
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
    const payload = buildJobPayload(formValue);
    try {
        if (isEdit.value && formValue.id) {
            await updateJobOpportunity(formValue.id, payload);
            ElMessage.success('岗位更新成功');
        } else {
            await createJobOpportunity(payload);
            ElMessage.success('岗位创建成功');
        }
        closeDialog();
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '保存岗位失败');
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
    list: [] as Array<{ prop: keyof JobOpportunityRecord | string; label: string; span?: number; value?: string | number }>,
});

const handleView = (row: JobOpportunityRecord) => {
    detailData.value = {
        title: row.title,
        column: 2,
        row,
        list: [
            { prop: 'title', label: '岗位名称', span: 2 },
            { prop: 'companyName', label: '公司' },
            { prop: 'externalRef', label: '外部编号' },
            { prop: 'location', label: '地点' },
            { prop: 'workMode', label: '工作方式', value: getSelectLabel(workModeOptions, row.workMode) },
            { prop: 'employmentType', label: '岗位类型', value: getSelectLabel(employmentTypeOptions, row.employmentType) },
            { prop: 'status', label: '状态', value: getSelectLabel(statusOptions, row.status) },
            { prop: 'salaryDisplay', label: '薪资', value: formatSalary(row), span: 2 },
            { prop: 'description', label: '岗位描述', span: 2 },
            { prop: 'responsibility', label: '岗位职责', span: 2 },
            { prop: 'requirement', label: '任职要求', span: 2 },
            { prop: 'teamIntro', label: '团队介绍', span: 2 },
            { prop: 'benefitsSummary', label: '薪酬福利', span: 2 },
            { prop: 'contact', label: '联系方式' },
            { prop: 'preEmployment', label: '预就业', value: row.preEmployment ? '是' : '否' },
            { prop: 'postedAt', label: '发布时间' },
            { prop: 'createdAt', label: '创建时间' },
            { prop: 'updatedAt', label: '更新时间' },
        ],
    };
    visibleDetail.value = true;
};

const handleDelete = async (row: JobOpportunityRecord) => {
    try {
        await deleteJobOpportunity(row.id);
        ElMessage.success('删除岗位成功');
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '删除岗位失败');
    }
};

const handleSelectionChange = (rows: JobOpportunityRecord[]) => {
    selectedRows.value = rows;
};

const statusDialogVisible = ref(false);
const statusForm = reactive({
    status: 0,
});
const statusTarget = ref<JobOpportunityRecord | null>(null);

const openStatusDialog = () => {
    if (!selectedRows.value.length) {
        ElMessage.warning('请选择需要修改的岗位');
        return;
    }
    if (selectedRows.value.length > 1) {
        ElMessage.warning('一次只能修改一个岗位的状态');
        return;
    }
    statusTarget.value = selectedRows.value[0];
    statusForm.status =
        typeof statusTarget.value?.status === 'number' ? (statusTarget.value.status as number) : 0;
    statusDialogVisible.value = true;
};

const confirmStatusChange = async () => {
    if (!statusTarget.value) return;
    try {
        await updateJobOpportunityStatus(statusTarget.value.id, statusForm.status);
        ElMessage.success('岗位状态更新成功');
        statusDialogVisible.value = false;
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '更新岗位状态失败');
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
