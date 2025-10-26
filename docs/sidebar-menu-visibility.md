# 侧栏菜单显示机制

前端与后端协同展示和控制菜单的整体流程如下：

## 1. 登录阶段写入权限集合

- 登录成功后（`src/views/pages/login.vue`），会从接口返回的 `data.perms` 以及菜单树 `data.menus` 中解析所有权限标识。
- 这些标识与默认权限合并后，调用 `usePermissStore().handleSet` 写入 Pinia，并同步到 `localStorage/perms`。
- 该集合（`permiss.key`）代表当前用户拥有的所有权限码，例如 `menu:dashboard:view`、`community:info:view` 等。

## 2. 自定义指令 `v-permiss`

- 在 `src/main.ts` 中注册了 `v-permiss`。指令会在元素挂载时检查绑定的权限字符串是否存在于 `permiss.key`。
- 不存在则把元素隐藏，因此绑定了 `v-permiss` 的菜单、按钮会根据用户权限自动控制显隐。

## 3. 侧栏菜单渲染

- 侧栏组件 `src/components/sidebar.vue` 使用 `v-permiss="item.permiss"` 守卫所有 `<el-menu-item>` 和 `<el-sub-menu>`。
- 只要某个菜单项（或其子项）所需的权限码包含在 `permiss.key` 中，就会显示；反之则被隐藏。

## 4. 路由守卫二次校验

- `src/router/index.ts` 的全局 `beforeEach` 钩子会读取 `to.meta.permiss`。
- 若设置了权限码且用户不具备，则跳转到 `/403`。此逻辑与 `v-permiss` 一致，用于防止直接输入地址访问未授权页面。

## 5. 菜单数据来源

- 登录后若接口返回 `data.menus`，会调用 `menuStore.replaceWithServerMenus` 用服务端菜单覆盖前端默认菜单。
- 因此要展示新的菜单，需要在后端返回的菜单树中包含它，并确保相应权限码出现在 `permiss.key` 集合里。

## 6. 示例：社区信息管理

- 新增菜单的 `permissionCode` 为 `community:info:view`。
- 只有当登录返回的权限集合里包含该值时，侧栏 `v-permiss` 才会显示它，路由守卫也会放行访问 `/community/info`。
