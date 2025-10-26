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
                    <el-button type="warning" :icon="CirclePlusFilled" @click="visible = true">新增社区</el-button>
                </template>
                <template #status="{ rows }">
                    <el-tag :type="rows.status === 1 ? 'success' : 'warning'">
                        {{ rows.status === 1 ? '启用' : '停用' }}
                    </el-tag>
                </template>
                <template #summary="{ rows }">
                    <span class="summary-cell">
                        {{ rows.summary || '-' }}
                    </span>
                </template>
            </TableCustom>
        </div>

        <el-dialog
            :title="isEdit ? '编辑社区' : '新增社区'"
            v-model="visible"
            width="700px"
            destroy-on-close
            :close-on-click-modal="false"
            @close="closeDialog">
            <TableEdit :form-data="rowData" :options="options" :edit="isEdit" :update="updateData">
                <template #thumb="{ rows }">
                    <img class="table-td-thumb" :src="rows.thumb" />
                </template>
            </TableEdit>
        </el-dialog>

        <el-dialog title="社区详情" v-model="visibleDetail" width="700px" destroy-on-close>
            <TableDetail :data="detailData"></TableDetail>
        </el-dialog>
    </div>
</template>

<script setup lang="ts" name="community-info">
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { CirclePlusFilled } from '@element-plus/icons-vue';
import TableCustom from '@/components/table-custom.vue';
import TableDetail from '@/components/table-detail.vue';
import TableEdit from '@/components/table-edit.vue';
import TableSearch from '@/components/table-search.vue';
import type { FormOption, FormOptionList } from '@/types/form-option';
import { fetchCommunityList, type CommunityRecord } from '@/api/index';
import type { AxiosError } from 'axios';

const query = reactive({
    keyword: '',
});
const searchOpt = ref<FormOptionList[]>([{ type: 'input', label: '社区名称：', prop: 'keyword' }]);
const handleSearch = () => {
    changePage(1);
};

const columns = ref([
    { type: 'selection' },
    { type: 'index', label: '序号', width: 55, align: 'center' },
    { prop: 'name', label: '社区名称', align: 'left' },
    { prop: 'shortName', label: '简称' },
    { prop: 'city', label: '城市' },
    { prop: 'province', label: '省份' },
    { prop: 'country', label: '国家/地区' },
    { prop: 'address', label: '详细地址', align: 'left', width: 260 },
    { prop: 'status', label: '状态' },
    { prop: 'summary', label: '摘要', align: 'left', width: 260 },
    { prop: 'operator', label: '操作', width: 220 },
]);

const page = reactive({
    index: 1,
    size: 10,
    total: 0,
});
const tableData = ref<CommunityRecord[]>([]);
const loading = ref(false);

const getData = async () => {
    loading.value = true;
    try {
        const res = await fetchCommunityList({
            page: page.index,
            size: page.size,
        });
        const payload = res.data.data;
        const list = payload?.list ?? [];
        tableData.value = list;
        page.total = payload?.total ?? list.length ?? 0;
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '加载社区数据失败');
        tableData.value = [];
        page.total = 0;
    } finally {
        loading.value = false;
    }
};
getData();

const changePage = (val: number) => {
    page.index = val;
    getData();
};

const options = ref<FormOption>({
    labelWidth: '120px',
    span: 24,
    list: [
        { type: 'input', label: '社区名称', prop: 'name', required: true },
        { type: 'input', label: '简称', prop: 'shortName' },
        { type: 'input', label: '城市', prop: 'city' },
        { type: 'input', label: '省份', prop: 'province' },
        { type: 'switch', label: '状态', prop: 'status', activeText: '启用', inactiveText: '停用' },
    ],
});

const visible = ref(false);
const isEdit = ref(false);
const rowData = ref<Record<string, any>>({});

const handleEdit = (row: CommunityRecord) => {
    rowData.value = { ...row };
    isEdit.value = true;
    visible.value = true;
};

const updateData = () => {
    closeDialog();
};

const closeDialog = () => {
    visible.value = false;
    isEdit.value = false;
    rowData.value = {};
};

const visibleDetail = ref(false);
const detailData = ref({
    row: {},
    list: [] as Array<{ prop: string; label: string }>,
});

const handleView = (row: CommunityRecord) => {
    detailData.value.row = { ...row };
    detailData.value.list = [
        { prop: 'id', label: '社区ID' },
        { prop: 'name', label: '社区名称' },
        { prop: 'shortName', label: '简称' },
        { prop: 'nameEn', label: '英文名' },
        { prop: 'status', label: '状态', value: row.status === 1 ? '启用' : '停用' },
        { prop: 'city', label: '城市' },
        { prop: 'province', label: '省份' },
        { prop: 'country', label: '国家' },
        { prop: 'address', label: '地址' },
        { prop: 'timezone', label: '时区' },
        { prop: 'lifeFacilities', label: '生活设施' },
        { prop: 'summary', label: '摘要' },
        { prop: 'tags', label: '标签', value: Array.isArray(row.tags) ? row.tags.join(', ') : '-' },
        { prop: 'refundPolicy', label: '退改政策' },
        { prop: 'description', label: '社区描述' },
        { prop: 'createdAt', label: '创建时间' },
        { prop: 'updatedAt', label: '更新时间' },
    ];
    visibleDetail.value = true;
};

const handleDelete = () => {
    ElMessage.info('暂未开放删除功能');
};
</script>

<style scoped>
.table-td-thumb {
    display: block;
    margin: auto;
    width: 40px;
    height: 40px;
}

.summary-cell {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    line-height: 20px;
}
</style>
