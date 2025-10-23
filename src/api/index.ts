import { AxiosResponse } from 'axios';
import request from '../utils/request';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const fetchData = () => {
    return request({
        url: './mock/table.json',
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

export interface PaginatedResult<T> {
    list: T[];
    page: number;
    size: number;
    total: number;
    [key: string]: unknown;
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

export interface UserQuery {
    page?: number;
    size?: number;
    username?: string;
    phone?: string;
    status?: string;
}

export interface UserPayload {
    username: string;
    password?: string;
    nickname?: string;
    email?: string;
    phone?: string;
    roleIds?: Array<number | string>;
    status?: string;
}

export interface RoleQuery {
    page?: number;
    size?: number;
    name?: string;
    status?: string;
}

export interface RolePayload {
    code: string;
    name: string;
    description?: string;
    permissionIds?: Array<number | string>;
}

export const fetchUserData = (
    params?: UserQuery
): Promise<AxiosResponse<ApiResponse<PaginatedResult<Record<string, unknown>>>>> => {
    return request<ApiResponse<PaginatedResult<Record<string, unknown>>>>({
        url: '/api/users',
        method: 'get',
        params,
        baseURL: API_BASE_URL,
    });
};

export const createUser = (
    payload: UserPayload
): Promise<AxiosResponse<ApiResponse<Record<string, unknown>>>> => {
    return request<ApiResponse<Record<string, unknown>>>({
        url: '/api/users',
        method: 'post',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const updateUser = (
    id: number | string,
    payload: UserPayload
): Promise<AxiosResponse<ApiResponse<Record<string, unknown>>>> => {
    return request<ApiResponse<Record<string, unknown>>>({
        url: `/api/users/${id}`,
        method: 'put',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const deleteUser = (
    id: number | string
): Promise<AxiosResponse<ApiResponse<null>>> => {
    return request<ApiResponse<null>>({
        url: `/api/users/${id}`,
        method: 'delete',
        baseURL: API_BASE_URL,
    });
};

export const fetchRoleData = (
    params?: RoleQuery
): Promise<AxiosResponse<ApiResponse<PaginatedResult<Record<string, unknown>>>>> => {
    return request<ApiResponse<PaginatedResult<Record<string, unknown>>>>({
        url: '/api/roles',
        method: 'get',
        params,
        baseURL: API_BASE_URL,
    });
};

export const createRole = (
    payload: RolePayload
): Promise<AxiosResponse<ApiResponse<Record<string, unknown>>>> => {
    return request<ApiResponse<Record<string, unknown>>>({
        url: '/api/roles',
        method: 'post',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const updateRole = (
    id: number | string,
    payload: RolePayload
): Promise<AxiosResponse<ApiResponse<Record<string, unknown>>>> => {
    return request<ApiResponse<Record<string, unknown>>>({
        url: `/api/roles/${id}`,
        method: 'put',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const deleteRole = (
    id: number | string
): Promise<AxiosResponse<ApiResponse<null>>> => {
    return request<ApiResponse<null>>({
        url: `/api/roles/${id}`,
        method: 'delete',
        baseURL: API_BASE_URL,
    });
};

export const updateRolePermissions = (
    id: number | string,
    permissionIds: Array<number | string>
): Promise<AxiosResponse<ApiResponse<Record<string, unknown>>>> => {
    return request<ApiResponse<Record<string, unknown>>>({
        url: `/api/roles/${id}/permissions`,
        method: 'put',
        data: { permissionIds },
        baseURL: API_BASE_URL,
    });
};

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
