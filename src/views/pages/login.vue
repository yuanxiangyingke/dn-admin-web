<template>
    <div class="login-bg">
        <div class="login-container">
            <div class="login-header">
                <img class="logo mr10" src="../../assets/img/logo.svg" alt="" />
                <div class="login-title">后台管理系统</div>
            </div>
            <el-form :model="param" :rules="rules" ref="login" size="large">
                <el-form-item prop="username">
                    <el-input v-model="param.username" placeholder="用户名">
                        <template #prepend>
                            <el-icon>
                                <User />
                            </el-icon>
                        </template>
                    </el-input>
                </el-form-item>
                <el-form-item prop="password">
                    <el-input
                        type="password"
                        placeholder="密码"
                        v-model="param.password"
                        @keyup.enter="submitForm(login)"
                    >
                        <template #prepend>
                            <el-icon>
                                <Lock />
                            </el-icon>
                        </template>
                    </el-input>
                </el-form-item>
                <div class="pwd-tips">
                    <el-checkbox class="pwd-checkbox" v-model="checked" label="记住密码" />
                    <el-link type="primary" @click="$router.push('/reset-pwd')">忘记密码</el-link>
                </div>
                <el-button
                    class="login-btn"
                    type="primary"
                    size="large"
                    :loading="loading"
                    @click="submitForm(login)"
                    >登录</el-button
                >
                <p class="login-tips">Tips : 使用后端提供的真实账号登录。</p>
                <p class="login-text">
                    没有账号？<el-link type="primary" @click="$router.push('/register')">立即注册</el-link>
                </p>
            </el-form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useTabsStore } from '@/store/tabs';
import { usePermissStore } from '@/store/permiss';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { login as loginApi } from '@/api/index';
import type { AxiosError } from 'axios';

interface LoginInfo {
    username: string;
    password: string;
}

const lgStr = localStorage.getItem('login-param');
const defParam = lgStr ? JSON.parse(lgStr) : null;
const checked = ref(lgStr ? true : false);

const router = useRouter();
const param = reactive<LoginInfo>({
    username: defParam ? defParam.username : '',
    password: defParam ? defParam.password : '',
});

const rules: FormRules = {
    username: [
        {
            required: true,
            message: '请输入用户名',
            trigger: 'blur',
        },
    ],
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};
const permiss = usePermissStore();
const login = ref<FormInstance>();
const loading = ref(false);
const submitForm = async (formEl: FormInstance | undefined) => {
    if (!formEl) return;
    try {
        const valid = await formEl.validate();
        if (!valid) {
            return;
        }
    } catch (error) {
        return;
    }
    loading.value = true;
    try {
        const response = await loginApi({
            username: param.username,
            password: param.password,
        });
        const { code, message, data } = response.data;
        if (code !== '0') {
            throw new Error(message || '登录失败');
        }
        const userInfo = data?.user ?? {};
        const displayName =
            (userInfo?.nickname as string | undefined) ||
            (userInfo?.username as string | undefined) ||
            param.username;
        const perms = Array.isArray(data?.perms) ? (data?.perms as string[]) : [];
        const refreshToken = data?.refreshToken as string | undefined;
        const token = data?.token as string | undefined;
        if (token) {
            localStorage.setItem('auth_token', token);
        }
        if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
        } else {
            localStorage.removeItem('refresh_token');
        }
        localStorage.setItem('vuems_name', displayName);
        localStorage.setItem('user_info', JSON.stringify(userInfo));
        const fallbackPerms =
            permiss.defaultList[param.username === 'admin' ? 'admin' : 'user'] || [];
        const resolvedPerms = perms.length ? perms : fallbackPerms;
        permiss.handleSet(resolvedPerms);
        if (Array.isArray(data?.menus)) {
            localStorage.setItem('menus', JSON.stringify(data?.menus));
        }
        if (checked.value) {
            localStorage.setItem('login-param', JSON.stringify(param));
        } else {
            localStorage.removeItem('login-param');
        }
        ElMessage.success('登录成功');
        router.push('/');
    } catch (error) {
        const axiosError = error as AxiosError<{ code?: string; message?: string }>;
        if (axiosError?.isAxiosError) {
            const responseCode = axiosError.response?.data?.code;
            const responseMessage = axiosError.response?.data?.message;
            const errMsg =
                responseMessage ||
                (responseCode === '401' ? '用户名或密码错误' : axiosError.message || '登录失败');
            ElMessage.error(errMsg);
        } else {
            const errMsg = error instanceof Error ? error.message : '登录失败';
            ElMessage.error(errMsg);
        }
    } finally {
        loading.value = false;
    }
};

const tabs = useTabsStore();
tabs.clearTabs();
</script>

<style scoped>
.login-bg {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100vh;
    background: url(../../assets/img/login-bg.jpg) center/cover no-repeat;
}

.login-header {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 40px;
}

.logo {
    width: 35px;
}

.login-title {
    font-size: 22px;
    color: #333;
    font-weight: bold;
}

.login-container {
    width: 450px;
    border-radius: 5px;
    background: #fff;
    padding: 40px 50px 50px;
    box-sizing: border-box;
}

.pwd-tips {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    margin: -10px 0 10px;
    color: #787878;
}

.pwd-checkbox {
    height: auto;
}

.login-btn {
    display: block;
    width: 100%;
}

.login-tips {
    font-size: 12px;
    color: #999;
}

.login-text {
    display: flex;
    align-items: center;
    margin-top: 20px;
    font-size: 14px;
    color: #787878;
}
</style>
