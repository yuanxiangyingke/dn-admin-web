import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';

const service: AxiosInstance = axios.create({
    timeout: 10000,
});

service.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('auth_token');
        if (token && config.headers && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => {
        console.error(error);
        return Promise.reject(error);
    }
);

service.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        const status = error.response?.status;
        const config = error.config;
        const isLoginRequest = config?.url?.includes('/api/auth/login');
        const message =
            (error.response?.data as { message?: string } | undefined)?.message ||
            error.message ||
            '请求失败';
        if (status === 401 && !isLoginRequest) {
            ElMessage.error('登录已过期，请重新登录');
            ['auth_token', 'refresh_token', 'perms', 'vuems_name', 'user_info', 'menus'].forEach((key) =>
                localStorage.removeItem(key)
            );
            if (window.location.hash !== '#/login') {
                window.location.replace('#/login');
            }
        } else if (!isLoginRequest) {
            ElMessage.error(message);
        }
        return Promise.reject(error);
    }
);

export default service;
