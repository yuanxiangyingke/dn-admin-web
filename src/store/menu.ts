import { defineStore } from 'pinia';
import { fetchMenuTree, type MenuTreeNode } from '@/api/index';
import type { Menus } from '@/types/menu';
import { menuData as defaultMenuData } from '@/components/menu';

const STORAGE_KEY = 'menus';

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
                    path: typeof item.path === 'string' && item.path.length ? item.path : undefined,
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
        firstAccessibleRoute: '/dashboard',
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
        firstMenuPath(): string {
            const findFirst = (items: Menus[]): string | null => {
                for (const item of items) {
                    if (item.index && !item.children?.length) {
                        return item.index;
                    }
                    if (item.children?.length) {
                        const childPath = findFirst(item.children);
                        if (childPath) {
                            return childPath;
                        }
                    }
                }
                return null;
            };
            return findFirst(this.menus) ?? '/dashboard';
        },
    },
    actions: {
        setMenus(menus: Menus[]) {
            this.menus = menus;
            this.initialized = true;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(menus));
            const firstPath = this.getFirstPathFromMenus(menus);
            if (firstPath) {
                this.firstAccessibleRoute = firstPath;
                localStorage.setItem('first_route', firstPath);
            }
        },
        replaceWithServerMenus(nodes: MenuTreeNode[]) {
            const normalized = normalizeMenuTree(nodes);
            this.setMenus(normalized);
            return normalized;
        },
        clear() {
            this.menus = [];
            this.initialized = false;
            localStorage.removeItem(STORAGE_KEY);
        },
        async loadMenus(force = false) {
            if (this.loading) {
                return this.menus;
            }
            if (!force && this.initialized && this.menus.length) {
                return this.menus;
            }
            this.loading = true;
            try {
                const response = await fetchMenuTree();
                const payload = response.data?.data ?? [];
                const normalized = normalizeMenuTree(payload);
                this.setMenus(normalized);
                return normalized;
            } catch (error) {
                console.error('Failed to load menu tree', error);
                this.initialized = true;
                return this.menus;
            } finally {
                this.loading = false;
            }
        },
        getFirstPathFromMenus(menus: Menus[]): string | null {
            const stack: Menus[] = [...menus];
            while (stack.length) {
                const node = stack.shift();
                if (!node) continue;
                if (node.index && (!node.children || node.children.length === 0)) {
                    return node.index;
                }
                if (node.children && node.children.length) {
                    stack.unshift(...node.children);
                }
            }
            return null;
        },
        loadFirstRouteFromStorage() {
            const stored = localStorage.getItem('first_route');
            if (stored) {
                this.firstAccessibleRoute = stored;
            } else {
                const firstPath = this.getFirstPathFromMenus(this.menus.length ? this.menus : defaultMenuData);
                this.firstAccessibleRoute = firstPath ?? '/dashboard';
            }
            return this.firstAccessibleRoute;
        },
    },
});

export const collectMenuIds = (menus: Menus[]): string[] => flattenMenuPerms(menus);
