# dn-admin-server 接口文档（初稿）

本文列出 `dn-admin-web` 对应的后端 REST API 设计，所有接口前缀统一为 `/api`，返回值默认使用如下结构：

```json
{
  "code": "0",
  "message": "success",
  "data": { ... }
}
```

- `code`：字符串，`0` 表示成功，其他值由枚举定义。
- `message`：提示信息。
- `data`：有效负载，分页接口为 `{ "list": [], "page": 1, "size": 10, "total": 100 }`。

若出现业务错误，返回 HTTP 200 + 非 `0` 的业务码；若为系统错误（鉴权失败、服务器异常等），返回对应 HTTP 状态码。

---

## 1. 认证与账户

### 1.1 登录
- **URL**：`POST /api/auth/login`
- **描述**：用户名密码登录，返回令牌、菜单和权限集。
- **请求体**
```json
{
  "username": "admin",
  "password": "Admin@123"
}
```
- **响应**
```json
{
  "code": "0",
  "message": "success",
  "data": {
    "token": "jwt-token",
    "refreshToken": "refresh-token",
    "expiresIn": 3600,
    "user": {
      "id": 1,
      "username": "admin",
      "nickname": "系统管理员",
      "email": "admin@example.com",
      "phone": "13800000000",
      "avatar": "https://cdn.example.com/avatar/admin.png",
      "roles": ["admin"]
    },
    "menus": [ ... 菜单树 ... ],
    "perms": ["0", "1", "11", "..."]
  }
}
```

### 1.2 刷新令牌
- **URL**：`POST /api/auth/refresh`
- **请求体**
```json
{
  "refreshToken": "refresh-token"
}
```
- **响应**：返回新的 `token` / `refreshToken`。

### 1.3 登出
- **URL**：`POST /api/auth/logout`
- **描述**：令牌加入黑名单，前端清理本地状态。

### 1.4 注册（可选）
- **URL**：`POST /api/auth/register`
- **请求体**：`username`, `password`, `email`, `phone`。
- **响应**：注册成功后可直接登录或等待审核。

### 1.5 重置密码
- **URL**：`POST /api/auth/reset-password`
- **请求体**：`email/phone`, `captcha`, `newPassword`。

### 1.6 获取当前用户
- **URL**：`GET /api/auth/profile`
- **响应**：返回用户详情和权限集，与登录响应中的 `user`、`perms` 保持一致。

---

## 2. 系统管理

### 2.1 用户管理

#### 2.1.1 用户列表
- **URL**：`GET /api/users`
- **Query**：
  - `page`（默认 1）
  - `size`（默认 10）
  - `name`（模糊匹配用户名）
  - `roleId`（按角色筛选，可选）
- **响应（示例）**
```json
{
  "code": "0",
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "name": "张三",
        "password": "******",
        "email": "123@qq.com",
        "phone": "12345678944",
        "date": "2024-01-01",
        "role": "管理员",
        "status": "enabled"
      }
    ],
    "page": 1,
    "size": 10,
    "total": 2
  }
}
```

#### 2.1.2 创建用户
- **URL**：`POST /api/users`
- **请求体**
```json
{
  "name": "李四",
  "password": "Pass@123",
  "email": "lisi@example.com",
  "phone": "13800000002",
  "roleIds": [1, 2]
}
```

#### 2.1.3 更新用户
- **URL**：`PUT /api/users/{id}`
- **请求体**：同创建接口，允许部分字段。

#### 2.1.4 删除 / 禁用用户
- **URL**：`DELETE /api/users/{id}`
- **响应**：成功后返回 `code = 0`。

#### 2.1.5 用户详情
- **URL**：`GET /api/users/{id}`

#### 2.1.6 用户导入
- **URL**：`POST /api/users/import`
- **描述**：上传 Excel（表头参考 `public/template.xlsx`）。
- **响应**：返回成功条数、失败条数及错误明细。

#### 2.1.7 用户导出
- **URL**：`GET /api/users/export`
- **描述**：返回 Excel 文件流。

### 2.2 角色管理
- **列表**：`GET /api/roles`
- **创建**：`POST /api/roles`
- **更新**：`PUT /api/roles/{id}`
- **删除**：`DELETE /api/roles/{id}`
- **分配权限**：`PUT /api/roles/{id}/permissions`
  - **请求体**
  ```json
  {
    "permissionIds": [11, 12, 13]
  }
  ```

角色列表的响应参考 `public/mock/role.json`，包含角色信息与绑定的权限 ID。

### 2.3 菜单管理
- **菜单树**：`GET /api/menus/tree`
  - 响应结构示例：
  ```json
  [
    {
      "id": "0",
      "title": "系统首页",
      "index": "/dashboard",
      "icon": "Odometer",
      "children": []
    }
  ]
  ```
- **新增菜单**：`POST /api/menus`
- **更新菜单**：`PUT /api/menus/{id}`
- **删除菜单**：`DELETE /api/menus/{id}`
- **菜单权限选项**：`GET /api/menus/options`（供前端选择父节点或权限码）。

### 2.4 权限字典
- **URL**：`GET /api/perms`
- **描述**：返回所有有效的权限码。如需与角色管理联动，可返回 `{ "id": "11", "name": "用户管理" }`。

### 2.5 个人中心
- **获取个人资料**：`GET /api/profile`
- **更新个人资料**：`PUT /api/profile`
- **修改密码**：`PUT /api/profile/password`

### 2.6 消息中心
- **未读数量**：`GET /api/messages/unread-count`
- **消息列表**：`GET /api/messages`
  - 支持 `page`、`size`、`status`（unread/read）参数。
- **标记已读**：`PUT /api/messages/{id}/read`

---

## 3. 仪表盘与统计

### 3.1 指标卡数据
- **URL**：`GET /api/dashboard/cards`
- **描述**：返回访问量、消息数、商品数量、订单量等。
- **响应示例**
```json
{
  "list": [
    { "name": "用户访问量", "value": 6666 },
    { "name": "系统消息", "value": 168 }
  ]
}
```

### 3.2 订单趋势
- **URL**：`GET /api/dashboard/orders-trend`
- **Query**：`range=7d`（默认近 7 天）、`channel`。
- **响应**：返回折线图数据：
```json
{
  "dates": ["2024-01-01", "2024-01-07"],
  "orders": [120, 98],
  "returns": [5, 6]
}
```

### 3.3 品类分布
- **URL**：`GET /api/dashboard/category-distribution`
- **响应**：饼图数据 `{ "name": "手机", "value": 300 }`。

### 3.4 渠道地图
- **URL**：`GET /api/dashboard/channel-map`
- **响应**：适配 ECharts 地图的数据：
```json
{
  "series": [
    { "name": "北京", "value": 1200 },
    { "name": "上海", "value": 900 }
  ]
}
```

### 3.5 时间线
- **URL**：`GET /api/dashboard/timeline`
- **响应**：返回近期事件列表（内容、描述、时间戳、颜色）。

### 3.6 排行榜
- **URL**：`GET /api/dashboard/rankings`
- **响应**：
```json
{
  "list": [
    { "title": "手机", "value": 10000, "percent": 80, "color": "#f25e43" }
  ]
}
```

---

## 4. 列表/表格示例数据

### 4.1 基础表格（Products）
- **列表**：`GET /api/products`
  - **Query**：`page`, `size`, `name`, `categoryId`, `status`
  - **响应**：参考 `public/mock/table.json`
- **新增**：`POST /api/products`
- **更新**：`PUT /api/products/{id}`
- **删除**：`DELETE /api/products/{id}`
- **批量导入**：`POST /api/products/import`
- **导出**：`GET /api/products/export`

### 4.2 可编辑表格
- **批量保存**：`PATCH /api/products/batch`
- **请求体**
```json
{
  "items": [
    { "id": 1, "price": 1999, "stock": 100 },
    { "id": 2, "price": 2999, "stock": 50 }
  ]
}
```

### 4.3 Excel 导入/导出
- 复用 `products` 或其它业务实体接口，按照模板校验。

---

## 5. 富文本、Markdown、文件上传

### 5.1 富文本图片上传
- **URL**：`POST /api/files/rich-text`
- **描述**：返回图片 URL。
- **响应**
```json
{
  "code": "0",
  "message": "success",
  "data": {
    "url": "https://cdn.example.com/uploads/xxx.png"
  }
}
```

### 5.2 通用文件上传
- **URL**：`POST /api/files/upload`
- **FormData**：`file`，`bizType`（如 `avatar`, `excel`, `attachment`）。
- **响应**：文件 ID、URL、原始文件名、大小、类型。

### 5.3 删除文件
- **URL**：`DELETE /api/files/{id}`

### 5.4 文件列表（可选）
- **URL**：`GET /api/files`
- **Query**：`bizType`, `page`, `size`。

---

## 6. 主题与设置

- **获取主题**：`GET /api/themes`
  - 响应：
  ```json
  {
    "primary": "#409eff",
    "success": "#67c23a",
    "warning": "#e6a23c",
    "danger": "#f56c6c",
    "info": "#909399",
    "headerBgColor": "#242f42",
    "headerTextColor": "#fff",
    "sidebarBgColor": "#324157",
    "sidebarTextColor": "#bfcbd9"
  }
  ```
- **更新主题**：`PUT /api/themes`
- **重置主题**：`POST /api/themes/reset`（可选）

---

## 7. 公共与支撑接口

- **权限点列表**：`GET /api/perms`
- **操作日志**：`GET /api/audit/logs`
- **系统设置**：`GET /api/settings`、`PUT /api/settings`
- **健康检查**：`GET /actuator/health`（Spring Boot Actuator）
- **Swagger/OpenAPI**：`/swagger-ui.html`、`/v3/api-docs`

---

## 8. 状态码与错误示例

| HTTP 状态码 | 场景 |
| ----------- | ---- |
| 200 | 正常响应（可能包含业务错误码） |
| 201 | 创建成功 |
| 204 | 删除成功 |
| 400 | 参数错误 |
| 401 | 未授权（token 失效或未登录） |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 409 | 数据冲突，例如用户名已存在 |
| 422 | 导入校验错误 |
| 500 | 服务端异常 |

业务错误码示例：

| 业务码 | 描述 |
| ------ | ---- |
| `A0001` | 用户不存在 |
| `A0002` | 密码错误 |
| `B0101` | 权限不足 |
| `C0201` | 文件大小超限 |

---

## 9. Mock 数据对照

为便于前端迁移，`dn-admin-server/mock/` 目录同步了现有 JSON：

| 文件 | 说明 |
| ---- | ---- |
| `user.json` | 用户列表示例 |
| `role.json` | 角色与权限示例 |
| `table.json` | 基础表格示例 |
| `template.xlsx` | Excel 导入模板 |

后端实现时需确保接口字段与这些结构兼容，逐步替换前端 mock。

---

## 10. 后续工作

1. 基于本文档在 Spring Boot 中定义 DTO、Controller、Service。
2. 借助 SpringDoc 自动生成在线接口文档，保持与文本版同步。
3. 随着业务扩展，补充更多接口（如字典、附件管理、批量操作等）。

> 本文档为初稿，后续可在 `docs/` 目录继续补充详细示例、错误码枚举和实体字段说明。
