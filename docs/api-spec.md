# dn-admin-server 接口文档

本文档描述 `dn-admin-server` 暴露给前端的 REST API。所有接口均以 `/api` 为前缀，使用 JSON 进行数据交互。

最后更新：依据 `src/main/java/com/dn/admin` 下的 Controller 与 DTO 实现整理。

---

## 1. 通用约定

### 1.1 基础信息
- **Base URL**：`/api`
- **认证方式**：基于 JWT 的 `Bearer` Token。登录获取令牌后，除登录/刷新外的接口都需要在请求头添加 `Authorization: Bearer <accessToken>`
- **内容类型**：JSON 请求统一使用 `Content-Type: application/json; charset=UTF-8`

### 1.2 请求头
| Header | 说明 |
| ------ | ---- |
| `Authorization` | 可选。登录、刷新之外的接口必须携带，格式：`Bearer <token>` |
| `Content-Type` | POST/PUT/PATCH 请求使用 `application/json` |

### 1.3 统一响应结构

所有接口返回统一的封装结构 `ApiResponse<T>`：

```json
{
  "code": "0",
  "message": "success",
  "data": { ... }
}
```

- `code`：字符串。成功恒为 `"0"`；业务/校验/鉴权异常会返回对应的 HTTP 状态码字符串（如 `"400"`、`"401"`、`"404"`）。
- `message`：提示信息。成功时通常为 `"success"`，错误时包含原因描述。
- `data`：业务数据，类型由实际接口决定。删除等无数据场景为 `null`。

分页接口返回 `PageResponse<T>`：

```json
{
  "total": 25,
  "page": 1,
  "size": 10,
  "list": [ ... ]
}
```

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `total` | number | 数据总量 |
| `page` | number | 当前页（从 1 开始） |
| `size` | number | 当前页尺寸 |
| `list` | array | 数据列表 |

### 1.4 错误处理

| HTTP 状态码 | code | 说明 |
| ----------- | ---- | ---- |
| 400 | `"400"` | 参数格式或校验失败 |
| 401 | `"401"` | 未认证或令牌无效 |
| 403 | `"403"` | 已认证但无权限 |
| 404 | `"404"` | 资源不存在 |
| 409 | `"409"` | 业务冲突（如编码重复、仍有关联数据） |
| 422 | `"422"` | 语义错误/数据校验失败（保留） |
| 500 | `"500"` | 未预期的服务器错误 |

错误响应示例：

```json
{
  "code": "409",
  "message": "角色仍关联用户，无法删除",
  "data": null
}
```

---

## 2. 认证与会话

### 2.1 登录
- **URL**：`POST /api/auth/login`
- **说明**：用户名密码登录，获取访问令牌与刷新令牌。
- **是否鉴权**：否

**请求体**

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `username` | string | 是 | 登录账号，不能为空 |
| `password` | string | 是 | 登录密码，不能为空 |

**响应 `data` 字段**

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `token` | string | Access Token，后续接口在 `Authorization` 中携带 |
| `refreshToken` | string | 刷新令牌 |
| `expiresIn` | number | Access Token 有效期（秒） |
| `user` | object | 当前用户概览，结构见下表 |
| `menus` | array | 登录成功后可用的菜单树。当前实现返回空数组，结构与 [菜单树节点](#menu-tree-node) 一致 |
| `perms` | array | 权限码列表（去重后） |

`user` 对象字段：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 用户 ID |
| `username` | string | 登录名 |
| `nickname` | string | 显示名称 |
| `email` | string | 邮箱 |
| `phone` | string | 手机号 |
| `avatar` | string | 头像地址 |
| `roles` | array | 角色编码列表 |

**示例响应**

```json
{
  "code": "0",
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": 1,
      "username": "admin",
      "nickname": "系统管理员",
      "email": "admin@example.com",
      "phone": "13800000000",
      "avatar": "https://cdn.example.com/avatar/admin.png",
      "roles": ["ADMIN"]
    },
    "menus": [],
    "perms": ["menu:view", "user:create"]
  }
}
```

**错误场景**
- 400：参数缺失
- 401：用户名或密码错误

### 2.2 刷新访问令牌
- **URL**：`POST /api/auth/refresh`
- **说明**：使用刷新令牌换取新的访问令牌/刷新令牌。
- **是否鉴权**：否

**请求体**

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `refreshToken` | string | 是 | 登录返回的刷新令牌 |

**响应 `data` 字段**

同登录响应中的 `token`、`refreshToken`、`expiresIn` 字段。

**错误场景**
- 401：刷新令牌无效或已过期

### 2.3 登出
- **URL**：`POST /api/auth/logout`
- **说明**：将当前访问令牌加入黑名单。前端需自行清理本地状态。
- **是否鉴权**：是
- **请求体**：无
- **请求头**：`Authorization: Bearer <token>`
- **响应**：`data` 为 `null`

### 2.4 获取当前用户
- **URL**：`GET /api/auth/profile`
- **说明**：返回当前登录用户的基本信息。
- **是否鉴权**：是
- **响应 `data` 字段**：结构与登录响应中的 `user` 相同。

---

## 3. 用户管理

用户相关接口路径统一为 `/api/users`。除非特殊说明，均需携带 `Authorization` 头。

### 3.1 查询用户列表
- **URL**：`GET /api/users`
- **说明**：分页查询用户，可按名称、角色、状态过滤。

**Query 参数**

| 参数 | 类型 | 默认 | 说明 |
| ---- | ---- | ---- | ---- |
| `page` | number | 1 | 页码（从 1 开始） |
| `size` | number | 10 | 每页条数，最小 1，最大 100 |
| `name` | string | - | 用户名或昵称模糊匹配 |
| `roleId` | number | - | 角色 ID 过滤 |
| `status` | string | - | 用户状态过滤，取值见 [状态字典](#状态字典) |

**响应 `data.list` 项（UserSummaryDto）**

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 用户 ID |
| `username` | string | 登录名 |
| `nickname` | string | 显示名称 |
| `email` | string | 邮箱 |
| `phone` | string | 手机号 |
| `status` | string | 状态，见 [状态字典](#状态字典) |
| `lastLoginAt` | string | 最近登录时间（ISO 8601），可能为 `null` |
| `roles` | array | 用户拥有的角色数组，每项为 `{ "id": number, "code": string, "name": string }` |

### 3.2 创建用户
- **URL**：`POST /api/users`
- **说明**：创建新用户并分配角色。

**请求体**

| 字段 | 类型 | 必填 | 校验/说明 |
| ---- | ---- | ---- | -------- |
| `username` | string | 是 | 不超过 64 字符，唯一 |
| `password` | string | 是 | 6~64 字符 |
| `nickname` | string | 否 | 不超过 64 字符，留空则默认使用用户名 |
| `email` | string | 否 | RFC 邮箱格式，不超过 128 字符，唯一 |
| `phone` | string | 否 | 允许数字、`+ - ( )`，不超过 32 字符，唯一 |
| `status` | string | 否 | 见 [状态字典](#状态字典)，默认 `enabled` |
| `roleIds` | array | 否 | 角色 ID 列表，缺省视为无角色 |

**响应**：返回新增用户的 `UserSummaryDto`。

**错误场景**
- 409：用户名/邮箱/手机号重复
- 400：状态非法或角色不存在

### 3.3 查看用户详情
- **URL**：`GET /api/users/{id}`
- **说明**：返回指定用户的 `UserSummaryDto`。
- **错误场景**：404 用户不存在或已删除

### 3.4 更新用户
- **URL**：`PUT /api/users/{id}`
- **说明**：更新用户信息，未提供的字段不修改；提供为空字符串的字段会被清空（邮箱/电话等）。

**请求体字段** 与创建用户一致，但全部为可选。额外说明：
- `password` 提供时将重置密码。
- `roleIds` 提供时会重置用户角色；传空数组代表清空角色。

**响应**：更新后的 `UserSummaryDto`。

### 3.5 修改用户状态
- **URL**：`PATCH /api/users/{id}/status`
- **说明**：仅更新用户状态。

**请求体**

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `status` | string | 是 | 新状态，见 [状态字典](#状态字典) |

**业务规则**
- 状态更新为 `enabled` 时会清除软删除标记。
- 非法状态返回 400。

### 3.6 删除用户
- **URL**：`DELETE /api/users/{id}`
- **说明**：逻辑删除用户（状态置为 `disabled`、记录删除时间并解绑角色）。
- **响应**：`data` 为 `null`
- **错误场景**：404 用户不存在或已删除

---

## 4. 角色管理

角色相关接口统一为 `/api/roles`。

### 4.1 查询角色列表
- **URL**：`GET /api/roles`
- **说明**：分页查询角色信息。

**Query 参数**

| 参数 | 类型 | 默认 | 说明 |
| ---- | ---- | ---- | ---- |
| `page` | number | 1 | 页码 |
| `size` | number | 10 | 每页条数，最小 1，最大 100 |

**响应 `data.list` 项（RoleListDto）**

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 角色 ID |
| `code` | string | 角色编码（唯一） |
| `name` | string | 角色名称 |
| `description` | string | 角色描述，可能为 `null` |
| `createdAt` | string | 创建时间（ISO 8601） |
| `updatedAt` | string | 最近更新时间（ISO 8601） |
| `permissions` | array | 权限码列表，按编码升序 |

### 4.2 创建角色
- **URL**：`POST /api/roles`

**请求体**

| 字段 | 类型 | 必填 | 校验/说明 |
| ---- | ---- | ---- | -------- |
| `code` | string | 是 | 不超过 64 字符，唯一 |
| `name` | string | 是 | 不超过 64 字符 |
| `description` | string | 否 | 不超过 256 字符 |
| `permissionIds` | array | 否 | 权限 ID 列表，缺省为空 |

**响应**：新增角色的 `RoleListDto`。

**错误场景**
- 409：角色编码已存在
- 400：权限不存在

### 4.3 更新角色
- **URL**：`PUT /api/roles/{id}`
- **说明**：更新角色基本信息及权限。所有字段可选。
- **请求体**：与创建角色相同。`permissionIds` 提供时全量替换；传空数组表示清空权限。
- **响应**：更新后的 `RoleListDto`。
- **错误场景**：404 角色不存在；409 编码冲突；400 权限不存在

### 4.4 修改角色权限
- **URL**：`PATCH /api/roles/{id}/permissions`
- **说明**：只更新权限集合，按权限编码提交，服务端会校验并转换为权限 ID。

**请求体**

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `permissionCodes` | array | 是 | 权限编码列表，传空数组表示清空权限；不存在的编码会被忽略 |

**响应**：更新后的 `RoleListDto`。

### 4.5 删除角色
- **URL**：`DELETE /api/roles/{id}`
- **说明**：删除角色，删除前会校验是否仍有关联用户。
- **响应**：`data` 为 `null`
- **错误场景**
  - 404：角色不存在
  - 409：仍有关联用户，无法删除

---

## 5. 菜单管理

菜单接口统一为 `/api/menus`。

### 5.1 获取全部菜单树
- **URL**：`GET /api/menus`
- **说明**：返回系统中全部菜单的树形结构，不做权限过滤，可用于后台管理界面。

**响应**：数组形式的菜单树节点列表，格式与 [菜单树节点](#menu-tree-node) 一致。

### 5.2 获取用户菜单树
- **URL**：`GET /api/menus/tree`
- **说明**：返回当前登录用户有权限访问的有序菜单树，`assigned` 字段表示该用户是否拥有节点关联的权限码。

**响应**：数组形式的菜单树节点列表。节点结构见下文 [菜单树节点](#menu-tree-node)。

### 5.3 获取指定用户菜单树
- **URL**：`GET /api/menus/user-tree`
- **说明**：用于权限管理场景，返回指定用户的完整菜单树，并在 `assigned` 字段标记其是否拥有该菜单权限。

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `userId` | number | 是 | 目标用户 ID |

**响应**：数组形式的菜单树节点列表，结构同上。

### 5.4 获取指定角色菜单树
- **URL**：`GET /api/menus/role-tree`
- **说明**：返回指定角色可用的完整菜单树，`assigned` 字段用于标记该角色是否拥有关联权限码。

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `roleId` | number | 是 | 目标角色 ID |

**响应**：数组形式的菜单树节点列表，结构同上。

### 5.5 创建菜单
- **URL**：`POST /api/menus`

**请求体**

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `parentId` | number | 否 | 父节点 ID，缺省为根节点 |
| `title` | string | 是 | 菜单标题，≤64 字符 |
| `path` | string | 否 | 前端路由路径，≤128 字符 |
| `component` | string | 否 | 前端组件路径，≤128 字符 |
| `icon` | string | 否 | 图标标识，≤64 字符 |
| `type` | number | 是 | 菜单类型，见 [菜单类型](#状态字典) |
| `orderNum` | number | 否 | 排序值，默认 0 |
| `keepAlive` | boolean | 否 | 是否缓存页面，默认 `true` |
| `visible` | boolean | 否 | 是否在菜单中显示，默认 `true` |
| `permissionCode` | string | 否 | 关联的权限码，必须存在于权限表 |
| `meta` | object | 否 | 自定义元数据，将以 JSON 存储 |

**响应**：新建节点的菜单树结构。

**额外规则**：若填写 `permissionCode` 且权限不存在，系统会自动创建同名权限（`name` 与 `code` 相同，类型记为 `menu`）。

**错误场景**：404 父菜单不存在；400 类型非法

### 5.6 更新菜单
- **URL**：`PUT /api/menus/{id}`
- **说明**：更新菜单属性，所有字段可选。`parentId` 变更时禁止将节点移动到自己的子节点。

**额外规则**：提供新的 `permissionCode` 时会执行同创建接口相同的自动建权限逻辑；传空字符串则清空关联。

**错误场景**
- 404：菜单或新父级不存在
- 400：标题为空、类型非法、父节点循环引用

**响应**：更新后的菜单节点。

### 5.7 删除菜单
- **URL**：`DELETE /api/menus/{id}`
- **说明**：删除指定菜单，若存在子菜单则返回冲突。
- **响应**：`data` 为 `null`
- **错误场景**：404 菜单不存在；409 仍有子菜单

### 5.8 菜单树节点结构 <a id="menu-tree-node"></a>

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 菜单 ID |
| `title` | string | 菜单标题 |
| `path` | string | 前端路由路径 |
| `component` | string | 前端组件路径 |
| `icon` | string | 图标 |
| `type` | number | 菜单类型，见 [状态字典](#状态字典) |
| `orderNum` | number | 排序值 |
| `keepAlive` | boolean | 是否需要缓存 |
| `visible` | boolean | 菜单是否可见 |
| `permissionCode` | string | 关联权限码，可能为 `null` |
| `meta` | object | 自定义元数据，原样返回 |
| `assigned` | boolean | 标记当前用户是否拥有此节点关联的权限 |
| `children` | array | 子节点列表 |

---

## 6. 社区管理

### 6.1 查询社区列表
- **URL**：`GET /api/communities`
- **说明**：分页返回社区主档信息，单个条目包含下表所有字段。按创建时间倒序排序。

**Query 参数**

| 参数 | 类型 | 默认 | 说明 |
| ---- | ---- | ---- | ---- |
| `page` | number | 1 | 页码，最小 1 |
| `size` | number | 10 | 每页条数，1-100 |

**响应 `data.list` 项（CommunityDto）**

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 社区主键 |
| `name` | string | 社区名称 |
| `shortName` | string | 社区名称缩写 |
| `nameEn` | string | 社区英文名 |
| `status` | number | 状态 |
| `operatorUserId` | number | 创建者用户 ID |
| `city` | string | 城市 |
| `province` | string | 省份 |
| `country` | string | 国家 |
| `address` | string | 地址 |
| `latitude` | number | 纬度，保留 6 位小数 |
| `longitude` | number | 经度，保留 6 位小数 |
| `timezone` | string | 时区 |
| `summary` | string | 摘要 |
| `lifeFacilities` | string | 生活设施描述 |
| `description` | string | 社区描述 |
| `ratingAvg` | number | 平均评分 |
| `ratingCount` | number | 评分数量 |
| `tags` | array | 标签列表 |
| `refundPolicy` | string | 退改政策 |
| `createdAt` | string | 创建时间（ISO 8601） |
| `updatedAt` | string | 更新时间（ISO 8601） |

### 6.2 更新社区
- **URL**：`PATCH /api/communities/{id}`
- **说明**：更新指定社区的基础信息。所有字段可选，缺省则保持原值。

**请求体字段**（均可选）

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `name` | string | 社区名称 |
| `shortName` | string | 名称缩写 |
| `nameEn` | string | 英文名 |
| `status` | number | 状态 |
| `operatorUserId` | number | 创建者用户 ID |
| `city` | string | 城市 |
| `province` | string | 省份 |
| `country` | string | 国家 |
| `address` | string | 地址 |
| `latitude` | number | 纬度 |
| `longitude` | number | 经度 |
| `timezone` | string | 时区 |
| `summary` | string | 摘要 |
| `lifeFacilities` | string | 生活设施描述 |
| `description` | string | 社区描述 |
| `ratingAvg` | number | 平均评分 |
| `ratingCount` | number | 评分数量 |
| `tags` | array | 标签列表，字符串数组 |
| `refundPolicy` | string | 退改政策 |

**响应**：更新后的 `CommunityDto`。

### 6.3 删除社区
- **URL**：`DELETE /api/communities/{id}`
- **说明**：标记删除社区（`status` 置为 `-1`），不做物理删除。
- **响应**：`data` 为 `null`

## 7. 状态字典与枚举 <a id="状态字典"></a>

| 枚举 | 取值 | 说明 |
| ---- | ---- | ---- |
| 用户状态 `status` | `enabled` | 启用（默认） |
|  | `disabled` | 禁用，无法登录 |
|  | `locked` | 锁定，通常因安全策略触发 |
| 菜单类型 `type` | `0` | 目录/菜单节点 |
|  | `1` | 按钮/操作权限节点 |

---

## 7. 开发注意事项

1. 接口返回的时间字段统一采用 ISO 8601 字符串（示例：`2024-04-01T12:30:00Z`）。
2. 角色、权限等 ID 需要在数据库中实际存在；提供不存在的 ID 会返回 400。
3. 删除接口返回 `code: "0"` 与 HTTP 200，表示操作成功但无返回数据。
4. 建议在后端启动 SpringDoc/Swagger（`/swagger-ui.html`、`/v3/api-docs`）以查看最新接口描述。

> 如需扩展接口或新增字段，请同步更新本文档与相应的 DTO/Controller。
