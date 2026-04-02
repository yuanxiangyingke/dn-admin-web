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
                :delFunc="handleDelete">
                <template #url="{ rows }">
                    <el-link v-if="rows.url" :href="rows.url" target="_blank" type="primary">{{ rows.url }}</el-link>
                    <span v-else>-</span>
                </template>
                <template #sizeBytes="{ rows }">
                    {{ formatSize(rows.sizeBytes) }}
                </template>
                <template #operator="{ rows }">
                    <el-button type="danger" plain size="small" @click="handleDelete(rows)">删除</el-button>
                </template>
            </TableCustom>
        </div>
    </div>
</template>

<script setup lang="ts" name="resource-list">
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { AxiosError } from 'axios';
import TableCustom from '@/components/table-custom.vue';
import TableSearch from '@/components/table-search.vue';
import { deleteResourceAsset, fetchResourceAssets } from '@/api/index';
import type { FormOptionList } from '@/types/form-option';
import type { ResourceAsset } from '@/types/resource';

const query = reactive({
    keyword: '',
});

const searchOpt = ref<FormOptionList[]>([{ type: 'input', label: '关键词：', prop: 'keyword', placeholder: '文件名/URL' }]);

const columns = ref([
    { type: 'index', label: '序号', width: 60, align: 'center' },
    { prop: 'id', label: 'ID', width: 90 },
    { prop: 'fileName', label: '文件名', width: 220, align: 'left' },
    { prop: 'resourceType', label: '资源类型', width: 120 },
    { prop: 'contentType', label: 'MIME 类型', width: 180 },
    { prop: 'sizeBytes', label: '大小', width: 120 },
    { prop: 'status', label: '状态', width: 100 },
    { prop: 'visibility', label: '可见性', width: 100 },
    { prop: 'url', label: '链接', align: 'left', width: 260 },
    { prop: 'createdAt', label: '创建时间', width: 180 },
    { prop: 'operator', label: '操作', width: 120 },
]);

const page = reactive({
    index: 1,
    size: 10,
    total: 0,
});

const tableData = ref<ResourceAsset[]>([]);

const handleSearch = () => {
    changePage(1);
};

const getData = async () => {
    try {
        const res = await fetchResourceAssets({
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
        ElMessage.error(err.response?.data?.message || err.message || '加载资源失败');
        tableData.value = [];
        page.total = 0;
    }
};

const changePage = (val: number) => {
    page.index = val;
    getData();
};

const handleDelete = async (row: ResourceAsset) => {
    try {
        if (!row.id) {
            ElMessage.error('资源 ID 不存在');
            return;
        }
        await deleteResourceAsset(row.id);
        ElMessage.success('删除成功');
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '删除资源失败');
    }
};

const formatSize = (value?: number) => {
    if (!value) return '-';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

getData();
</script>
