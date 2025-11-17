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
                    <el-button type="warning" :icon="CirclePlusFilled" @click="handleCreate">新增房源</el-button>
                </template>
                <template #status="{ rows }">
                    <el-tag :type="rows.status === 'published' ? 'success' : 'info'">
                        {{ getSelectLabel(statusOptions, rows.status) }}
                    </el-tag>
                </template>
                <template #roomType="{ rows }">
                    {{ getSelectLabel(roomTypeOptions, rows.roomType) }}
                </template>
                <template #description="{ rows }">
                    <span class="summary-cell">{{ rows.description || '-' }}</span>
                </template>
            </TableCustom>
        </div>

        <el-dialog
            :title="isEdit ? '编辑房源' : '新增房源'"
            v-model="visible"
            width="640px"
            destroy-on-close
            :close-on-click-modal="false"
            @close="closeDialog">
            <TableEdit :form-data="rowData" :options="options" :edit="isEdit" :update="updateData" />
        </el-dialog>

        <el-dialog title="房源详情" v-model="visibleDetail" width="640px" destroy-on-close>
            <TableDetail :data="detailData" />
        </el-dialog>
    </div>
</template>

<script setup lang="ts" name="room-list">
import { reactive, ref } from 'vue';
import { CirclePlusFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import TableCustom from '@/components/table-custom.vue';
import TableDetail from '@/components/table-detail.vue';
import TableEdit from '@/components/table-edit.vue';
import TableSearch from '@/components/table-search.vue';
import type { FormOption, FormOptionList } from '@/types/form-option';
import { fetchRoomList, createRoom, updateRoom, deleteRoom, type RoomRecord, type RoomPayload } from '@/api/index';
import type { AxiosError } from 'axios';

const statusOptions = [
    { label: '已发布', value: 'published' },
    { label: '已下线', value: 'offline' },
];
const roomTypeOptions = [
    { label: '独立房间', value: 'private' },
    { label: '共享房间', value: 'shared' },
];

const query = reactive({
    keyword: '',
});
const searchOpt = ref<FormOptionList[]>([{ type: 'input', label: '房源名称：', prop: 'keyword' }]);
const handleSearch = () => {
    changePage(1);
};

const columns = ref([
    { type: 'selection' },
    { type: 'index', label: '序号', width: 55, align: 'center' },
    { prop: 'name', label: '房源名称', align: 'left', width: 200 },
    { prop: 'code', label: '房屋编码', width: 140 },
    { prop: 'communityId', label: '社区ID', width: 110 },
    { prop: 'roomType', label: '房型', width: 120 },
    { prop: 'status', label: '状态', width: 120 },
    { prop: 'description', label: '房源描述', align: 'left', width: 240 },
    { prop: 'createdAt', label: '创建时间', width: 160 },
    { prop: 'operator', label: '操作', width: 220 },
]);

const page = reactive({
    index: 1,
    size: 10,
    total: 0,
});
const tableData = ref<RoomRecord[]>([]);

const getSelectLabel = (options: Array<{ label: string; value: string }>, value?: string | null) => {
    const found = options.find((item) => item.value === value);
    return found ? found.label : '未设置';
};

const getData = async () => {
    try {
        const res = await fetchRoomList({
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
        ElMessage.error(err.response?.data?.message || err.message || '加载房源失败');
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
    status: 'published',
    roomType: 'private',
};

const options = ref<FormOption>({
    labelWidth: '120px',
    span: 24,
    list: [
        { type: 'input', label: '房源ID', prop: 'id', disabled: true, placeholder: '保存后自动生成' },
        { type: 'number', label: '社区ID', prop: 'communityId', required: true },
        { type: 'input', label: '房源名称', prop: 'name', required: true },
        { type: 'input', label: '房屋编码', prop: 'code' },
        { type: 'select', label: '状态', prop: 'status', opts: statusOptions },
        { type: 'select', label: '房型', prop: 'roomType', opts: roomTypeOptions },
        { type: 'textarea', label: '房源描述', prop: 'description', rows: 4 },
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

const handleEdit = (row: RoomRecord) => {
    rowData.value = { ...defaultFormValues, ...row };
    isEdit.value = true;
    visible.value = true;
};

const buildRoomPayload = (formValue: Record<string, any>): RoomPayload => {
    const payload: RoomPayload = {
        communityId: formValue.communityId,
        name: formValue.name,
        code: formValue.code,
        status: formValue.status,
        roomType: formValue.roomType,
        description: formValue.description,
    };
    return payload;
};

const updateData = async (formValue: Record<string, any>) => {
    const payload = buildRoomPayload(formValue);
    try {
        if (isEdit.value && formValue.id) {
            await updateRoom(formValue.id, payload);
            ElMessage.success('房源更新成功');
        } else {
            await createRoom(payload);
            ElMessage.success('房源创建成功');
        }
        closeDialog();
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '保存房源失败');
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
    list: [] as Array<{ prop: keyof RoomRecord | string; label: string; span?: number; value?: string | number }>,
});

const handleView = (row: RoomRecord) => {
    detailData.value = {
        title: row.name,
        column: 2,
        row,
        list: [
            { prop: 'name', label: '房源名称', span: 2 },
            { prop: 'communityId', label: '社区ID' },
            { prop: 'code', label: '房屋编码' },
            { prop: 'roomType', label: '房型', value: getSelectLabel(roomTypeOptions, row.roomType) },
            { prop: 'status', label: '状态', value: getSelectLabel(statusOptions, row.status) },
            { prop: 'description', label: '描述', span: 2 },
            { prop: 'createdAt', label: '创建时间' },
            { prop: 'updatedAt', label: '更新时间' },
        ],
    };
    visibleDetail.value = true;
};

const handleDelete = async (row: RoomRecord) => {
    try {
        await deleteRoom(row.id);
        ElMessage.success('删除房源成功');
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '删除房源失败');
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
