<template>
    <div>
        <TableSearch :query="query" :options="searchOpt" :search="handleSearch" />
        <input ref="fileInputRef" type="file" accept="image/*" style="display: none" @change="onFileChange" />
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
                    <el-button type="primary" :icon="CirclePlusFilled" @click="handleCreate">新增照片</el-button>
                    <el-button type="primary" plain :icon="Refresh" @click="getData" style="margin-left: 10px">
                        刷新
                    </el-button>
                </template>
                <template #url="{ rows }">
                    <el-space direction="vertical" alignment="start">
                        <el-image
                            v-if="rows.url"
                            :src="rows.url"
                            :preview-src-list="[rows.url]"
                            :preview-teleported="true"
                            fit="cover"
                            referrer-policy="no-referrer"
                            style="width: 120px; height: 80px; border-radius: 4px" />
                        <el-link v-if="rows.url" :href="rows.url" target="_blank" type="primary">{{ rows.url }}</el-link>
                        <span v-else>-</span>
                    </el-space>
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

        <el-dialog :title="isEdit ? '编辑照片' : '新增照片'" v-model="visible" width="640px" destroy-on-close>
            <div class="upload-bar">
                <el-button type="primary" :icon="UploadFilled" @click="triggerFileSelect" :loading="uploading">
                    {{ uploading ? '上传中...' : '上传图片' }}
                </el-button>
                <div v-if="rowData.url" class="uploaded-tip">
                    <span class="uploaded-label">已上传：</span>
                    <el-link :href="rowData.url" target="_blank" type="primary" class="uploaded-link">
                        {{ rowData.url }}
                    </el-link>
                    <el-image
                        v-if="rowData.url"
                        :src="rowData.url"
                        :preview-src-list="[rowData.url]"
                        :preview-teleported="true"
                        fit="cover"
                        referrer-policy="no-referrer"
                        class="uploaded-thumb" />
                </div>
            </div>
            <TableEdit :form-data="rowData" :options="options" :edit="isEdit" :update="updateData">
                <template #resourceId>
                    <el-input
                        v-model="rowData.resourceId"
                        disabled
                        placeholder="上传后自动填充，无法手动填写" />
                </template>
            </TableEdit>
        </el-dialog>

        <el-dialog title="照片详情" v-model="detailVisible" width="640px" destroy-on-close>
            <TableDetail :data="detailData">
                <template #url="{ rows }">
                    <el-space direction="vertical" alignment="start" class="detail-media">
                        <el-image
                            v-if="rows.url"
                            :src="rows.url"
                            :preview-src-list="[rows.url]"
                            :preview-teleported="true"
                            fit="cover"
                            referrer-policy="no-referrer"
                            style="width: 200px; height: 140px; border-radius: 4px" />
                        <div v-if="rows.url" class="detail-url">
                            <el-link :href="rows.url" target="_blank" type="primary">打开链接</el-link>
                            <el-button link type="primary" size="small" @click="copyUrl(rows.url)">复制</el-button>
                            <div class="detail-url-text">{{ rows.url }}</div>
                        </div>
                        <span v-else>-</span>
                    </el-space>
                </template>
            </TableDetail>
        </el-dialog>
    </div>
</template>

<script setup lang="ts" name="room-photos">
import { reactive, ref } from 'vue';
import { CirclePlusFilled, Delete, Edit, Refresh, UploadFilled, View } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import TableCustom from '@/components/table-custom.vue';
import TableDetail from '@/components/table-detail.vue';
import TableEdit from '@/components/table-edit.vue';
import TableSearch from '@/components/table-search.vue';
import type { FormOption, FormOptionList } from '@/types/form-option';
import {
    fetchRoomPhotoList,
    createRoomPhoto,
    updateRoomPhoto,
    deleteRoomPhoto,
    type RoomPhotoRecord,
    type RoomPhotoPayload,
    createOssPolicy,
    type OssPolicyResult,
    createResourceAsset,
} from '@/api/index';
import type { ResourceAsset } from '@/types/resource';
import type { AxiosError } from 'axios';

const query = reactive({
    keyword: '',
    roomId: '',
});

const searchOpt = ref<FormOptionList[]>([
    { type: 'input', label: '关键词：', prop: 'keyword', placeholder: '图片说明/URL' },
    { type: 'input', label: '房间ID：', prop: 'roomId', placeholder: '房间 ID' },
]);

const handleSearch = () => {
    changePage(1);
};

const columns = ref([
    { type: 'selection' },
    { type: 'index', label: '序号', width: 60, align: 'center' },
    { prop: 'id', label: 'ID', width: 90 },
    { prop: 'roomId', label: '房间ID', width: 110 },
    { prop: 'url', label: '图片', width: 280, align: 'left' },
    { prop: 'caption', label: '说明', align: 'left', width: 180 },
    { prop: 'sortOrder', label: '排序', width: 80 },
    { prop: 'resourceId', label: '资源ID', width: 110 },
    { prop: 'createdAt', label: '创建时间', width: 180 },
    { prop: 'operator', label: '操作', width: 240 },
]);

const page = reactive({
    index: 1,
    size: 10,
    total: 0,
});

const tableData = ref<RoomPhotoRecord[]>([]);
const selectedRows = ref<RoomPhotoRecord[]>([]);
const uploading = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const getData = async () => {
    try {
        const res = await fetchRoomPhotoList({
            page: page.index,
            size: page.size,
            keyword: query.keyword || undefined,
            roomId: query.roomId || undefined,
        });
        const payload = res.data.data;
        const list = payload?.list ?? [];
        tableData.value = list;
        page.total = payload?.total ?? list.length ?? 0;
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '加载照片列表失败');
        tableData.value = [];
        page.total = 0;
    }
};
getData();

const changePage = (val: number) => {
    page.index = val;
    getData();
};

const defaultFormValues: RoomPhotoPayload = {
    roomId: undefined,
    url: '',
    caption: '',
    sortOrder: 0,
    resourceId: undefined,
};

const options = ref<FormOption>({
    labelWidth: '120px',
    span: 24,
    list: [
        { type: 'input', label: 'ID', prop: 'id', disabled: true, placeholder: '保存后自动生成' },
        { type: 'number', label: '房间ID', prop: 'roomId', required: true },
        { type: 'input', label: '图片说明', prop: 'caption', placeholder: '可选' },
        { type: 'number', label: '排序', prop: 'sortOrder', placeholder: '数字越大越靠前' },
        { type: 'slot', label: '资源ID', prop: 'resourceId' },
        { type: 'input', label: '创建时间', prop: 'createdAt', disabled: true },
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

const handleEdit = (row: RoomPhotoRecord) => {
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
            await updateRoomPhoto(id, payload);
            ElMessage.success('更新成功');
        } else {
            await createRoomPhoto(payload);
            ElMessage.success('创建成功');
        }
        visible.value = false;
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '保存失败');
    }
};

const handleDelete = async (row: RoomPhotoRecord) => {
    try {
        await ElMessageBox.confirm('确定要删除该照片吗？', '提示', { type: 'warning' });
        await deleteRoomPhoto(row.id);
        ElMessage.success('删除成功');
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        if ((err as Error)?.message?.includes('cancel')) return;
        ElMessage.error(err.response?.data?.message || err.message || '删除失败');
    }
};

const handleBatchDelete = async (rows: RoomPhotoRecord[]) => {
    if (!rows.length) return;
    const ids = rows.map((item) => item.id).filter(Boolean);
    if (!ids.length) {
        ElMessage.error('选中的记录缺少ID');
        return;
    }
    try {
        await ElMessageBox.confirm(`确定删除选中的 ${ids.length} 条照片吗？`, '提示', { type: 'warning' });
        await Promise.all(ids.map((id) => deleteRoomPhoto(id)));
        ElMessage.success('删除成功');
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        if ((err as Error)?.message?.includes('cancel')) return;
        ElMessage.error(err.response?.data?.message || err.message || '删除失败');
    }
};

const selectedRowsChange = (rows: RoomPhotoRecord[]) => {
    selectedRows.value = rows;
};

const handleSelectionChange = (rows: RoomPhotoRecord[]) => {
    selectedRowsChange(rows);
};

const detailVisible = ref(false);
const detailData = ref({
    title: '照片详情',
    row: {},
    column: 2,
    list: [] as Array<{ label: string; prop: string; span?: number; value?: unknown }>,
});

const buildDetailData = (row: RoomPhotoRecord) => {
    detailData.value = {
        title: '照片详情',
        row,
        column: 2,
        list: [
            { label: 'ID', prop: 'id' },
            { label: '房间ID', prop: 'roomId' },
            { label: '图片', prop: 'url', span: 2 },
            { label: '说明', prop: 'caption', span: 2 },
            { label: '排序', prop: 'sortOrder' },
            { label: '资源ID', prop: 'resourceId' },
            { label: '创建时间', prop: 'createdAt' },
        ],
    };
};

const handleView = (row: RoomPhotoRecord) => {
    buildDetailData(row);
    detailVisible.value = true;
};

const triggerFileSelect = () => {
    if (uploading.value) return;
    fileInputRef.value?.click();
};

const guessResourceType = (mime: string) => {
    if (mime.startsWith('image/')) return 'IMAGE';
    if (mime.startsWith('video/')) return 'VIDEO';
    if (mime.startsWith('audio/')) return 'AUDIO';
    if (
        mime.includes('pdf') ||
        mime.includes('text') ||
        mime.includes('msword') ||
        mime.includes('officedocument')
    ) {
        return 'DOCUMENT';
    }
    return 'OTHER';
};

const parseOssInfo = (host: string) => {
    try {
        const url = new URL(host);
        const [bucketPart, regionPart] = url.hostname.split('.oss-');
        const bucket = bucketPart;
        const region = regionPart?.replace('.aliyuncs.com', '') ?? '';
        return { bucket, region };
    } catch {
        return { bucket: '', region: '' };
    }
};

const extractResourceId = (asset?: ResourceAsset | null) => {
    if (!asset) return undefined;
    if (asset.resourceId) return asset.resourceId as number | string;
    if ((asset as Record<string, unknown>).resource_id) {
        return (asset as Record<string, unknown>).resource_id as number | string;
    }
    return asset.id;
};

const uploadToOss = async (policy: OssPolicyResult, file: File) => {
    const form = new FormData();
    form.append('key', policy.key);
    form.append('policy', policy.policy);
    form.append('OSSAccessKeyId', policy.accessKeyId);
    form.append('signature', policy.signature);
    form.append('success_action_status', '200');
    form.append('file', file);
    const response = await fetch(policy.host, { method: 'POST', body: form });
    if (!response.ok) {
        throw new Error(`OSS 上传失败，状态码 ${response.status}`);
    }
    const etag = response.headers.get('etag') || response.headers.get('ETag');
    return {
        url: `${policy.host}/${policy.key}`,
        checksum: etag ? etag.replaceAll('"', '') : undefined,
    };
};

const handleFileUpload = async (file: File) => {
    const uploadDir = 'prod/admin/upload/room-photos/';
    uploading.value = true;
    try {
        const policyRes = await createOssPolicy({
            fileName: file.name,
            contentType: file.type,
            dir: uploadDir,
        });
        const policy = policyRes.data?.data;
        if (!policy) throw new Error('获取上传凭证失败');
        const ossResult = await uploadToOss(policy, file);
        const { bucket, region } = parseOssInfo(policy.host);
        const resourcePayload: ResourceAsset = {
            resourceType: guessResourceType(file.type),
            storageProvider: 'ALIYUN_OSS',
            bucket,
            region,
            objectKey: policy.key,
            fileName: file.name,
            url: ossResult.url,
            contentType: file.type,
            sizeBytes: file.size,
            checksum: ossResult.checksum,
            status: 'ACTIVE',
            visibility: 'PUBLIC',
        };
        const resourceRes = await createResourceAsset(resourcePayload);
        const asset = resourceRes.data?.data;
        rowData.value.url = asset?.url || resourcePayload.url;
        rowData.value.resourceId = extractResourceId(asset);
        ElMessage.success('图片上传成功，资源已创建');
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '上传失败');
    } finally {
        uploading.value = false;
        if (fileInputRef.value) {
            fileInputRef.value.value = '';
        }
    }
};

const onFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length) {
        handleFileUpload(files[0]);
    }
};

const copyUrl = async (url?: string) => {
    if (!url) {
        ElMessage.warning('没有可复制的链接');
        return;
    }
    try {
        await navigator.clipboard.writeText(url);
        ElMessage.success('链接已复制');
    } catch (error) {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        ElMessage.success('链接已复制');
    }
};
</script>

<style scoped>
.uploaded-tip {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 12px;
    flex-wrap: wrap;
}

.uploaded-label {
    color: var(--el-text-color-primary);
}

.uploaded-link {
    max-width: 360px;
    word-break: break-all;
}

.uploaded-thumb {
    width: 72px;
    height: 72px;
    border-radius: 6px;
    border: 1px solid var(--el-border-color-light);
    object-fit: cover;
}

.detail-media {
    width: 100%;
}

.detail-url {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 100%;
}

.detail-url-text {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    word-break: break-all;
    line-height: 1.4;
}
</style>
