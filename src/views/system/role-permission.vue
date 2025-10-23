<template>
    <div>
        <el-tree
            class="mgb10"
            ref="tree"
            :data="data"
            node-key="id"
            default-expand-all
            show-checkbox
            :default-checked-keys="checkedKeys"
        />
        <el-button type="primary" @click="onSubmit">保存权限</el-button>
    </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { ElMessage, ElTree } from 'element-plus';
import { menuData } from '@/components/menu';
import { updateRolePermissions } from '@/api';
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

const menuObj = ref({});
// const data = menuData.map((item) => {
//     if (item.children) {
//         menuObj.value[item.id] = item.children.map((sub) => sub.id);
//     }
//     return {
//         id: item.id,
//         label: item.title,
//         children: item.children?.map((child) => {
//             return {
//                 id: child.id,
//                 label: child.title,
//             };
//         }),
//     };
// });

const getTreeData = (data) => {
    return data.map((item) => {
        const obj: any = {
            id: item.id,
            label: item.title,
        };
        if (item.children) {
            menuObj.value[item.id] = item.children.map((sub) => sub.id);
            obj.children = getTreeData(item.children);
        }
        return obj;
    });
};
const data = getTreeData(menuData);
const checkData = (data: string[] = []) => {
    return data.filter((item) => {
        return !menuObj.value[item] || data.toString().includes(menuObj.value[item].toString());
    });
};
// 获取当前权限
const checkedKeys = ref<string[]>([]);

// 保存权限
const tree = ref<InstanceType<typeof ElTree>>();
const syncCheckedKeys = (keys: Array<string | number>) => {
    const normalized = keys.map((item) => item.toString());
    checkedKeys.value = checkData(normalized);
    nextTick(() => {
        tree.value?.setCheckedKeys(checkedKeys.value);
    });
};

watch(
    () => props.permissOptions,
    (val) => {
        syncCheckedKeys(val?.permissionIds || []);
    },
    { immediate: true, deep: true }
);

const onSubmit = async () => {
    if (!props.permissOptions?.id) {
        return;
    }
    const keys = [
        ...(tree.value?.getCheckedKeys(false) as Array<string | number>),
        ...(tree.value?.getHalfCheckedKeys() as Array<string | number>),
    ]
        .map((item) => item.toString())
        .map((item) => Number(item))
        .filter((item) => !Number.isNaN(item));
    try {
        await updateRolePermissions(props.permissOptions.id, keys);
        ElMessage.success('权限保存成功');
        emit('success');
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        ElMessage.error(err.response?.data?.message || err.message || '权限保存失败');
    }
};
</script>

<style scoped></style>
