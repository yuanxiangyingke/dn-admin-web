import { defineStore } from 'pinia';

interface ObjectList {
    [key: string]: string[];
}

export const usePermissStore = defineStore('permiss', {
    state: () => {
        const defaultList: ObjectList = {
            admin: [
                'menu:dashboard:view',
                'menu:system:user',
                'menu:system:role',
                'menu:system:menu',
                'menu:component:form',
                'menu:component:upload',
                'menu:component:carousel',
                'menu:component:calendar',
                'menu:component:watermark',
                'menu:component:tour',
                'menu:component:steps',
                'menu:component:statistic',
                'menu:component:editor',
                'menu:component:markdown',
                'menu:table:base',
                'menu:table:editable',
                'menu:table:import',
                'menu:table:export',
                'menu:chart:schart',
                'menu:chart:echarts',
                'menu:icon:view',
                'menu:theme:view',
                'menu:extra:profile',
                'menu:extra:login',
                'menu:extra:register',
                'menu:extra:reset',
                'menu:extra:403',
                'menu:extra:404',
            ],
            user: ['menu:dashboard:view', 'menu:system:user', 'menu:system:role', 'menu:system:menu'],
        };
        const username = localStorage.getItem('vuems_name');
        const storedPerms = localStorage.getItem('perms');
        let persisted: string[] = [];
        if (storedPerms) {
            try {
                const parsed = JSON.parse(storedPerms);
                if (Array.isArray(parsed)) {
                    persisted = parsed;
                }
            } catch (error) {
                console.error('Failed to parse stored permissions', error);
            }
        }
        const fallback = username === 'admin' ? defaultList.admin : defaultList.user;
        return {
            key: persisted.length ? persisted : (fallback as string[]),
            defaultList,
        };
    },
    actions: {
        handleSet(val: string[]) {
            this.key = val;
            localStorage.setItem('perms', JSON.stringify(val));
        },
    },
});
