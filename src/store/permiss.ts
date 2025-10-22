import { defineStore } from 'pinia';

interface ObjectList {
    [key: string]: string[];
}

export const usePermissStore = defineStore('permiss', {
    state: () => {
        const defaultList: ObjectList = {
            admin: [
                '0',
                '1',
                '11',
                '12',
                '13',
                '2',
                '21',
                '22',
                '23',
                '24',
                '25',
                '26',
                '27',
                '28',
                '29',
                '291',
                '292',
                '3',
                '31',
                '32',
                '33',
                '34',
                '4',
                '41',
                '42',
                '5',
                '7',
                '6',
                '61',
                '62',
                '63',
                '64',
                '65',
                '66',
            ],
            user: ['0', '1', '11', '12', '13'],
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
