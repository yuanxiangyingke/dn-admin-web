# dn-admin-server 后端设计文档

本文档描述 `dn-admin-server` 后端服务的整体设计，目标是为 `dn-admin-web` 前端应用提供可靠的接口支持，替换现有的 mock 数据，同时为后续业务扩展奠定基础。技术栈选型为 **Java + Spring Boot**。

---

## 1. 项目概览

- **目标**：实现后台管理系统的统一服务端，包括认证、授权、系统管理（用户/角色/菜单）、数据统计、文件上传等能力。
- **前端依赖**：Vue3 + Element Plus 单页应用，通过 REST API 获取数据，接口前缀约定为 `/api`.
- **技术栈**：
  - Spring Boot 3.x、Spring Web、Spring Security、Spring Data JPA（或 MyBatis-Plus 作为可选方案）
  - 数据库：PostgreSQL 16.10（若需 MySQL 兼容，可在后续迭代评估）
  - 缓存：Redis（会话黑名单、验证码、热点数据）
  - 文件存储：本地文件系统 + 可扩展至 OSS/MinIO
  - 构建工具：Maven（默认）或 Gradle
  - 文档与测试：SpringDoc OpenAPI、JUnit5、Testcontainers

---

## 2. 系统架构

```
┌────────────────────────────────────────────────────────────┐
│                          dn-admin-web                      │
│               (Vue3 + Pinia + Element Plus SPA)            │
└───────────────────────▲────────────────────────────────────┘
                        │ REST / JSON
                        ▼
┌────────────────────────────────────────────────────────────┐
│                    dn-admin-server (Spring Boot)           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  接口层 (Controller)                                 │  │
│  │  - DTO & Validations                                  │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  应用层 (Service)                                     │  │
│  │  - 业务编排  - RBAC 权限判断  - 缓存协调               │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  领域层 (Domain)                                      │  │
│  │  - 实体/聚合  - 领域服务                             │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  基础设施 (Infra)                                     │  │
│  │  - Repository/DAO (JPA/MyBatis)                        │  │
│  │  - Redis/File/第三方集成                               │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌───────────┐   ┌────────────┐   ┌─────────────┐   ┌─────────┐
│ MySQL/PG  │   │ Redis      │   │ MinIO/OSS    │   │ Logger  │
└───────────┘   └────────────┘   └─────────────┘   └─────────┘
```

---

## 3. 模块划分

| 模块 | 功能说明 |
| ---- | -------- |
| `auth` | 登录、登出、注册、密码重置、token 管理、登录日志 |
| `system` | 用户管理、角色管理、菜单/权限树、个人中心、消息通知 |
| `content` | 示例业务数据（商品、订单等），支撑前端表格/可编辑表格/导入导出 |
| `analytics` | 仪表盘统计、趋势图、品类分布、渠道地图、排行榜 |
| `file` | 通用文件上传、Excel 导入导出、富文本图片处理 |
| `common` | 公共组件（异常、响应包装、国际化、常量、工具） |

每个模块包含 `controller`, `service`, `repository`, `entity`, `dto` 等子包，统一遵循分层结构。

---

## 4. 数据库设计（核心表）

> 以下表结构为抽象说明，具体字段以建模文档/DDL 为准。

### 4.1 系统与权限

- `sys_user`：用户基本信息、状态、手机号、邮箱、密码哈希、登录相关字段（PostgreSQL 16.10）。
- `sys_role`：角色定义（管理员、普通用户等）。
- `sys_permission`：权限点（对应前端 `permiss` 字段）。
- `sys_role_permission`：角色与权限关联表。
- `sys_user_role`：用户与角色关联表。
- `sys_menu`：菜单与路由配置（树形结构），包含前端路由、图标、权限标识。
- `sys_login_log`：登录日志（时间、IP、UA、结果）。
- `sys_operation_log`（可选）：系统操作审计。

### 4.2 业务示例

- `prod_category`：商品分类。
- `prod_product`：商品信息。
- `ord_order`：订单主表（状态、金额、渠道）。
- `ord_order_item`：订单明细。
- `anl_dashboard_snapshot`：仪表盘统计快照（可定时写入）。

### 4.3 文件与配置

- `sys_file`：上传文件记录（路径、类型、大小、归属模块）。
- `sys_setting`：全局配置。
- `sys_notification`：消息通知。
- `sys_theme`：用户主题设置（存储前端自定义样式）。

所有表使用 `id (bigint)` 主键，统一包含 `created_at`, `updated_at`, `deleted_at (soft delete)` 字段。

---

## 5. 核心业务流程

### 5.1 认证授权

1. 用户调用 `POST /api/auth/login`，提供用户名/密码。
2. 服务端校验密码，生成 Access Token（JWT）+ Refresh Token。
3. 返回用户信息 + 角色 + 权限列表（前端基于 `permiss` 控制菜单和按钮）。
4. 每个请求通过 Spring Security 过滤器校验 Token 和权限；支持基于注解的细粒度控制。
5. 登出、强制下线和黑名单通过 Redis 维护。

### 5.2 用户/角色/菜单管理

- 用户列表支持分页、模糊查询（用户名、手机号）。
- 角色提供权限分配、批量授权，支持导出。
- 菜单维护维护路由层级、图标、权限码，对应前端侧边栏。
- 所有修改写入操作日志；可配置多管理员审批流程（扩展）。

### 5.3 表格与导入导出

- 通用分页接口响应：`{ list, page, size, total }`。
- Excel 导出采用异步任务（返回任务 ID，完成后提供下载地址）。
- 导入流程：上传 → 校验 → 入库 → 返回错误明细。

### 5.4 仪表盘统计

- 提供近 7 天订单趋势、品类分布、渠道地图、排行榜等数据。
- 支持定时任务预计算，将结果写入 `anl_dashboard_snapshot`。
- 可选开放实时计算（直接查询订单表）。

### 5.5 文件上传

- 标准接口支持多种文件类型（图片、Excel、文档）。
- 富文本上传返回 CDN 地址。
- 图片裁剪/压缩放在前端，后端负责安全校验与存储。

---

## 6. API 设计概览

| 模块 | 方法 | 路径 | 描述 |
| ---- | ---- | ---- | ---- |
| 认证 | `POST` | `/api/auth/login` | 登录，返回 token + 权限集 |
| 认证 | `POST` | `/api/auth/logout` | 注销会话 |
| 认证 | `POST` | `/api/auth/refresh` | 刷新 token |
| 认证 | `GET`  | `/api/auth/profile` | 当前用户信息 |
| 用户 | `GET`  | `/api/users` | 分页查询用户 |
| 用户 | `POST` | `/api/users` | 新增用户 |
| 用户 | `PUT`  | `/api/users/{id}` | 修改用户 |
| 用户 | `DELETE` | `/api/users/{id}` | 删除/禁用 |
| 用户 | `POST` | `/api/users/import` | Excel 导入 |
| 用户 | `GET`  | `/api/users/export` | 导出 Excel |
| 角色 | `GET`  | `/api/roles` | 角色列表 |
| 角色 | `POST` | `/api/roles` | 新增角色 |
| 角色 | `PUT` | `/api/roles/{id}` | 更新角色 |
| 角色 | `PUT` | `/api/roles/{id}/permissions` | 分配权限 |
| 菜单 | `GET` | `/api/menus/tree` | 菜单树 |
| 菜单 | `POST` | `/api/menus` | 创建菜单 |
| 仪表盘 | `GET` | `/api/dashboard/cards` | 指标卡数据 |
| 仪表盘 | `GET` | `/api/dashboard/orders-trend` | 订单趋势 |
| 仪表盘 | `GET` | `/api/dashboard/category-distribution` | 分类分布 |
| 仪表盘 | `GET` | `/api/dashboard/channel-map` | 渠道地图 |
| 仪表盘 | `GET` | `/api/dashboard/rankings` | 榜单 |
| 内容 | `GET` | `/api/products` | 示例产品列表 |
| 内容 | `POST` | `/api/products/import` | Excel 导入 |
| 文件 | `POST` | `/api/files/upload` | 通用上传 |
| 文件 | `DELETE` | `/api/files/{id}` | 删除文件 |
| 主题 | `GET` | `/api/themes` | 获取主题配置 |
| 主题 | `PUT` | `/api/themes` | 更新主题配置 |

详细字段定义将在 Swagger/OpenAPI 文档中维护。

---

## 7. 安全策略

- **认证**：Spring Security + JWT，支持 Refresh Token；敏感接口开启二次校验（验证码、短信等）。
- **授权**：RBAC 模型 + 注解授权；基于权限码（如 `permiss:31`）控制细粒度资源。
- **数据安全**：密码使用 BCrypt 哈希；手机号/邮箱可选加密存储；所有响应字段做脱敏处理。
- **防护**：开启 XSS/CSRF 防护、请求限流、IP 黑名单、HTTP 安全头；文件上传检查类型/大小。
- **审计**：登录、权限变更、导出等写入日志，支持审计查询。

---

## 8. DevOps 与运维

- **配置管理**：Spring Boot 配置分环境（dev/test/prod），敏感配置（DB、Redis）使用环境变量或配置中心。
- **日志**：使用 Logback + JSON Layout，接入 ELK/EFK；TraceId 贯穿请求。
- **监控**：Spring Actuator 提供健康检查、指标、线程栈；Prometheus + Grafana；Sentry/Pinpoint 错误追踪。
- **部署**：Docker 化部署（Dockerfile + docker-compose）；CI/CD 使用 GitHub Actions → 构建镜像 → 推送 Registry → Kubernetes/服务器滚动更新。
- **测试策略**：
  - 单元测试：JUnit5 + Mockito
  - 集成测试：SpringBootTest + Testcontainers
  - 数据库迁移：Flyway 或 Liquibase

---

## 9. 项目结构建议

```
dn-admin-server/
├─ docs/                      # 设计、API、数据库文档
├─ src/
│  ├─ main/
│  │  ├─ java/com/example/dnadmin/
│  │  │  ├─ auth/
│  │  │  ├─ system/
│  │  │  ├─ content/
│  │  │  ├─ analytics/
│  │  │  ├─ file/
│  │  │  ├─ common/
│  │  │  └─ DnAdminServerApplication.java
│  │  └─ resources/
│  │     ├─ application.yml
│  │     └─ db/migration/
│  └─ test/
│     └─ java/com/example/dnadmin/
├─ build.gradle 或 pom.xml
└─ README.md （本文档）
```

---

## 10. 迭代计划

1. **迭代 1**：搭建项目骨架、完成 Auth 与 RBAC、连接数据库、完成登录流程。
2. **迭代 2**：实现用户/角色/菜单 CRUD、菜单树返回、权限点控制。
3. **迭代 3**：对接业务数据（产品/订单）、导入导出、文件上传。
4. **迭代 4**：仪表盘统计、消息中心、主题设置、缓存优化。
5. **迭代 5**：安全加固、日志监控、完善测试与 CI/CD。

---

## 11. 与前端的协作

- 所有 API 返回统一结构：`{ code, message, data }`。列表返回 `data = { list, page, size, total }`。
- 登录成功返回 `token`、`refreshToken`、`userInfo`、`menuList`、`perms`，前端替换当前 Pinia `permiss` 逻辑。
- 提供 Swagger UI 地址（例如 `/swagger-ui.html`），供前端联调。
- 保留 `public/mock/*.json` 中字段命名，确保平滑迁移。

---

## 12. 下一步

1. 在 `docs/` 内补充 ER 图、API 字段明细、数据字典。
2. 编写基础 Spring Boot 脚手架（模块、依赖、配置）。
3. 将前端 mock JSON 与模板同步到后端仓库，便于模拟数据对比（后续步骤执行）。

---

如需调整技术栈（MyBatis、微服务拆分、消息队列等），可在 `docs/` 下补充方案评估后实施。
