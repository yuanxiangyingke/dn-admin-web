# Room Booking Request API

依赖平台数据库 (`PLATFORM_DATASOURCE_ENABLED=true`)，接口需 JWT 鉴权。

## 1. 数据结构

**RoomBookingRequestDto**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 预订申请主键 |
| `userId` | number | 申请用户 ID |
| `communityId` | number | 目标社区 ID |
| `roomId` | number | 意向房间 ID，可为空 |
| `ratePlanId` | number | 意向价目方案 ID，可为空 |
| `checkIn` | string | 期望入住日（ISO 日期） |
| `checkOut` | string | 期望退房日（ISO 日期） |
| `guests` | number | 同行人数 (>0) |
| `guestName` | string | 申请人姓名 |
| `phone` | string | 联系电话 |
| `idNumber` | string | 证件号 |
| `education` | string | 教育背景 |
| `intro` | string | 个人介绍 |
| `communityExpect` | string | 对社区期待 |
| `priceQuoteAmount` | number | 报价金额 |
| `priceQuoteCurrency` | string | 报价币种（默认 CNY） |
| `pricingSnapshot` | string | 报价快照 JSON 文本 |
| `status` | string | 状态（默认 `SUBMITTED`） |
| `reviewedBy` | number | 审核人用户 ID |
| `reviewedAt` | string | 审核时间 |
| `rejectionReason` | string | 驳回原因 |
| `createdAt` | string | 创建时间（ISO 8601） |
| `updatedAt` | string | 更新时间（ISO 8601） |

## 2. 接口

### 2.1 预订申请列表
- **URL**：`GET /api/room-booking-requests`
- **说明**：分页返回申请，按创建时间倒序。

| Query | 默认 | 说明 |
| --- | --- | --- |
| `page` | 1 | 页码，最小 1 |
| `size` | 10 | 每页条数，1-100 |

响应：`ApiResponse<PageResponse<RoomBookingRequestDto>>`

### 2.2 申请详情
- **URL**：`GET /api/room-booking-requests/{id}`
- **响应**：`RoomBookingRequestDto`

### 2.3 新建申请
- **URL**：`POST /api/room-booking-requests`

`CreateRoomBookingRequest`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `userId` | number | 是 | 申请用户 |
| `communityId` | number | 是 | 目标社区 |
| `roomId` | number | 否 | 意向房间 |
| `ratePlanId` | number | 否 | 意向价目 |
| `checkIn` | string | 是 | 入住日 |
| `checkOut` | string | 是 | 退房日（需大于入住日，由 DB 约束校验） |
| `guests` | number | 否 | 同行人数，默认 1 |
| `guestName` | string | 是 | 姓名 |
| `phone` | string | 是 | 联系电话 |
| 其它字段 | - | 否 | 证件、教育、介绍、报价、状态、审核人、驳回原因等 |

响应：新建 `RoomBookingRequestDto`

### 2.4 更新申请
- **URL**：`PATCH /api/room-booking-requests/{id}`
- **说明**：`UpdateRoomBookingRequest` 全字段可选，存在即覆盖。
- **响应**：更新后的 `RoomBookingRequestDto`

### 2.5 删除申请
- **URL**：`DELETE /api/room-booking-requests/{id}`
- **响应**：`data=null`

---

接口统一返回 `ApiResponse`，`code="0"` 为成功。请确保平台库已有 `room_booking_requests` 表并启用平台数据源。
