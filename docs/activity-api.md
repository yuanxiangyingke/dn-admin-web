# Activity API

活动管理接口依赖平台数据库 (`PLATFORM_DATASOURCE_ENABLED=true`)，所有接口均需通过 JWT 鉴权。

## 1. 数据结构

**ActivityDto**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 活动主键 |
| `title` | string | 活动名称 |
| `status` | number | 状态，默认 0 |
| `visibility` | number | 可见性，默认 0 |
| `summary` | string | 活动简介 |
| `description` | string | 活动详情 |
| `coverUrl` | string | 封面 URL |
| `mode` | number | 活动形式，默认 0 |
| `city` | string | 城市 |
| `venue` | string | 活动地点 |
| `startAt` | string | 开始时间（ISO 8601） |
| `endAt` | string | 结束时间（ISO 8601） |
| `feeType` | number | 费用设置，默认 0 |
| `price` | number | 票价 |
| `currency` | string | 币种 |
| `capacity` | number | 活动人数 |
| `createdBy` | number | 创建人 |
| `updatedBy` | number | 更新人 |
| `createdAt` | string | 创建时间（ISO 8601） |
| `updatedAt` | string | 更新时间（ISO 8601） |
| `publishedAt` | string | 发布时间（ISO 8601，可为 null） |
| `coverResourceId` | number | 关联封面资源 ID |

## 2. 接口列表

### 2.1 查询活动列表
- **URL**：`GET /api/activities`
- **说明**：分页查询活动，按 `createdAt` 降序返回。

**Query 参数**

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `page` | number | 1 | 页码，最小 1 |
| `size` | number | 10 | 每页条数，1-100 |

**响应**：`ApiResponse<PageResponse<ActivityDto>>`

### 2.2 活动详情
- **URL**：`GET /api/activities/{id}`
- **说明**：根据主键返回活动详情。
- **响应**：`ActivityDto`

### 2.3 创建活动
- **URL**：`POST /api/activities`
- **说明**：创建一条活动记录。

**请求体 `CreateActivityRequest`**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `title` | string | 是 | 活动标题 |
| `status` | number | 否 | 状态，缺省 0 |
| `visibility` | number | 否 | 可见性，缺省 0 |
| `summary` | string | 是 | 简介 |
| `description` | string | 是 | 详情 |
| `coverUrl` | string | 是 | 封面 |
| `mode` | number | 否 | 活动形式，缺省 0 |
| `city` | string | 是 | 城市 |
| `venue` | string | 是 | 地点 |
| `startAt` | string | 是 | 开始时间（ISO 8601） |
| `endAt` | string | 是 | 结束时间（ISO 8601） |
| `feeType` | number | 否 | 费用类型，缺省 0 |
| `price` | number | 否 | 票价 |
| `currency` | string | 否 | 币种 |
| `capacity` | number | 否 | 人数 |
| `createdBy` | number | 是 | 创建人 ID |
| `updatedBy` | number | 否 | 更新人 ID |
| `publishedAt` | string | 否 | 发布时间 |
| `coverResourceId` | number | 否 | 关联资源 |

**响应**：新建的 `ActivityDto`

### 2.4 更新活动
- **URL**：`PATCH /api/activities/{id}`
- **说明**：部分更新活动信息，缺省字段保持原值。

**请求体 `UpdateActivityRequest`**：所有字段可选，名称与创建接口一致（无 `createdBy`）。

**响应**：更新后的 `ActivityDto`

### 2.5 删除活动
- **URL**：`DELETE /api/activities/{id}`
- **说明**：删除指定活动。
- **响应**：`data=null`

---

> 注意：所有接口均返回统一 `ApiResponse`，`code="0"` 表示成功。需要启用平台数据源配置并确保 `activity` 表存在。
