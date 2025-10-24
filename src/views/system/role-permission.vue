<template>
    <div v-loading="loading">
        <el-tree
            class="mgb10"
            ref="tree"
            :data="treeData"
            node-key="id"
            default-expand-all
            show-checkbox
            :default-checked-keys="checkedKeys"
        />
        <el-button type="primary" @click="onSubmit" :loading="submitLoading">保存权限</el-button>
    </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { ElMessage, ElTree } from 'element-plus';
import { fetchMenuTree, updateRolePermissions } from '@/api';
import type { AxiosError } from 'axios';

interface RolePermissionOptions {
    id?: number | string;
    code?: string;
    permissionIds?: Array<string | number>;
}

const props = defineProps<{
    permissOptions: RolePermissionOptions;
}>();

const emit = defineEmits<{
    (event: 'success'): void;
}>();

interface TreeNode {
    id: string;
    label: string;
    disabled?: boolean;
    children?: TreeNode[];
}

const treeData = ref<TreeNode[]>([]);
const checkedKeys = ref<string[]>([]);
const permissionMap = ref<Record<string, number>>({});
const loading = ref(false);
const submitLoading = ref(false);
const tree = ref<InstanceType<typeof ElTree>>();

const resolveNodeKey = (node: any): string => {
    const permissionId = node.permissionId ?? node.permission?.id;
    if (permissionId !== undefined && permissionId !== null) {
        return String(permissionId);
    }
    return String(node.id);
};

const hasPermission = (node: any): boolean => {
    const permissionId = node.permissionId ?? node.permission?.id;
    return permissionId !== undefined && permissionId !== null;
};

const transformTree = (nodes: any[]): TreeNode[] => {
    return nodes.map((node) => {
        const key = resolveNodeKey(node);
        if (hasPermission(node)) {
            permissionMap.value[key] = Number(node.permissionId ?? node.permission?.id);
        }
        const children = Array.isArray(node.children) ? transformTree(node.children) : [];
        return {
            id: key,
            label: node.title ?? node.name ?? node.permissionCode ?? `菜单 ${node.id}`,
            disabled: !hasPermission(node) && children.length === 0,
            children,
        };
    });
};

const collectAssignedKeys = (nodes: any[]): string[] => {
    const keys: string[] = [];
    nodes.forEach((node) => {
        if (node.assigned && hasPermission(node)) {
            keys.push(resolveNodeKey(node));
        }
        if (Array.isArray(node.children) && node.children.length > 0) {
            keys.push(...collectAssignedKeys(node.children));
        }
    });
    return keys;
};

const syncCheckedKeys = (keys: string[]) => {
    checkedKeys.value = keys;
    nextTick(() => {
        tree.value?.setCheckedKeys(keys);
    });
};

const loadMenuTree = async (roleCode?: string) => {
    if (!roleCode || !roleCode.trim().length) {
        treeData.value = [];
        syncCheckedKeys([]);
        return;
    }
    loading.value = true;
    permissionMap.value = {};
    try {
        const response = await fetchMenuTree(roleCode);
        const nodes = response.data.data ?? [];
        treeData.value = transformTree(nodes);
        const assignedKeys = collectAssignedKeys(nodes);
        syncCheckedKeys(assignedKeys);
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '加载菜单权限失败');
        treeData.value = [];
        syncCheckedKeys([]);
    } finally {
        loading.value = false;
    }
};

watch(
    () => props.permissOptions,
    (val) => {
        loadMenuTree(typeof val?.code === 'string' ? val.code : undefined);
    },
    { immediate: true, deep: true }
);

const onSubmit = async () => {
    if (!props.permissOptions?.id) {
        return;
    }
    const rawKeys = [
        ...(tree.value?.getCheckedKeys(false) as Array<string | number>),
        ...(tree.value?.getHalfCheckedKeys() as Array<string | number>),
    ].map((item) => item.toString());
    const permissionIds = rawKeys
        .map((key) => permissionMap.value[key] ?? Number(key))
        .filter((id) => typeof id === 'number' && !Number.isNaN(id));
    submitLoading.value = true;
    try {
        await updateRolePermissions(props.permissOptions.id, permissionIds);
        ElMessage.success('权限保存成功');
        emit('success');
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '权限保存失败');
    } finally {
        submitLoading.value = false;
    }
};
</script>

<style scoped></style>
