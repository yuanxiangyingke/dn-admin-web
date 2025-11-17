# Job Opportunity API

依赖平台数据库 (`PLATFORM_DATASOURCE_ENABLED=true`)，所有接口需通过 JWT 鉴权。

## 1. 数据结构

**JobOpportunityDto**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 岗位主键（UUID） |
| `externalRef` | string | 外部引用编号 |
| `title` | string | 岗位名称 |
| `companyName` | string | 公司名称 |
| `workMode` | number | 工作方式 (0=REMOTE,1=HYBRID,2=ONSITE) |
| `employmentType` | number | 岗位类型 (0=FULL_TIME,1=PART_TIME,2=CONTRACT,3=FREELANCE) |
| `location` | string | 工作地点 |
| `salaryAmount` | number | 固定薪资 |
| `salaryMinAmount` | number | 薪资下限 |
| `salaryMaxAmount` | number | 薪资上限 |
| `salaryCurrency` | string | 币种（默认 CNY） |
| `salaryDisplay` | string | 自定义薪资展示文案 |
| `description` | string | 岗位描述 |
| `requirement` | string | 任职要求 |
| `teamIntro` | string | 团队介绍 |
| `benefitsSummary` | string | 薪酬与福利 |
| `contact` | string | 联系方式 |
| `status` | number | 状态 (0=DRAFT,1=PUBLISHED,2=ARCHIVED) |
| `postedAt` | string | 发布上线时间 |
| `createdBy` | number | 创建人 ID |
| `updatedBy` | number | 更新人 ID |
| `createdAt` | string | 创建时间（ISO 8601） |
| `updatedAt` | string | 更新时间（ISO 8601） |
| `responsibility` | string | 岗位职责 |
| `preEmployment` | boolean | 是否预就业岗位 |

## 2. 接口

### 2.1 查询岗位列表
- **URL**：`GET /api/jobs`
- **说明**：分页返回岗位，按 `postedAt`、`createdAt` 倒序。

| Query | 默认 | 说明 |
| --- | --- | --- |
| `page` | 1 | 页码，最小 1 |
| `size` | 10 | 每页条数，1-100 |

响应：`ApiResponse<PageResponse<JobOpportunityDto>>`

### 2.2 岗位详情
- **URL**：`GET /api/jobs/{id}`
- **响应**：`JobOpportunityDto`

### 2.3 创建岗位
- **URL**：`POST /api/jobs`
- **说明**：系统生成 `id`，需传基础信息。

`CreateJobRequest`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `title` | string | 是 | 岗位名称 |
| `workMode` | number | 是 | 工作方式 0-2 |
| `employmentType` | number | 是 | 岗位类型 0-3 |
| `location` | string | 是 | 工作地点 |
| `status` | number | 否 | 默认 0 |
| `salaryCurrency` | string | 否 | 默认 `CNY` |
| 其它字段 | - | 否 | 与表结构一致（薪资、描述、联系人、postedAt、createdBy 等） |

响应：新建 `JobOpportunityDto`

### 2.4 更新岗位
- **URL**：`PATCH /api/jobs/{id}`
- **说明**：`UpdateJobRequest` 所有字段可选，存在则覆盖。
- **响应**：更新后的 `JobOpportunityDto`

### 2.5 删除岗位
- **URL**：`DELETE /api/jobs/{id}`
- **响应**：`data=null`

---

返回统一 `ApiResponse`，`code="0"` 为成功；异常时返回相应错误描述。
