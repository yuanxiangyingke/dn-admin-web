import { AxiosResponse } from 'axios';
import request from '../utils/request';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const fetchData = () => {
    return request({
        url: './mock/table.json',
        method: 'get',
    });
};

export const fetchUserData = () => {
    return request({
        url: './mock/user.json',
        method: 'get',
    });
};

export const fetchRoleData = () => {
    return request({
        url: './mock/role.json',
        method: 'get',
    });
};

export interface LoginPayload {
    username: string;
    password: string;
}

export interface ApiResponse<T> {
    code: string;
    message?: string;
    data: T;
}

export interface LoginResult {
    token: string;
    refreshToken?: string;
    expiresIn?: number;
    user?: {
        id?: number;
        username?: string;
        nickname?: string;
        email?: string;
        phone?: string;
        avatar?: string;
        roles?: string[];
        [key: string]: unknown;
    };
    menus?: unknown[];
    perms?: string[];
    [key: string]: unknown;
}

export const login = (payload: LoginPayload): Promise<AxiosResponse<ApiResponse<LoginResult>>> => {
    return request<ApiResponse<LoginResult>>({
        url: '/api/auth/login',
        method: 'post',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const logout = (): Promise<AxiosResponse<ApiResponse<null>>> => {
    return request<ApiResponse<null>>({
        url: '/api/auth/logout',
        method: 'post',
        baseURL: API_BASE_URL,
    });
};
