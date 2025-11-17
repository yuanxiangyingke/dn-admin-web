# Rooms API

依赖平台数据库 (`PLATFORM_DATASOURCE_ENABLED=true`)，接口需 JWT 鉴权。

## 1. 数据结构

**RoomDto**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 房源主键 |
| `communityId` | number | 所属社区 ID |
| `name` | string | 房屋名称 |
| `code` | string | 房屋编码 |
| `status` | string | 房源状态 (`published`/`offline`) |
| `roomType` | string | 房型 (`private`/`shared`) |
| `description` | string | 房源描述 |
| `createdAt` | string | 创建时间（ISO 8601） |
| `updatedAt` | string | 更新时间（ISO 8601） |

## 2. 接口

### 2.1 房源列表
- **URL**：`GET /api/rooms`
- **说明**：分页返回房源，按创建时间倒序。

| Query | 默认 | 说明 |
| --- | --- | --- |
| `page` | 1 | 页码，最小 1 |
| `size` | 10 | 每页条数，1-100 |

响应：`ApiResponse<PageResponse<RoomDto>>`

### 2.2 房源详情
- **URL**：`GET /api/rooms/{id}`
- **响应**：`RoomDto`

### 2.3 新增房源
- **URL**：`POST /api/rooms`
- **请求体 `CreateRoomRequest`**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `communityId` | number | 是 | 所属社区 |
| `name` | string | 是 | 房屋名称 |
| `code` | string | 否 | 房屋编码 |
| `status` | string | 否 | 默认 `published` |
| `roomType` | string | 否 | 默认 `private` |
| `description` | string | 否 | 房源描述 |

响应：新建 `RoomDto`

### 2.4 更新房源
- **URL**：`PATCH /api/rooms/{id}`
- **说明**：`UpdateRoomRequest` 字段均可选，存在即覆盖。
- **响应**：更新后的 `RoomDto`

### 2.5 删除房源
- **URL**：`DELETE /api/rooms/{id}`
- **响应**：`data=null`

---

所有接口返回统一 `ApiResponse`，`code="0"` 表示成功。确保平台库存在 `rooms` 表并启用平台数据源后再调用。
