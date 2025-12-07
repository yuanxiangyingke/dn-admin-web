import { AxiosResponse } from 'axios';
import request from '../utils/request';
import type { ResourceAsset, ResourceQuery } from '@/types/resource';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

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

export const fetchResourceAssets = (
    params?: ResourceQuery
): Promise<AxiosResponse<ApiResponse<PaginatedResult<ResourceAsset>>>> => {
    return request<ApiResponse<PaginatedResult<ResourceAsset>>>({
        url: '/api/resource-assets',
        method: 'get',
        params,
        baseURL: API_BASE_URL,
    });
};

export const deleteResourceAsset = (
    id: number | string
): Promise<AxiosResponse<ApiResponse<null>>> => {
    return request<ApiResponse<null>>({
        url: `/api/resource-assets/${id}`,
        method: 'delete',
        baseURL: API_BASE_URL,
    });
};

export interface OssPolicyPayload {
    fileName: string;
    dir?: string;
    contentType?: string;
}

export interface OssPolicyResult {
    accessKeyId: string;
    policy: string;
    signature: string;
    host: string;
    key: string;
    dir?: string;
    expire: number;
}

export const createOssPolicy = (
    payload: OssPolicyPayload
): Promise<AxiosResponse<ApiResponse<OssPolicyResult>>> => {
    return request<ApiResponse<OssPolicyResult>>({
        url: '/api/resource-assets/oss/policy',
        method: 'post',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const createResourceAsset = (
    payload: ResourceAsset
): Promise<AxiosResponse<ApiResponse<ResourceAsset>>> => {
        return request<ApiResponse<ResourceAsset>>({
            url: '/api/resource-assets',
            method: 'post',
            data: payload,
            baseURL: API_BASE_URL,
        });
};

export const updateRolePermissions = (
    id: number | string,
    permissionCodes: Array<string | number>
): Promise<AxiosResponse<ApiResponse<Record<string, unknown>>>> => {
    return request<ApiResponse<Record<string, unknown>>>({
        url: `/api/roles/${id}/permissions`,
        method: 'patch',
        data: { permissionCodes },
        baseURL: API_BASE_URL,
    });
};

export interface MenuTreeNode {
    id: number | string;
    title: string;
    permissionCode?: string | null;
    permissionId?: number;
    assigned?: boolean;
    children?: MenuTreeNode[];
    [key: string]: unknown;
}

export const fetchMenuTree = (): Promise<AxiosResponse<ApiResponse<MenuTreeNode[]>>> => {
    return request<ApiResponse<MenuTreeNode[]>>({
        url: '/api/menus/tree',
        method: 'get',
        baseURL: API_BASE_URL,
    });
};

export const fetchAllMenus = (): Promise<AxiosResponse<ApiResponse<MenuTreeNode[]>>> => {
    return request<ApiResponse<MenuTreeNode[]>>({
        url: '/api/menus',
        method: 'get',
        baseURL: API_BASE_URL,
    });
};

export interface MenuPayload {
    parentId?: number | string | null;
    title: string;
    path?: string | null;
    component?: string | null;
    icon?: string | null;
    type?: number;
    orderNum?: number;
    keepAlive?: boolean;
    visible?: boolean;
    permissionCode?: string | null;
    meta?: Record<string, unknown>;
}

export const createMenuItem = (
    payload: MenuPayload
): Promise<AxiosResponse<ApiResponse<MenuTreeNode>>> => {
    return request<ApiResponse<MenuTreeNode>>({
        url: '/api/menus',
        method: 'post',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export interface CommunityRecord {
    id: number;
    name: string;
    shortName?: string | null;
    nameEn?: string | null;
    status?: number | null;
    operatorUserId?: number | null;
    city?: string | null;
    province?: string | null;
    country?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    timezone?: string | null;
    summary?: string | null;
    lifeFacilities?: string | null;
    description?: string | null;
    ratingAvg?: number | null;
    ratingCount?: number | null;
    tags?: string[] | null;
    refundPolicy?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface CommunityQuery {
    page?: number;
    size?: number;
}

export type CommunityPayload = Partial<Omit<CommunityRecord, 'tags'>> & {
    tags?: string[] | null;
};

export const fetchCommunityList = (
    params?: CommunityQuery
): Promise<AxiosResponse<ApiResponse<PaginatedResult<CommunityRecord>>>> => {
    return request<ApiResponse<PaginatedResult<CommunityRecord>>>({
        url: '/api/communities',
        method: 'get',
        params,
        baseURL: API_BASE_URL,
    });
};

export const createCommunity = (
    payload: CommunityPayload
): Promise<AxiosResponse<ApiResponse<CommunityRecord>>> => {
    return request<ApiResponse<CommunityRecord>>({
        url: '/api/communities',
        method: 'post',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const updateCommunity = (
    id: number | string,
    payload: Partial<CommunityPayload>
): Promise<AxiosResponse<ApiResponse<CommunityRecord>>> => {
    return request<ApiResponse<CommunityRecord>>({
        url: `/api/communities/${id}`,
        method: 'patch',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const deleteCommunity = (
    id: number | string
): Promise<AxiosResponse<ApiResponse<null>>> => {
    return request<ApiResponse<null>>({
        url: `/api/communities/${id}`,
        method: 'delete',
        baseURL: API_BASE_URL,
    });
};

export interface ActivityRecord {
    id: number;
    title: string;
    status?: number | null;
    visibility?: number | null;
    summary?: string | null;
    description?: string | null;
    coverUrl?: string | null;
    mode?: number | null;
    city?: string | null;
    venue?: string | null;
    startAt?: string | null;
    endAt?: string | null;
    feeType?: number | null;
    price?: number | null;
    currency?: string | null;
    capacity?: number | null;
    createdBy?: number | null;
    updatedBy?: number | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    publishedAt?: string | null;
    coverResourceId?: number | null;
}

export interface ActivityQuery {
    page?: number;
    size?: number;
    keyword?: string;
}

export type ActivityPayload = Partial<Omit<ActivityRecord, 'id'>>;

export const fetchActivityList = (
    params?: ActivityQuery
): Promise<AxiosResponse<ApiResponse<PaginatedResult<ActivityRecord>>>> => {
    return request<ApiResponse<PaginatedResult<ActivityRecord>>>({
        url: '/api/activities',
        method: 'get',
        params,
        baseURL: API_BASE_URL,
    });
};

export const createActivity = (
    payload: ActivityPayload
): Promise<AxiosResponse<ApiResponse<ActivityRecord>>> => {
    return request<ApiResponse<ActivityRecord>>({
        url: '/api/activities',
        method: 'post',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const updateActivity = (
    id: number | string,
    payload: ActivityPayload
): Promise<AxiosResponse<ApiResponse<ActivityRecord>>> => {
    return request<ApiResponse<ActivityRecord>>({
        url: `/api/activities/${id}`,
        method: 'patch',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const deleteActivity = (
    id: number | string
): Promise<AxiosResponse<ApiResponse<null>>> => {
    return request<ApiResponse<null>>({
        url: `/api/activities/${id}`,
        method: 'delete',
        baseURL: API_BASE_URL,
    });
};

export const updateActivityStatus = (
    id: number | string,
    status: number
): Promise<AxiosResponse<ApiResponse<ActivityRecord>>> => {
    return request<ApiResponse<ActivityRecord>>({
        url: `/api/activities/${id}/status`,
        method: 'patch',
        params: { status },
        baseURL: API_BASE_URL,
    });
};

export interface JobOpportunityRecord {
    id: string;
    externalRef?: string | null;
    title: string;
    companyName?: string | null;
    workMode?: number | null;
    employmentType?: number | null;
    location?: string | null;
    salaryAmount?: number | null;
    salaryMinAmount?: number | null;
    salaryMaxAmount?: number | null;
    salaryCurrency?: string | null;
    salaryDisplay?: string | null;
    description?: string | null;
    requirement?: string | null;
    responsibility?: string | null;
    teamIntro?: string | null;
    benefitsSummary?: string | null;
    contact?: string | null;
    status?: number | null;
    postedAt?: string | null;
    createdBy?: number | null;
    updatedBy?: number | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    preEmployment?: boolean | null;
}

export interface JobQuery {
    page?: number;
    size?: number;
    keyword?: string;
}

export type JobPayload = Partial<Omit<JobOpportunityRecord, 'id'>>;

export const fetchJobList = (
    params?: JobQuery
): Promise<AxiosResponse<ApiResponse<PaginatedResult<JobOpportunityRecord>>>> => {
    return request<ApiResponse<PaginatedResult<JobOpportunityRecord>>>({
        url: '/api/jobs',
        method: 'get',
        params,
        baseURL: API_BASE_URL,
    });
};

export const createJobOpportunity = (
    payload: JobPayload
): Promise<AxiosResponse<ApiResponse<JobOpportunityRecord>>> => {
    return request<ApiResponse<JobOpportunityRecord>>({
        url: '/api/jobs',
        method: 'post',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const updateJobOpportunity = (
    id: string,
    payload: JobPayload
): Promise<AxiosResponse<ApiResponse<JobOpportunityRecord>>> => {
    return request<ApiResponse<JobOpportunityRecord>>({
        url: `/api/jobs/${id}`,
        method: 'patch',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const deleteJobOpportunity = (
    id: string
): Promise<AxiosResponse<ApiResponse<null>>> => {
    return request<ApiResponse<null>>({
        url: `/api/jobs/${id}`,
        method: 'delete',
        baseURL: API_BASE_URL,
    });
};

export const updateJobOpportunityStatus = (
    id: string,
    status: number
): Promise<AxiosResponse<ApiResponse<JobOpportunityRecord>>> => {
    return request<ApiResponse<JobOpportunityRecord>>({
        url: `/api/jobs/${id}/status`,
        method: 'patch',
        params: { status },
        baseURL: API_BASE_URL,
    });
};

export interface CoCreationProjectRecord {
    id: string;
    title: string;
    host?: string | null;
    city?: string | null;
    certified?: boolean | null;
    deadlineAt?: string | null;
    coverUrl?: string | null;
    coverAlt?: string | null;
    brief?: string | null;
    teamIntro?: string | null;
    workMode?: string | null;
    duration?: string | null;
    memberType?: string | null;
    cooperation?: string | null;
    reward?: string | null;
    requirement?: string | null;
    postedAt?: string | null;
    status?: number | null;
    createdBy?: number | null;
    updatedBy?: number | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    coverResourceId?: number | null;
}

export interface CoCreationQuery {
    page?: number;
    size?: number;
    keyword?: string;
}

export type CoCreationPayload = Partial<Omit<CoCreationProjectRecord, 'id'>>;

export const fetchCoCreationList = (
    params?: CoCreationQuery
): Promise<AxiosResponse<ApiResponse<PaginatedResult<CoCreationProjectRecord>>>> => {
    return request<ApiResponse<PaginatedResult<CoCreationProjectRecord>>>({
        url: '/api/cocreation/projects',
        method: 'get',
        params,
        baseURL: API_BASE_URL,
    });
};

export const createCoCreationProject = (
    payload: CoCreationPayload
): Promise<AxiosResponse<ApiResponse<CoCreationProjectRecord>>> => {
    return request<ApiResponse<CoCreationProjectRecord>>({
        url: '/api/cocreation/projects',
        method: 'post',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const updateCoCreationProject = (
    id: string,
    payload: CoCreationPayload
): Promise<AxiosResponse<ApiResponse<CoCreationProjectRecord>>> => {
    return request<ApiResponse<CoCreationProjectRecord>>({
        url: `/api/cocreation/projects/${id}`,
        method: 'patch',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const deleteCoCreationProject = (
    id: string
): Promise<AxiosResponse<ApiResponse<null>>> => {
    return request<ApiResponse<null>>({
        url: `/api/cocreation/projects/${id}`,
        method: 'delete',
        baseURL: API_BASE_URL,
    });
};

export const updateCoCreationProjectStatus = (
    id: string,
    status: number
): Promise<AxiosResponse<ApiResponse<CoCreationProjectRecord>>> => {
    return request<ApiResponse<CoCreationProjectRecord>>({
        url: `/api/cocreation/projects/${id}/status`,
        method: 'patch',
        params: { status },
        baseURL: API_BASE_URL,
    });
};

export interface RoomRecord {
    id: number;
    communityId: number;
    name: string;
    code?: string | null;
    status?: string | null;
    roomType?: string | null;
    description?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface RoomQuery {
    page?: number;
    size?: number;
    keyword?: string;
}

export type RoomPayload = Partial<Omit<RoomRecord, 'id'>>;

export const fetchRoomList = (
    params?: RoomQuery
): Promise<AxiosResponse<ApiResponse<PaginatedResult<RoomRecord>>>> => {
    return request<ApiResponse<PaginatedResult<RoomRecord>>>({
        url: '/api/rooms',
        method: 'get',
        params,
        baseURL: API_BASE_URL,
    });
};

export const createRoom = (
    payload: RoomPayload
): Promise<AxiosResponse<ApiResponse<RoomRecord>>> => {
    return request<ApiResponse<RoomRecord>>({
        url: '/api/rooms',
        method: 'post',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const updateRoom = (
    id: number | string,
    payload: RoomPayload
): Promise<AxiosResponse<ApiResponse<RoomRecord>>> => {
    return request<ApiResponse<RoomRecord>>({
        url: `/api/rooms/${id}`,
        method: 'patch',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const deleteRoom = (
    id: number | string
): Promise<AxiosResponse<ApiResponse<null>>> => {
    return request<ApiResponse<null>>({
        url: `/api/rooms/${id}`,
        method: 'delete',
        baseURL: API_BASE_URL,
    });
};

export interface RoomBookingRequestRecord {
    id: number;
    userId: number;
    communityId: number;
    roomId?: number | null;
    ratePlanId?: number | null;
    checkIn?: string | null;
    checkOut?: string | null;
    guests?: number | null;
    guestName?: string | null;
    phone?: string | null;
    idNumber?: string | null;
    education?: string | null;
    intro?: string | null;
    communityExpect?: string | null;
    priceQuoteAmount?: number | null;
    priceQuoteCurrency?: string | null;
    pricingSnapshot?: string | null;
    status?: string | null;
    reviewedBy?: number | null;
    reviewedAt?: string | null;
    rejectionReason?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface RoomBookingQuery {
    page?: number;
    size?: number;
    keyword?: string;
}

export type RoomBookingPayload = Partial<Omit<RoomBookingRequestRecord, 'id'>>;

export const fetchRoomBookingList = (
    params?: RoomBookingQuery
): Promise<AxiosResponse<ApiResponse<PaginatedResult<RoomBookingRequestRecord>>>> => {
    return request<ApiResponse<PaginatedResult<RoomBookingRequestRecord>>>({
        url: '/api/room-booking-requests',
        method: 'get',
        params,
        baseURL: API_BASE_URL,
    });
};

export const createRoomBookingRequest = (
    payload: RoomBookingPayload
): Promise<AxiosResponse<ApiResponse<RoomBookingRequestRecord>>> => {
    return request<ApiResponse<RoomBookingRequestRecord>>({
        url: '/api/room-booking-requests',
        method: 'post',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const updateRoomBookingRequest = (
    id: number | string,
    payload: RoomBookingPayload
): Promise<AxiosResponse<ApiResponse<RoomBookingRequestRecord>>> => {
    return request<ApiResponse<RoomBookingRequestRecord>>({
        url: `/api/room-booking-requests/${id}`,
        method: 'patch',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const deleteRoomBookingRequest = (
    id: number | string
): Promise<AxiosResponse<ApiResponse<null>>> => {
    return request<ApiResponse<null>>({
        url: `/api/room-booking-requests/${id}`,
        method: 'delete',
        baseURL: API_BASE_URL,
    });
};

export interface RoomRatePlanRecord {
    id: number;
    roomId: number;
    name: string;
    billingUnit: string;
    currency: string;
    baseAmount: number;
    minDuration?: number | null;
    maxDuration?: number | null;
    isActive?: boolean | null;
    sortOrder?: number | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface RoomRatePlanQuery {
    page?: number;
    size?: number;
    roomId?: number | string;
    keyword?: string;
    isActive?: boolean | string | number;
}

export type RoomRatePlanPayload = Partial<Omit<RoomRatePlanRecord, 'id'>>;

export const fetchRoomRatePlanList = (
    params?: RoomRatePlanQuery
): Promise<AxiosResponse<ApiResponse<PaginatedResult<RoomRatePlanRecord>>>> => {
    return request<ApiResponse<PaginatedResult<RoomRatePlanRecord>>>({
        url: '/api/room-rate-plans',
        method: 'get',
        params,
        baseURL: API_BASE_URL,
    });
};

export const createRoomRatePlan = (
    payload: RoomRatePlanPayload
): Promise<AxiosResponse<ApiResponse<RoomRatePlanRecord>>> => {
    return request<ApiResponse<RoomRatePlanRecord>>({
        url: '/api/room-rate-plans',
        method: 'post',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const updateRoomRatePlan = (
    id: number | string,
    payload: RoomRatePlanPayload
): Promise<AxiosResponse<ApiResponse<RoomRatePlanRecord>>> => {
    return request<ApiResponse<RoomRatePlanRecord>>({
        url: `/api/room-rate-plans/${id}`,
        method: 'patch',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const deleteRoomRatePlan = (
    id: number | string
): Promise<AxiosResponse<ApiResponse<null>>> => {
    return request<ApiResponse<null>>({
        url: `/api/room-rate-plans/${id}`,
        method: 'delete',
        baseURL: API_BASE_URL,
    });
};

export interface RoomPhotoRecord {
    id: number;
    roomId: number;
    url: string;
    caption?: string | null;
    sortOrder?: number | null;
    createdAt?: string | null;
    resourceId?: number | null;
}

export interface RoomPhotoQuery {
    page?: number;
    size?: number;
    roomId?: number | string;
    keyword?: string;
}

export type RoomPhotoPayload = Partial<Omit<RoomPhotoRecord, 'id'>>;

export const fetchRoomPhotoList = (
    params?: RoomPhotoQuery
): Promise<AxiosResponse<ApiResponse<PaginatedResult<RoomPhotoRecord>>>> => {
    return request<ApiResponse<PaginatedResult<RoomPhotoRecord>>>({
        url: '/api/room-photos',
        method: 'get',
        params,
        baseURL: API_BASE_URL,
    });
};

export const createRoomPhoto = (
    payload: RoomPhotoPayload
): Promise<AxiosResponse<ApiResponse<RoomPhotoRecord>>> => {
    return request<ApiResponse<RoomPhotoRecord>>({
        url: '/api/room-photos',
        method: 'post',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const updateRoomPhoto = (
    id: number | string,
    payload: RoomPhotoPayload
): Promise<AxiosResponse<ApiResponse<RoomPhotoRecord>>> => {
    return request<ApiResponse<RoomPhotoRecord>>({
        url: `/api/room-photos/${id}`,
        method: 'patch',
        data: payload,
        baseURL: API_BASE_URL,
    });
};

export const deleteRoomPhoto = (
    id: number | string
): Promise<AxiosResponse<ApiResponse<null>>> => {
    return request<ApiResponse<null>>({
        url: `/api/room-photos/${id}`,
        method: 'delete',
        baseURL: API_BASE_URL,
    });
};

export const fetchRoleMenuTree = (
    roleId: number | string
): Promise<AxiosResponse<ApiResponse<MenuTreeNode[]>>> => {
    return request<ApiResponse<MenuTreeNode[]>>({
        url: '/api/menus/role-tree',
        method: 'get',
        params: { roleId },
        baseURL: API_BASE_URL,
    });
};

export const fetchUserMenuTree = (
    userId: number | string
): Promise<AxiosResponse<ApiResponse<MenuTreeNode[]>>> => {
    return request<ApiResponse<MenuTreeNode[]>>({
        url: '/api/menus/user-tree',
        method: 'get',
        params: { userId },
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
