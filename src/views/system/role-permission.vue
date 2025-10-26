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
import { fetchRoleMenuTree, updateRolePermissions } from '@/api';
import type { AxiosError } from 'axios';

const props = defineProps({
    permissOptions: {
        type: Object,
        required: true,
    },
});

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
const permissionMap = ref<Record<string, string>>({});
const loading = ref(false);
const submitLoading = ref(false);
const tree = ref<InstanceType<typeof ElTree>>();

const resolvePermissionCode = (node: any): string | undefined => {
    if (typeof node.permissionCode === 'string' && node.permissionCode.length) {
        return node.permissionCode;
    }
    const metaCode = node.meta?.permissionCode;
    if (typeof metaCode === 'string' && metaCode.length) {
        return metaCode;
    }
    const nestedCode = node.permission?.code;
    if (typeof nestedCode === 'string' && nestedCode.length) {
        return nestedCode;
    }
    return undefined;
};

const resolveNodeKey = (node: any): string => {
    const code = resolvePermissionCode(node);
    if (code) {
        return code;
    }
    return `menu-${node.id}`;
};

const transformTree = (nodes: any[], assignedKeys: string[] = []): TreeNode[] => {
    return nodes.map((node) => {
        const key = resolveNodeKey(node);
        const permissionCode = resolvePermissionCode(node);
        if (permissionCode) {
            permissionMap.value[key] = permissionCode;
        }
        if (node.assigned === true && permissionCode) {
            assignedKeys.push(key);
        }
        const children = Array.isArray(node.children) ? transformTree(node.children, assignedKeys) : [];
        return {
            id: key,
            label: node.title ?? node.name ?? node.permissionCode ?? `菜单 ${node.id}`,
            disabled: !permissionCode,
            children,
        };
    });
};

const syncCheckedKeys = (keys: string[]) => {
    checkedKeys.value = keys;
    nextTick(() => {
        tree.value?.setCheckedKeys(keys);
    });
};

const applyRolePermissionKeys = () => {
    const codes = Array.isArray(props.permissOptions?.permissionCodes)
        ? props.permissOptions.permissionCodes
        : [];
    const keys = codes
        .map((item: string | number) => item?.toString())
        .filter((item): item is string => Boolean(item));
    syncCheckedKeys(keys);
};

const loadRoleMenuTree = async (roleId: number | string) => {
    loading.value = true;
    permissionMap.value = {};
    try {
        const response = await fetchRoleMenuTree(roleId);
        const nodes = response.data.data ?? [];
        const assignedKeys: string[] = [];
        treeData.value = transformTree(nodes, assignedKeys);
        if (assignedKeys.length) {
            syncCheckedKeys(assignedKeys);
        } else {
            applyRolePermissionKeys();
        }
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
    async (val) => {
        if (val?.id) {
            await loadRoleMenuTree(val.id);
        } else {
            treeData.value = [];
            syncCheckedKeys([]);
        }
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
    const fallbackKeys =
            rawKeys.length > 0
                ? rawKeys
                : checkedKeys.value.length > 0
                ? checkedKeys.value
                : Array.isArray(props.permissOptions.permissionCodes)
                ? props.permissOptions.permissionCodes
                      .map((item: string | number) => item?.toString())
                      .filter((key): key is string => Boolean(key))
                : [];
    const distinctKeys = Array.from(new Set(fallbackKeys));
    const permissionCodes = distinctKeys
        .map((key) => permissionMap.value[key] ?? key)
        .filter((code) => typeof code === 'string' && code.length > 0);
    submitLoading.value = true;
    try {
        await updateRolePermissions(props.permissOptions.id, permissionCodes);
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
