import { defineStore } from 'pinia';
import { fetchMenuTree, type MenuTreeNode } from '@/api/index';
import type { Menus } from '@/types/menu';
import { menuData as defaultMenuData } from '@/components/menu';

const STORAGE_KEY = 'menus';
const ACTIVE_ROLE_KEY = 'active_role_code';

const readMenusFromStorage = (): Menus[] => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) {
        return [];
    }
    try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
            return parsed as Menus[];
        }
    } catch (error) {
        console.error('Failed to parse cached menus', error);
    }
    return [];
};

const readRoleCodeFromStorage = (): string | null => {
    const cachedRole = localStorage.getItem(ACTIVE_ROLE_KEY);
    if (cachedRole && cachedRole.trim().length) {
        return cachedRole.trim();
    }
    const storedUser = localStorage.getItem('user_info');
    if (storedUser) {
        try {
            const parsed = JSON.parse(storedUser);
            const roles = Array.isArray(parsed?.roles) ? parsed.roles : [];
            const firstRole = roles.find((item: unknown) => typeof item === 'string' && item.trim().length);
            if (typeof firstRole === 'string') {
                return firstRole.trim();
            }
        } catch (error) {
            console.error('Failed to parse stored user info when resolving role code', error);
        }
    }
    return null;
};

const normalizeMenuTree = (nodes: MenuTreeNode[] = []): Menus[] => {
    const walk = (items: MenuTreeNode[]): Menus[] =>
        items
            .filter((item) => item && item.visible !== false)
            .map((item) => {
                const children = item.children?.length ? walk(item.children) : undefined;
                const index = typeof item.path === 'string' && item.path.length ? item.path : `menu-${item.id}`;
                const icon =
                    typeof item.icon === 'string' && item.icon.length ? (item.icon as string) : undefined;
                const permissionCode =
                    typeof item.permissionCode === 'string' && item.permissionCode.length
                        ? (item.permissionCode as string)
                        : undefined;
                return {
                    id: String(item.id ?? index),
                    index,
                    title: item.title ?? '',
                    icon,
                    permiss: permissionCode,
                    children,
                };
            });
    return walk(nodes);
};

const flattenMenuPerms = (menus: Menus[]): string[] => {
    const codes = new Set<string>();
    const visit = (items: Menus[]) => {
        items.forEach((item) => {
            if (item.permiss) {
                codes.add(String(item.permiss));
            }
            if (item.children && item.children.length) {
                visit(item.children);
            }
        });
    };
    visit(menus);
    return Array.from(codes);
};

export const useMenuStore = defineStore('menu', {
    state: () => ({
        menus: readMenusFromStorage(),
        loading: false,
        initialized: false,
        activeRoleCode: readRoleCodeFromStorage(),
    }),
    getters: {
        menuList: (state): Menus[] => {
            if (state.menus.length) {
                return state.menus;
            }
            return defaultMenuData;
        },
        menuIds(): string[] {
            if (this.menus.length) {
                return flattenMenuPerms(this.menus);
            }
            return flattenMenuPerms(defaultMenuData);
        },
    },
    actions: {
        setMenus(menus: Menus[]) {
            this.menus = menus;
            this.initialized = true;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(menus));
        },
        setActiveRole(roleCode: string | null) {
            const normalized = roleCode && roleCode.trim().length ? roleCode.trim() : null;
            this.activeRoleCode = normalized;
            if (normalized) {
                localStorage.setItem(ACTIVE_ROLE_KEY, normalized);
            } else {
                localStorage.removeItem(ACTIVE_ROLE_KEY);
            }
        },
        replaceWithServerMenus(nodes: MenuTreeNode[], roleCode?: string | null) {
            const normalized = normalizeMenuTree(nodes);
            this.setMenus(normalized);
            if (roleCode) {
                this.setActiveRole(roleCode);
            }
            return normalized;
        },
        clear() {
            this.menus = [];
            this.initialized = false;
            localStorage.removeItem(STORAGE_KEY);
            this.setActiveRole(null);
        },
        async loadMenus(roleCode?: string | null, force = false) {
            const normalizedRole =
                (roleCode && roleCode.trim().length ? roleCode.trim() : null) ??
                this.activeRoleCode ??
                readRoleCodeFromStorage();
            if (!normalizedRole) {
                this.initialized = true;
                this.menus = [];
                return this.menus;
            }
            if (!force && this.initialized && this.menus.length && this.activeRoleCode === normalizedRole) {
                return this.menus;
            }
            if (this.loading) {
                return this.menus;
            }
            this.loading = true;
            try {
                const response = await fetchMenuTree(normalizedRole);
                const payload = response.data?.data ?? [];
                const normalized = normalizeMenuTree(payload);
                this.setMenus(normalized);
                this.setActiveRole(normalizedRole);
                return normalized;
            } catch (error) {
                console.error('Failed to load menu tree', error);
                this.initialized = true;
                return this.menus;
            } finally {
                this.loading = false;
            }
        },
    },
});

export const collectMenuIds = (menus: Menus[]): string[] => flattenMenuPerms(menus);
