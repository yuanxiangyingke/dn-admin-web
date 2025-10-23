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
            </TableCustom>

        </div>
        <el-dialog :title="isEdit ? '编辑' : '新增'" v-model="visible" width="700px" destroy-on-close
            :close-on-click-modal="false" @close="closeDialog">
            <TableEdit :form-data="rowData" :options="options" :edit="isEdit" :update="updateData" />
        </el-dialog>
        <el-dialog title="查看详情" v-model="visible1" width="700px" destroy-on-close>
            <TableDetail :data="viewData"></TableDetail>
        </el-dialog>
    </div>
</template>

<script setup lang="ts" name="system-user">
import { computed, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { CirclePlusFilled } from '@element-plus/icons-vue';
import TableCustom from '@/components/table-custom.vue';
import TableDetail from '@/components/table-detail.vue';
import TableSearch from '@/components/table-search.vue';
import { FormOption, FormOptionList } from '@/types/form-option';
import {
    fetchUserData,
    createUser,
    updateUser,
    deleteUser,
    fetchRoleData,
    type UserPayload,
} from '@/api';
import type { AxiosError } from 'axios';

interface UserRow {
    id: number | string;
    username: string;
    nickname?: string;
    email?: string;
    phone?: string;
    status?: string;
    statusLabel?: string;
    roleNames: string;
    roleIds: Array<number | string>;
    [key: string]: unknown;
}

const query = reactive({
    username: '',
});
const searchOpt = ref<FormOptionList[]>([{ type: 'input', label: '登录名：', prop: 'username' }]);

const page = reactive({
    index: 1,
    size: 10,
    total: 0,
});

const columns = ref([
    { type: 'index', label: '序号', width: 55, align: 'center' },
    { prop: 'username', label: '登录名' },
    { prop: 'nickname', label: '昵称' },
    { prop: 'phone', label: '手机号' },
    { prop: 'email', label: '邮箱' },
    { prop: 'statusLabel', label: '状态' },
    { prop: 'roleNames', label: '角色' },
    { prop: 'operator', label: '操作', width: 250 },
]);

const tableData = ref<UserRow[]>([]);

const roleOptions = ref<Array<{ label: string; value: number | string }>>([]);

const options = ref<FormOption>({
    labelWidth: '100px',
    span: 12,
    list: [
        { type: 'input', label: '登录名', prop: 'username', required: true },
        { type: 'input', label: '昵称', prop: 'nickname', required: false },
        { type: 'input', label: '手机号', prop: 'phone', required: false },
        { type: 'input', label: '密码', prop: 'password', required: false, placeholder: '编辑时留空表示不修改' },
        { type: 'input', label: '邮箱', prop: 'email', required: false },
        {
            type: 'select',
            label: '角色',
            prop: 'roleIds',
            required: false,
            placeholder: '请选择角色',
            opts: roleOptions.value,
            multiple: true,
        },
        {
            type: 'select',
            label: '状态',
            prop: 'status',
            required: false,
            placeholder: '请选择状态',
            opts: [
                { label: '启用', value: 'enabled' },
                { label: '禁用', value: 'disabled' },
            ],
        },
    ],
});

const roleField = computed(() =>
    options.value.list.find((item) => item.prop === 'roleIds')
);

const loadRoles = async () => {
    try {
        const res = await fetchRoleData({ page: 1, size: 100 });
        const payload = res.data.data;
        let list: Record<string, any>[] = [];
        if (Array.isArray(payload)) {
            list = payload;
        } else {
            list = payload?.list ?? [];
        }
        roleOptions.value = list.map((item: Record<string, any>) => ({
            label: item.name || item.title || item.key || item.code || `角色${item.id}`,
            value: item.id,
        }));
        if (roleField.value) {
            roleField.value.opts = roleOptions.value;
        }
    } catch (error) {
        console.error('Failed to load roles', error);
    }
};

const normalizeRoles = (roles: any, roleIds?: Array<number | string>) => {
    if (Array.isArray(roles) && roles.length) {
        const normalized = roles.map((item) => {
            if (typeof item === 'string') {
                return { id: item, name: item };
            }
            return {
                id: item?.id ?? item?.roleId ?? item?.value ?? item,
                name: item?.name ?? item?.title ?? item?.label ?? item?.key ?? '',
            };
        });
        return {
            roleNames: normalized.map((item) => item.name).filter(Boolean).join(', '),
            roleIds: normalized
                .map((item) => item.id)
                .filter((id) => id !== undefined)
                .map((id) => (typeof id === 'number' ? id : Number(id)))
                .filter((id) => !Number.isNaN(id)),
        };
    }
    return {
        roleNames: '',
        roleIds: Array.isArray(roleIds)
            ? roleIds
                  .map((id) => (typeof id === 'number' ? id : Number(id)))
                  .filter((id) => !Number.isNaN(id))
            : [],
    };
};

const getData = async () => {
    try {
        const res = await fetchUserData({
            page: page.index,
            size: page.size,
            username: query.username || undefined,
        });
        const payload = res.data.data;
        const list = payload?.list ?? [];
        tableData.value = list.map((item: Record<string, any>) => {
            const {
                roleNames,
                roleIds,
            } = normalizeRoles(item.roles ?? item.roleList, item.roleIds ?? item.roles);
            const statusValue = item.status ?? item.state ?? item.enableState;
            const normalizedStatus =
                typeof statusValue === 'boolean'
                    ? statusValue
                        ? 'enabled'
                        : 'disabled'
                    : typeof statusValue === 'string'
                    ? statusValue
                    : '';
            const statusLabel =
                normalizedStatus === 'enabled'
                    ? '启用'
                    : normalizedStatus === 'disabled'
                    ? '禁用'
                    : normalizedStatus || '';
            return {
                ...item,
                id: item.id,
                username: item.username ?? item.name ?? '',
                nickname: item.nickname ?? item.displayName ?? '',
                email: item.email ?? '',
                phone: item.phone ?? item.mobile ?? '',
                status: normalizedStatus || undefined,
                statusLabel,
                roleNames,
                roleIds,
            } as UserRow;
        });
        page.total = payload?.total ?? list.length ?? 0;
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '获取用户列表失败');
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

const visible = ref(false);
const isEdit = ref(false);
const rowData = ref<Record<string, any>>({});

const resetFormState = () => {
    rowData.value = { roleIds: [], status: 'enabled' };
};

const handleEdit = (row: UserRow) => {
    rowData.value = {
        ...row,
        roleIds: Array.isArray(row.roleIds) ? [...row.roleIds] : [],
        password: undefined,
        status: row.status ?? 'enabled',
    };
    isEdit.value = true;
    visible.value = true;
};

const handleCreate = () => {
    resetFormState();
    isEdit.value = false;
    visible.value = true;
};

const updateData = async (formValue: Record<string, any>) => {
    const payload: UserPayload = {
        username: formValue.username,
        nickname: formValue.nickname,
        email: formValue.email,
        phone: formValue.phone,
        roleIds: formValue.roleIds ?? [],
        status: formValue.status,
    };
    if (!payload.username) {
        ElMessage.error('请填写登录名');
        return;
    }
    if (!isEdit.value && !formValue.password) {
        ElMessage.error('请设置登录密码');
        return;
    }
    if (Array.isArray(payload.roleIds) && payload.roleIds.length) {
        const normalizedRoleIds = payload.roleIds
            .map((id) => (typeof id === 'number' ? id : Number(id)))
            .filter((id) => !Number.isNaN(id));
        if (normalizedRoleIds.length) {
            payload.roleIds = normalizedRoleIds;
        } else {
            delete payload.roleIds;
        }
    } else {
        delete payload.roleIds;
    }
    if (!payload.nickname) {
        delete payload.nickname;
    }
    if (!payload.email) {
        delete payload.email;
    }
    if (!payload.phone) {
        delete payload.phone;
    }
    if (!payload.status) {
        delete payload.status;
    }
    if (formValue.password) {
        payload.password = formValue.password;
    }
    try {
        if (isEdit.value && rowData.value.id !== undefined) {
            await updateUser(rowData.value.id, payload);
            ElMessage.success('用户更新成功');
        } else {
            await createUser(payload);
            ElMessage.success('用户新增成功');
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
    resetFormState();
};

const visible1 = ref(false);
const viewData = ref({
    row: {},
    list: [],
});

const handleView = (row: UserRow) => {
    viewData.value.row = { ...row };
    viewData.value.list = [
        { prop: 'id', label: '用户ID' },
        { prop: 'username', label: '登录名' },
        { prop: 'nickname', label: '昵称' },
        { prop: 'email', label: '邮箱' },
        { prop: 'phone', label: '电话' },
        { prop: 'roleNames', label: '角色' },
        { prop: 'statusLabel', label: '状态' },
    ];
    visible1.value = true;
};

const handleDelete = async (row: UserRow) => {
    try {
        await deleteUser(row.id);
        ElMessage.success('删除成功');
        getData();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '删除失败');
    }
};

loadRoles();
getData();
</script>

<style scoped></style>
