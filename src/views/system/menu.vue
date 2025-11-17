<template>
    <div>
        <div class="container">
            <TableCustom :columns="columns" :tableData="menuList" row-key="index" :has-pagination="false"
                :viewFunc="handleView" :delFunc="handleDelete" :editFunc="handleEdit">
                <template #toolbarBtn>
                    <el-button type="warning" :icon="CirclePlusFilled" @click="handleCreate">新增</el-button>
                </template>
                <template #icon="{ rows }">
                    <el-icon>
                        <component :is="rows.icon"></component>
                    </el-icon>
                </template>
            </TableCustom>

        </div>
        <el-dialog :title="isEdit ? '编辑' : '新增'" v-model="visible" width="700px" destroy-on-close
            :close-on-click-modal="false" @close="closeDialog">
            <TableEdit :form-data="rowData" :options="options" :edit="isEdit" :update="updateData">
                <template #parent>
                    <el-cascader v-model="rowData.pid" :options="cascaderOptions" :props="{ checkStrictly: true }"
                        clearable />
                </template>
            </TableEdit>
        </el-dialog>
        <el-dialog title="查看详情" v-model="visible1" width="700px" destroy-on-close>
            <TableDetail :data="viewData">
                <template #icon="{ rows }">
                    <el-icon>
                        <component :is="rows.icon"></component>
                    </el-icon>
                </template>
            </TableDetail>
        </el-dialog>
    </div>
</template>

<script setup lang="ts" name="system-menu">
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { CirclePlusFilled } from '@element-plus/icons-vue';
import { Menus } from '@/types/menu';
import TableCustom from '@/components/table-custom.vue';
import TableDetail from '@/components/table-detail.vue';
import TableEdit from '@/components/table-edit.vue';
import { FormOption } from '@/types/form-option';
import { useMenuStore } from '@/store/menu';
import { createMenuItem, fetchAllMenus } from '@/api/index';
import type { MenuPayload, MenuTreeNode } from '@/api/index';
import type { AxiosError } from 'axios';

// 表格相关
let columns = ref([
    { prop: 'title', label: '菜单名称', align: 'left' },
    { prop: 'icon', label: '图标' },
    { prop: 'index', label: '路由路径' },
    { prop: 'permiss', label: '权限标识' },
    { prop: 'operator', label: '操作', width: 250 },
])

interface CascaderNode {
    label: string;
    value: string | number;
    children?: CascaderNode[];
}

const buildCascaderOptions = (
    data: Array<{ title?: string; id?: string | number; children?: any[] }>
): CascaderNode[] => {
    return (data ?? []).map((item) => {
        const option: CascaderNode = {
            label: item.title ?? '',
            value:
                item.id ??
                (typeof (item as any).index !== 'undefined'
                    ? ((item as any).index as string | number)
                    : String(item.title ?? '')),
        };
        if (Array.isArray(item.children) && item.children.length) {
            option.children = buildCascaderOptions(item.children);
        }
        return option;
    });
};
const menuStore = useMenuStore();
const menuList = computed(() => menuStore.menuList);
const cascaderOptions = ref<CascaderNode[]>(buildCascaderOptions(menuList.value));
const parentOptionsLoaded = ref(false);
const parentOptionsLoading = ref(false);

const loadParentOptions = async () => {
    if (parentOptionsLoading.value) {
        return;
    }
    parentOptionsLoading.value = true;
    try {
        const response = await fetchAllMenus();
        const payload: MenuTreeNode[] = response.data?.data ?? [];
        cascaderOptions.value = buildCascaderOptions(payload);
        parentOptionsLoaded.value = true;
    } catch (error) {
        console.error('Failed to load full menu tree', error);
        cascaderOptions.value = buildCascaderOptions(menuList.value);
        parentOptionsLoaded.value = false;
    } finally {
        parentOptionsLoading.value = false;
    }
};

onMounted(() => {
    menuStore.loadMenus(true).catch((error) => {
        console.error('Failed to refresh menu data', error);
    });
    loadParentOptions();
});

watch(
    () => menuList.value,
    (value) => {
        if (!parentOptionsLoaded.value) {
            cascaderOptions.value = buildCascaderOptions(value);
        }
    },
    { deep: true }
);

const ensureParentOptions = () => {
    if (!parentOptionsLoaded.value || !cascaderOptions.value.length) {
        loadParentOptions();
    }
};


// 新增/编辑弹窗相关
let options = ref<FormOption>({
    labelWidth: '100px',
    span: 12,
    list: [
        { type: 'input', label: '菜单名称', prop: 'title', required: true },
        { type: 'input', label: '路由路径', prop: 'index', required: false },
        { type: 'input', label: '组件路径', prop: 'component' },
        { type: 'input', label: '图标', prop: 'icon' },
        { type: 'input', label: '权限标识', prop: 'permiss' },
        { type: 'parent', label: '父菜单', prop: 'parent' },
    ]
})
const visible = ref(false);
const isEdit = ref(false);
const rowData = ref<any>({ title: '', index: '', component: '', icon: '', permiss: '', pid: null });
const submitting = ref(false);
const handleCreate = () => {
    ensureParentOptions();
    rowData.value = { title: '', index: '', component: '', icon: '', permiss: '', pid: null };
    isEdit.value = false;
    visible.value = true;
};
const handleEdit = (row: Menus) => {
    ensureParentOptions();
    const parentId = row.pid ?? null;
    rowData.value = {
        ...row,
        pid: parentId ? [parentId] : null,
    };
    isEdit.value = true;
    visible.value = true;
};
const resolveParentId = (value: unknown): number | string | null => {
    if (Array.isArray(value) && value.length) {
        return value[value.length - 1] ?? null;
    }
    return (value as number | string | null) ?? null;
};

const updateData = async (formValue: Record<string, any>) => {
    if (isEdit.value) {
        ElMessage.warning('菜单编辑功能暂未开放');
        return;
    }
    if (submitting.value) return;
    const payload: MenuPayload = {
        parentId: resolveParentId(formValue.pid ?? rowData.value.pid),
        title: formValue.title?.trim(),
        path: formValue.index?.trim() || null,
        component: formValue.component?.trim() || formValue.index?.trim() || null,
        icon: formValue.icon?.trim() || null,
        permissionCode: formValue.permiss?.trim() || null,
        type: 0,
        orderNum: 0,
        keepAlive: true,
        visible: true,
        meta: {},
    };
    submitting.value = true;
    try {
        await createMenuItem(payload);
        ElMessage.success('新增菜单成功');
        await menuStore.loadMenus(true);
        await loadParentOptions();
        closeDialog();
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '新增菜单失败');
    } finally {
        submitting.value = false;
    }
};

const closeDialog = () => {
    visible.value = false;
    isEdit.value = false;
    rowData.value = { title: '', index: '', component: '', icon: '', permiss: '', pid: null };
};

// 查看详情弹窗相关
const visible1 = ref(false);
const viewData = ref({
    row: {},
    list: []
});
const handleView = (row: Menus) => {
    viewData.value.row = { ...row }
    viewData.value.list = [
        {
            prop: 'id',
            label: '菜单ID',
        },
        {
            prop: 'pid',
            label: '父菜单ID',
        },
        {
            prop: 'title',
            label: '菜单名称',
        },
        {
            prop: 'index',
            label: '路由路径',
        },
        {
            prop: 'permiss',
            label: '权限标识',
        },
        {
            prop: 'icon',
            label: '图标',
        },
    ]
    visible1.value = true;
};

// 删除相关
const handleDelete = (row: Menus) => {
    ElMessage.success('删除成功');
}
</script>

<style scoped></style>
