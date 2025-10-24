<template>
    <div>
        <TableSearch :query="query" :options="searchOpt" :search="handleSearch" />
        <div class="container">

            <TableCustom
                :columns="columns"
                :tableData="tableData"
                :total="page.total"
                :current-page="page.index"
                :page-size="page.size"
                :viewFunc="handleView"
                :delFunc="handleDelete"
                :page-change="changePage"
                :editFunc="handleEdit"
                :refresh="getData"
            >
                <template #toolbarBtn>
                    <el-button type="warning" :icon="CirclePlusFilled" @click="handleCreate">新增</el-button>
                </template>
                <template #permissions="{ rows }">
                    <el-button type="primary" size="small" plain @click="handlePermission(rows)">管理</el-button>
                </template>
            </TableCustom>
        </div>
        <el-dialog :title="isEdit ? '编辑' : '新增'" v-model="visible" width="700px" destroy-on-close
            :close-on-click-modal="false" @close="closeDialog">
            <TableEdit :form-data="rowData" :options="options" :edit="isEdit" :update="updateData" />
        </el-dialog>
        <el-dialog title="查看详情" v-model="visible1" width="700px" destroy-on-close>
            <TableDetail :data="viewData">
            </TableDetail>
        </el-dialog>
        <el-dialog title="权限管理" v-model="visible2" width="500px" destroy-on-close>
            <RolePermission :permiss-options="permissOptions" @success="handlePermissionSuccess" />
        </el-dialog>
    </div>
</template>

<script setup lang="ts" name="system-role">
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { CirclePlusFilled } from '@element-plus/icons-vue';
import TableCustom from '@/components/table-custom.vue';
import TableDetail from '@/components/table-detail.vue';
import RolePermission from './role-permission.vue';
import { FormOption, FormOptionList } from '@/types/form-option';
import {
    fetchRoleData,
    createRole,
    updateRole,
    deleteRole,
} from '@/api';
import type { AxiosError } from 'axios';

interface RoleRow {
    id: number | string;
    code: string;
    name: string;
    description?: string;
    permissionIds: Array<string | number>;
    [key: string]: unknown;
}

const query = reactive({
    name: '',
});
const searchOpt = ref<FormOptionList[]>([{ type: 'input', label: '角色名称：', prop: 'name' }]);

const page = reactive({
    index: 1,
    size: 10,
    total: 0,
});

const columns = ref([
    { type: 'index', label: '序号', width: 55, align: 'center' },
    { prop: 'code', label: '角色编码' },
    { prop: 'name', label: '角色名称' },
    { prop: 'description', label: '描述' },
    { prop: 'permissions', label: '权限管理' },
    { prop: 'operator', label: '操作', width: 250 },
]);

const tableData = ref<RoleRow[]>([]);

const getData = async () => {
    try {
        const res = await fetchRoleData({
            page: page.index,
            size: page.size,
            name: query.name || undefined,
        });
        const payload = res.data.data;
        let list: Record<string, any>[] = [];
        if (Array.isArray(payload)) {
            list = payload;
            page.total = payload.length;
        } else {
            list = payload?.list ?? [];
            page.total = payload?.total ?? list.length ?? 0;
        }
        tableData.value = list.map((item: Record<string, any>) => {
            const permissions = Array.isArray(item.permissionIds)
                ? item.permissionIds
                : Array.isArray(item.permissions)
                ? item.permissions.map((perm: any) => perm?.id ?? perm?.code ?? perm)
                : Array.isArray(item.permiss)
                ? item.permiss
                : [];
            return {
                ...item,
                id: item.id,
                code: item.code ?? item.key ?? '',
                name: item.name ?? '',
                description: item.description ?? '',
                permissionIds: permissions.map((val: any) => val?.toString()).filter(Boolean),
            };
        });
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '获取角色列表失败');
    }
};

const handleSearch = () => {
    page.index = 1;
    getData();
};

const changePage = (val: number) => {
    page.index = val;
    getData();
};

const options = ref<FormOption>({
    labelWidth: '100px',
    span: 24,
    list: [
        { type: 'input', label: '角色编码', prop: 'code', required: true },
        { type: 'input', label: '角色名称', prop: 'name', required: true },
        { type: 'input', label: '描述', prop: 'description', required: false },
    ],
});

const visible = ref(false);
const isEdit = ref(false);
const rowData = ref<Record<string, any>>({});

const handleEdit = (row: RoleRow) => {
    rowData.value = {
        ...row,
    };
    isEdit.value = true;
    visible.value = true;
};

const handleCreate = () => {
    rowData.value = { permissionIds: [] };
    isEdit.value = false;
    visible.value = true;
};

const updateData = async (formValue: Record<string, any>) => {
    const payload = {
        code: formValue.code,
        name: formValue.name,
        description: formValue.description,
    };
    try {
        if (isEdit.value && rowData.value.id !== undefined) {
            await updateRole(rowData.value.id, payload);
            ElMessage.success('角色更新成功');
        } else {
            await createRole(payload);
            ElMessage.success('角色新增成功');
        }
        closeDialog();
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '操作失败');
    }
};

const closeDialog = () => {
    visible.value = false;
    isEdit.value = false;
    rowData.value = {};
};

const visible1 = ref(false);
const viewData = ref({
    row: {},
    list: [],
    column: 1,
});

const handleView = (row: RoleRow) => {
    viewData.value.row = { ...row };
    viewData.value.list = [
        { prop: 'id', label: '角色ID' },
        { prop: 'code', label: '角色编码' },
        { prop: 'name', label: '角色名称' },
        { prop: 'description', label: '描述', value: row.description || '-' },
        {
            prop: 'permissionIds',
            label: '权限ID',
            value: Array.isArray(row.permissionIds) && row.permissionIds.length ? row.permissionIds.join(', ') : '-',
        },
    ];
    visible1.value = true;
};

const handleDelete = async (row: RoleRow) => {
    try {
        await deleteRole(row.id);
        ElMessage.success('删除成功');
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '删除失败');
    }
};

const visible2 = ref(false);
const permissOptions = ref<{ id?: number | string; permissionIds: Array<string | number> }>({ permissionIds: [] });

const handlePermission = (row: RoleRow) => {
    visible2.value = true;
    permissOptions.value = {
        id: row.id,
        permissionIds: Array.isArray(row.permissionIds) ? row.permissionIds : [],
    };
};

const handlePermissionSuccess = () => {
    visible2.value = false;
    ElMessage.success('权限更新成功');
    getData();
};

getData();
</script>

<style scoped></style>
