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
                    <el-button type="warning" :icon="CirclePlusFilled" @click="handleCreate">新增项目</el-button>
                    <el-button type="primary" style="margin-left: 10px" @click="openStatusDialog">
                        修改审核状态
                    </el-button>
                </template>
                <template #status="{ rows }">
                    <el-tag :type="getStatusTag(rows.status)">
                        {{ getSelectLabel(statusOptions, rows.status) }}
                    </el-tag>
                </template>
                <template #certified="{ rows }">
                    <el-tag :type="rows.certified ? 'success' : 'info'">
                        {{ rows.certified ? '已认证' : '未认证' }}
                    </el-tag>
                </template>
                <template #brief="{ rows }">
                    <span class="summary-cell">{{ rows.brief || '-' }}</span>
                </template>
            </TableCustom>
        </div>

        <el-dialog
            :title="isEdit ? '编辑项目' : '新增项目'"
            v-model="visible"
            width="720px"
            destroy-on-close
            :close-on-click-modal="false"
            @close="closeDialog">
            <TableEdit :form-data="rowData" :options="options" :edit="isEdit" :update="updateData" />
        </el-dialog>

        <el-dialog title="项目详情" v-model="visibleDetail" width="720px" destroy-on-close>
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

<script setup lang="ts" name="cocreation-list">
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { CirclePlusFilled } from '@element-plus/icons-vue';
import TableCustom from '@/components/table-custom.vue';
import TableDetail from '@/components/table-detail.vue';
import TableEdit from '@/components/table-edit.vue';
import TableSearch from '@/components/table-search.vue';
import type { FormOption, FormOptionList } from '@/types/form-option';
import {
    fetchCoCreationList,
    createCoCreationProject,
    updateCoCreationProject,
    deleteCoCreationProject,
    updateCoCreationProjectStatus,
    type CoCreationProjectRecord,
    type CoCreationPayload,
} from '@/api/index';
import type { AxiosError } from 'axios';

const statusOptions = [
    { label: '待审核', value: 0, tag: 'warning' },
    { label: '已发布', value: 1, tag: 'success' },
    { label: '已归档', value: 2, tag: 'info' },
];

const query = reactive({
    keyword: '',
});
const searchOpt = ref<FormOptionList[]>([{ type: 'input', label: '项目名称：', prop: 'keyword' }]);
const handleSearch = () => {
    changePage(1);
};

const columns = ref([
    { type: 'selection' },
    { type: 'index', label: '序号', width: 55, align: 'center' },
    { prop: 'title', label: '项目名称', align: 'left', width: 220 },
    { prop: 'host', label: '主理方', width: 160 },
    { prop: 'city', label: '城市/场地', width: 150 },
    { prop: 'workMode', label: '工作方式', width: 150 },
    { prop: 'memberType', label: '岗位类型', width: 150 },
    { prop: 'cooperation', label: '合作方式', width: 150 },
    { prop: 'reward', label: '薪酬/分成', width: 160 },
    { prop: 'deadlineAt', label: '截止时间', width: 160 },
    { prop: 'status', label: '状态', width: 120 },
    { prop: 'certified', label: '认证', width: 120 },
    { prop: 'brief', label: '简介', align: 'left', width: 240 },
    { prop: 'operator', label: '操作', width: 220 },
]);

const page = reactive({
    index: 1,
    size: 10,
    total: 0,
});
const tableData = ref<CoCreationProjectRecord[]>([]);
const selectedRows = ref<CoCreationProjectRecord[]>([]);

const getSelectLabel = (options: Array<{ label: string; value: number }>, value?: number | null) => {
    const found = options.find((item) => item.value === value);
    return found ? found.label : '未设置';
};

const getStatusTag = (value?: number | null) => {
    const found = statusOptions.find((item) => item.value === value);
    return found?.tag ?? 'warning';
};

const getData = async () => {
    try {
        const res = await fetchCoCreationList({
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
        ElMessage.error(err.response?.data?.message || err.message || '加载在地共创项目失败');
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
    certified: false,
};

const options = ref<FormOption>({
    labelWidth: '120px',
    span: 24,
    list: [
        { type: 'input', label: '项目ID', prop: 'id', disabled: true, placeholder: '保存后自动生成' },
        { type: 'input', label: '项目名称', prop: 'title', required: true },
        { type: 'input', label: '主理方', prop: 'host', required: true },
        { type: 'input', label: '城市/场地', prop: 'city', required: true },
        { type: 'select', label: '状态', prop: 'status', opts: statusOptions },
        { type: 'switch', label: '认证项目', prop: 'certified', activeValue: true, inactiveValue: false },
        { type: 'input', label: '截止时间', prop: 'deadlineAt', placeholder: '例如 2025-01-15T12:00:00Z' },
        { type: 'input', label: '封面 URL', prop: 'coverUrl' },
        { type: 'input', label: '封面描述', prop: 'coverAlt' },
        { type: 'textarea', label: '项目简介', prop: 'brief', rows: 3 },
        { type: 'textarea', label: '团队介绍', prop: 'teamIntro', rows: 3 },
        { type: 'input', label: '工作方式', prop: 'workMode' },
        { type: 'input', label: '项目时长', prop: 'duration' },
        { type: 'input', label: '岗位类型', prop: 'memberType' },
        { type: 'input', label: '合作方式', prop: 'cooperation' },
        { type: 'input', label: '薪酬/分成', prop: 'reward' },
        { type: 'textarea', label: '项目要求', prop: 'requirement', rows: 3 },
        { type: 'input', label: '发布时间', prop: 'postedAt', placeholder: '例如 2025-01-10T08:00:00Z' },
        { type: 'number', label: '封面资源ID', prop: 'coverResourceId' },
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

const handleEdit = (row: CoCreationProjectRecord) => {
    rowData.value = { ...defaultFormValues, ...row };
    isEdit.value = true;
    visible.value = true;
};

const buildCoCreationPayload = (formValue: Record<string, any>): CoCreationPayload => {
    const payload: CoCreationPayload = {
        title: formValue.title,
        host: formValue.host,
        city: formValue.city,
        status: formValue.status,
        certified: formValue.certified,
        deadlineAt: formValue.deadlineAt,
        coverUrl: formValue.coverUrl,
        coverAlt: formValue.coverAlt,
        brief: formValue.brief,
        teamIntro: formValue.teamIntro,
        workMode: formValue.workMode,
        duration: formValue.duration,
        memberType: formValue.memberType,
        cooperation: formValue.cooperation,
        reward: formValue.reward,
        requirement: formValue.requirement,
        postedAt: formValue.postedAt,
        coverResourceId:
            formValue.coverResourceId !== undefined && formValue.coverResourceId !== ''
                ? Number(formValue.coverResourceId)
                : undefined,
    };
    return payload;
};

const updateData = async (formValue: Record<string, any>) => {
    const payload = buildCoCreationPayload(formValue);
    try {
        if (isEdit.value && formValue.id) {
            await updateCoCreationProject(formValue.id, payload);
            ElMessage.success('项目更新成功');
        } else {
            await createCoCreationProject(payload);
            ElMessage.success('项目创建成功');
        }
        closeDialog();
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '保存项目失败');
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
    list: [] as Array<{ prop: keyof CoCreationProjectRecord | string; label: string; span?: number; value?: string | number }>,
});

const handleView = (row: CoCreationProjectRecord) => {
    detailData.value = {
        title: row.title,
        column: 2,
        row,
        list: [
            { prop: 'title', label: '项目名称', span: 2 },
            { prop: 'host', label: '主理方' },
            { prop: 'city', label: '城市/场地' },
            { prop: 'workMode', label: '工作方式' },
            { prop: 'duration', label: '项目时长' },
            { prop: 'memberType', label: '岗位类型' },
            { prop: 'cooperation', label: '合作方式' },
            { prop: 'reward', label: '薪酬/分成' },
            { prop: 'status', label: '状态', value: getSelectLabel(statusOptions, row.status) },
            { prop: 'certified', label: '认证', value: row.certified ? '已认证' : '未认证' },
            { prop: 'deadlineAt', label: '截止时间' },
            { prop: 'brief', label: '项目简介', span: 2 },
            { prop: 'teamIntro', label: '团队介绍', span: 2 },
            { prop: 'requirement', label: '项目要求', span: 2 },
            { prop: 'coverUrl', label: '封面 URL', span: 2 },
            { prop: 'postedAt', label: '发布时间' },
            { prop: 'createdAt', label: '创建时间' },
            { prop: 'updatedAt', label: '更新时间' },
        ],
    };
    visibleDetail.value = true;
};

const handleDelete = async (row: CoCreationProjectRecord) => {
    try {
        await deleteCoCreationProject(row.id);
        ElMessage.success('删除项目成功');
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '删除项目失败');
    }
};

const handleSelectionChange = (rows: CoCreationProjectRecord[]) => {
    selectedRows.value = rows;
};

const statusDialogVisible = ref(false);
const statusForm = reactive({
    status: 0,
});
const statusTarget = ref<CoCreationProjectRecord | null>(null);

const openStatusDialog = () => {
    if (!selectedRows.value.length) {
        ElMessage.warning('请选择需要修改的项目');
        return;
    }
    if (selectedRows.value.length > 1) {
        ElMessage.warning('一次只能修改一个项目的状态');
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
        await updateCoCreationProjectStatus(statusTarget.value.id, statusForm.status);
        ElMessage.success('项目状态更新成功');
        statusDialogVisible.value = false;
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '更新项目状态失败');
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
