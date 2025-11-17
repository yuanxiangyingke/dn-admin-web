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
                    <el-button type="warning" :icon="CirclePlusFilled" @click="handleCreate">新增社区</el-button>
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
import {
    fetchCommunityList,
    createCommunity,
    updateCommunity,
    deleteCommunity,
    type CommunityRecord,
    type CommunityPayload,
} from '@/api/index';
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
        { type: 'input', label: '社区ID', prop: 'id', disabled: true, placeholder: '保存后自动生成' },
        { type: 'input', label: '社区名称', prop: 'name', required: true },
        { type: 'input', label: '简称', prop: 'shortName' },
        { type: 'input', label: '英文名', prop: 'nameEn' },
        {
            type: 'switch',
            label: '状态',
            prop: 'status',
            activeText: '启用',
            inactiveText: '停用',
            activeValue: 1,
            inactiveValue: 0,
        },
        { type: 'input', label: '城市', prop: 'city' },
        { type: 'input', label: '省份', prop: 'province' },
        { type: 'input', label: '国家/地区', prop: 'country' },
        { type: 'input', label: '详细地址', prop: 'address' },
        { type: 'input', label: '时区', prop: 'timezone' },
        { type: 'textarea', label: '生活设施', prop: 'lifeFacilities', rows: 2 },
        { type: 'textarea', label: '摘要', prop: 'summary', rows: 3 },
        { type: 'input', label: '标签', prop: 'tags', placeholder: '使用逗号分隔' },
        { type: 'textarea', label: '退改政策', prop: 'refundPolicy', rows: 3 },
        { type: 'textarea', label: '社区描述', prop: 'description', rows: 4 },
        { type: 'input', label: '创建时间', prop: 'createdAt', disabled: true },
        { type: 'input', label: '更新时间', prop: 'updatedAt', disabled: true },
    ],
});

const visible = ref(false);
const isEdit = ref(false);
const rowData = ref<Record<string, any>>({});

const formatTagsForEdit = (tags?: CommunityRecord['tags']) => {
    if (Array.isArray(tags)) {
        return tags.join(', ');
    }
    return tags ?? '';
};

const handleEdit = (row: CommunityRecord) => {
    rowData.value = { ...row, tags: formatTagsForEdit(row.tags) };
    isEdit.value = true;
    visible.value = true;
};

const handleCreate = () => {
    rowData.value = {
        status: 1,
        tags: '',
    };
    isEdit.value = false;
    visible.value = true;
};

const normalizeTags = (value: unknown): string[] | null => {
    if (Array.isArray(value)) {
        const normalized = value
            .map((item) => (typeof item === 'string' ? item.trim() : item))
            .filter((item): item is string => typeof item === 'string' && item.length > 0);
        return normalized.length ? normalized : null;
    }
    if (typeof value === 'string') {
        const normalized = value
            .split(',')
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
        return normalized.length ? normalized : null;
    }
    return null;
};

const toNumberOrNull = (value: unknown) => {
    if (value === '' || value === null || value === undefined) {
        return null;
    }
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(num) ? null : num;
};

const buildCommunityPayload = (formValue: Record<string, any>): CommunityPayload => {
    const payload: CommunityPayload = {};
    const {
        name,
        shortName,
        nameEn,
        status,
        operatorUserId,
        city,
        province,
        country,
        address,
        latitude,
        longitude,
        timezone,
        summary,
        lifeFacilities,
        description,
        ratingAvg,
        ratingCount,
        tags,
        refundPolicy,
    } = formValue;

    if (name) payload.name = name.trim();
    if (shortName) payload.shortName = shortName.trim();
    if (nameEn) payload.nameEn = nameEn.trim();
    if (status !== undefined && status !== null) payload.status = status;
    const operatorUserIdNumber = toNumberOrNull(operatorUserId);
    if (operatorUserIdNumber !== null) payload.operatorUserId = operatorUserIdNumber;
    if (city) payload.city = city.trim();
    if (province) payload.province = province.trim();
    if (country) payload.country = country.trim();
    if (address) payload.address = address.trim();
    if (timezone) payload.timezone = timezone.trim();
    if (summary) payload.summary = summary.trim();
    if (lifeFacilities) payload.lifeFacilities = lifeFacilities.trim();
    if (description) payload.description = description.trim();
    const latitudeNumber = toNumberOrNull(latitude);
    if (latitudeNumber !== null) payload.latitude = latitudeNumber;
    const longitudeNumber = toNumberOrNull(longitude);
    if (longitudeNumber !== null) payload.longitude = longitudeNumber;
    const ratingAvgNumber = toNumberOrNull(ratingAvg);
    if (ratingAvgNumber !== null) payload.ratingAvg = ratingAvgNumber;
    const ratingCountNumber = toNumberOrNull(ratingCount);
    if (ratingCountNumber !== null) payload.ratingCount = ratingCountNumber;
    const normalizedTags = normalizeTags(tags);
    if (normalizedTags !== null) {
        payload.tags = normalizedTags;
    } else if (
        (typeof tags === 'string' && tags.trim() === '') ||
        (Array.isArray(tags) && tags.length === 0)
    ) {
        payload.tags = [];
    }
    if (refundPolicy) payload.refundPolicy = refundPolicy.trim();

    return payload;
};

const updateData = async (formValue: Record<string, any>) => {
    if (!formValue.name || !formValue.name.trim()) {
        ElMessage.error('请填写社区名称');
        return;
    }

    const payload = buildCommunityPayload(formValue);
    try {
        if (isEdit.value) {
            const id = rowData.value.id;
            if (id === undefined || id === null) {
                ElMessage.error('缺少社区ID，无法更新');
                return;
            }
            await updateCommunity(id, payload);
            ElMessage.success('社区更新成功');
        } else {
            await createCommunity(payload);
            ElMessage.success('社区新增成功');
        }
        closeDialog();
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '保存失败');
    }
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

const handleDelete = async (row: CommunityRecord) => {
    try {
        await deleteCommunity(row.id);
        ElMessage.success('删除成功');
        if (tableData.value.length === 1 && page.index > 1) {
            page.index -= 1;
        }
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '删除失败');
    }
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
