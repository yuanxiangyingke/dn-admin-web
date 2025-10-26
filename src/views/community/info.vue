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
                <template #state="{ rows }">
                    <el-tag :type="rows.state ? 'success' : 'warning'">
                        {{ rows.state ? '运营中' : '维护中' }}
                    </el-tag>
                </template>
                <template #thumb="{ rows }">
                    <el-image
                        class="table-td-thumb"
                        :src="rows.thumb"
                        :z-index="10"
                        :preview-src-list="[rows.thumb]"
                        preview-teleported />
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
            <TableDetail :data="detailData">
                <template #thumb="{ rows }">
                    <el-image :src="rows.thumb"></el-image>
                </template>
            </TableDetail>
        </el-dialog>
    </div>
</template>

<script setup lang="ts" name="community-info">
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { CirclePlusFilled } from '@element-plus/icons-vue';
import { fetchData } from '@/api/index';
import TableCustom from '@/components/table-custom.vue';
import TableDetail from '@/components/table-detail.vue';
import TableEdit from '@/components/table-edit.vue';
import TableSearch from '@/components/table-search.vue';
import type { TableItem } from '@/types/table';
import type { FormOption, FormOptionList } from '@/types/form-option';

const query = reactive({
    name: '',
});
const searchOpt = ref<FormOptionList[]>([{ type: 'input', label: '社区名称：', prop: 'name' }]);
const handleSearch = () => {
    changePage(1);
};

const columns = ref([
    { type: 'selection' },
    { type: 'index', label: '序号', width: 55, align: 'center' },
    { prop: 'name', label: '社区名称' },
    { prop: 'money', label: '住户数量' },
    { prop: 'thumb', label: '社区图标' },
    { prop: 'state', label: '运行状态' },
    { prop: 'operator', label: '操作', width: 250 },
]);

const page = reactive({
    index: 1,
    size: 10,
    total: 200,
});
const tableData = ref<TableItem[]>([]);

const getData = async () => {
    const res = await fetchData();
    tableData.value = res.data.list;
};
getData();

const changePage = (val: number) => {
    page.index = val;
    getData();
};

const options = ref<FormOption>({
    labelWidth: '100px',
    span: 24,
    list: [
        { type: 'input', label: '社区名称', prop: 'name', required: true },
        { type: 'number', label: '住户数量', prop: 'money', required: true },
        { type: 'switch', label: '运行状态', prop: 'state', activeText: '运营中', inactiveText: '维护中', required: true },
        { type: 'upload', label: '社区图标', prop: 'thumb', required: true },
    ],
});

const visible = ref(false);
const isEdit = ref(false);
const rowData = ref<Record<string, any>>({});

const handleEdit = (row: TableItem) => {
    rowData.value = { ...row };
    isEdit.value = true;
    visible.value = true;
};

const updateData = () => {
    closeDialog();
    getData();
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

const handleView = (row: TableItem) => {
    detailData.value.row = { ...row };
    detailData.value.list = [
        { prop: 'id', label: '社区ID' },
        { prop: 'name', label: '社区名称' },
        { prop: 'money', label: '住户数量' },
        { prop: 'state', label: '运行状态' },
        { prop: 'thumb', label: '社区图标' },
    ];
    visibleDetail.value = true;
};

const handleDelete = () => {
    ElMessage.success('删除成功');
};
</script>

<style scoped>
.table-td-thumb {
    display: block;
    margin: auto;
    width: 40px;
    height: 40px;
}
</style>
