# Co-Creation Project API

依赖平台数据库 (`PLATFORM_DATASOURCE_ENABLED=true`)，所有接口需通过 JWT 鉴权。

## 1. 数据结构

**CoCreationProjectDto**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 项目主键（UUID） |
| `title` | string | 项目名称 |
| `host` | string | 主理方 |
| `city` | string | 城市/场地 |
| `certified` | boolean | 是否认证项目 |
| `deadlineAt` | string | 报名截止时间（ISO 8601） |
| `coverUrl` | string | 封面 URL |
| `coverAlt` | string | 封面 ALT 描述 |
| `brief` | string | 项目简介 |
| `teamIntro` | string | 团队介绍 |
| `workMode` | string | 工作方式 |
| `duration` | string | 项目时长 |
| `memberType` | string | 岗位类型 |
| `cooperation` | string | 合作方式 |
| `reward` | string | 薪酬/分成 |
| `requirement` | string | 项目要求 |
| `postedAt` | string | 发布时间 |
| `status` | number | 状态 (0=DRAFT,1=PUBLISHED,2=ARCHIVED) |
| `createdBy` | number | 创建人 ID |
| `updatedBy` | number | 更新人 ID |
| `createdAt` | string | 创建时间（ISO 8601） |
| `updatedAt` | string | 更新时间（ISO 8601） |
| `coverResourceId` | number | 关联封面资源 |

## 2. 接口

### 2.1 查询项目列表
- **URL**：`GET /api/cocreation/projects`
- **说明**：分页返回项目，按 `deadlineAt`、`createdAt` 倒序。

| Query | 默认 | 说明 |
| --- | --- | --- |
| `page` | 1 | 页码，最小 1 |
| `size` | 10 | 每页条数，1-100 |

响应：`ApiResponse<PageResponse<CoCreationProjectDto>>`

### 2.2 项目详情
- **URL**：`GET /api/cocreation/projects/{id}`
- **响应**：`CoCreationProjectDto`

### 2.3 创建项目
- **URL**：`POST /api/cocreation/projects`
- **说明**：创建项目，系统生成 `id`。

`CreateCoCreationProjectRequest`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `title` | string | 是 | 项目名称 |
| `host` | string | 是 | 主理方 |
| `city` | string | 是 | 城市/场地 |
| `certified` | boolean | 否 | 默认 `false` |
| `status` | number | 否 | 默认 0 |
| 其它字段 | - | 否 | deadline、封面、简介、团队、合作方式、薪酬、要求、postedAt、createdBy 等 |

响应：新建 `CoCreationProjectDto`

### 2.4 更新项目
- **URL**：`PATCH /api/cocreation/projects/{id}`
- **说明**：`UpdateCoCreationProjectRequest` 所有字段可选，存在即覆盖原值。
- **响应**：更新后的 `CoCreationProjectDto`

### 2.5 删除项目
- **URL**：`DELETE /api/cocreation/projects/{id}`
- **响应**：`data=null`

### 2.6 更新项目状态
- **URL**：`PATCH /api/cocreation/projects/{id}/status`
- **Query**：`status`
- **说明**：仅更新状态字段。
- **响应**：更新后的 `CoCreationProjectDto`

---

所有接口返回 `ApiResponse`，`code="0"` 表示成功；异常情况请查看 `message`。确保平台库存在 `co_creation_project` 表后再启用模块。
