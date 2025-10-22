# dn-admin-server 数据库设计（PostgreSQL 16.10）

本文结合前端功能与接口文档，对后端数据库结构进行详细设计。数据库选型为 **PostgreSQL 16.10**，所有示例 DDL、字段类型、约束均基于 PG 16 语法。默认使用 **驼峰转下划线的小写表名**（如 `sys_user`），主键类型统一为 `bigserial` 或使用雪花/ULID 可选。

---

## 1. 命名与通用约定

- 字段命名：使用 `snake_case`，布尔字段使用 `is_xxx`。
- 主键：`id BIGSERIAL PRIMARY KEY`。如需分布式，可改为 `BIGINT` + 自定义生成策略。
- 时间：统一使用 `TIMESTAMPTZ`（UTC），字段包括 `created_at`, `updated_at`, 可选 `deleted_at`（软删除）。
- 版本号：如需乐观锁，使用 `version BIGINT DEFAULT 0`.
- 枚举：业务枚举使用 `VARCHAR` + CHECK 约束，或 PostgreSQL 自定义 `ENUM`。
- 索引：常用查询条件建 BTree 索引；jsonb 字段可使用 GIN 索引。
- Schema：默认 `public`，可根据环境拆分。

---

## 2. ER 关系概览

```
┌────────────┐        ┌────────────┐        ┌────────────────┐
│  sys_user  │        │  sys_role  │        │ sys_permission │
└──────┬─────┘        └──────┬─────┘        └──────┬─────────┘
       │                      │                     │
       │                      │                     │
┌──────▼─────┐        ┌──────▼─────┐        ┌──────▼─────────┐
│sys_user_role│      │sys_role_perm│        │ sys_menu_perm   │
└─────────────┘      └─────────────┘        └────────────────┘
       │                                           ▲
       │                                           │
       │                              ┌────────────┴────────────┐
       │                              │        sys_menu         │
       │                              └─────────────────────────┘

内容数据：

prod_category ──┐
                ├── prod_product ── ord_order_item ── ord_order ── customers
```

---

## 3. 系统模块表结构

### 3.1 `sys_user` 用户表

| 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- |
| `id` | `BIGSERIAL` | PK | 用户 ID |
| `username` | `VARCHAR(64)` | UNIQUE NOT NULL | 登录账号 |
| `password_hash` | `VARCHAR(128)` | NOT NULL | Bcrypt 哈希 |
| `nickname` | `VARCHAR(64)` | | 显示名称 |
| `email` | `VARCHAR(128)` | UNIQUE | 邮箱 |
| `phone` | `VARCHAR(32)` | UNIQUE | 手机号 |
| `avatar_url` | `VARCHAR(512)` | | 头像地址 |
| `status` | `VARCHAR(16)` | DEFAULT `'enabled'` CHECK (`status` IN ('enabled','disabled','locked')) | 状态 |
| `last_login_at` | `TIMESTAMPTZ` | | 最近登录时间 |
| `last_login_ip` | `INET` | | 最近登录 IP |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() NOT NULL | 创建时间 |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT now() NOT NULL | 更新时间 |
| `deleted_at` | `TIMESTAMPTZ` | | 软删除时间 |

索引：`idx_sys_user_email`, `idx_sys_user_phone`, `idx_sys_user_status`.

### 3.2 `sys_role` 角色表

| 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- |
| `id` | `BIGSERIAL` | PK |
| `code` | `VARCHAR(64)` | UNIQUE NOT NULL | 角色编码（如 `admin`） |
| `name` | `VARCHAR(64)` | NOT NULL | 角色名称 |
| `description` | `VARCHAR(256)` | | 角色描述 |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT now() |

### 3.3 `sys_permission` 权限表

| 字段 | 类型 | 描述 |
| ---- | ---- | ---- |
| `id` | `BIGSERIAL` | PK |
| `code` | `VARCHAR(64)` UNIQUE NOT NULL | 权限码，需与前端 `permiss` 对应 |
| `name` | `VARCHAR(64)` NOT NULL | 权限名称 |
| `type` | `VARCHAR(16)` | `('menu','button','api')` |
| `description` | `VARCHAR(256)` | |
| `created_at` | `TIMESTAMPTZ` | |
| `updated_at` | `TIMESTAMPTZ` | |

### 3.4 关联表

- `sys_user_role`
  - `user_id BIGINT NOT NULL REFERENCES sys_user(id) ON DELETE CASCADE`
  - `role_id BIGINT NOT NULL REFERENCES sys_role(id) ON DELETE CASCADE`
  - PK(`user_id`,`role_id`)

- `sys_role_permission`
  - `role_id BIGINT NOT NULL REFERENCES sys_role(id) ON DELETE CASCADE`
  - `permission_id BIGINT NOT NULL REFERENCES sys_permission(id) ON DELETE CASCADE`
  - PK(`role_id`,`permission_id`)

### 3.5 `sys_menu` 菜单表

| 字段 | 类型 | 描述 |
| ---- | ---- | ---- |
| `id` | `BIGSERIAL` | PK |
| `parent_id` | `BIGINT` REFERENCES `sys_menu(id)` | 父节点，顶级为 NULL |
| `title` | `VARCHAR(64)` | 菜单名称 |
| `path` | `VARCHAR(128)` | 路由路径，如 `/dashboard` |
| `component` | `VARCHAR(128)` | 前端组件标识 |
| `icon` | `VARCHAR(64)` | 图标 |
| `order_num` | `INT` | 排序 |
| `keep_alive` | `BOOLEAN` DEFAULT TRUE | 是否缓存 |
| `visible` | `BOOLEAN` DEFAULT TRUE | 是否显示 |
| `permission_code` | `VARCHAR(64)` | 对应 `sys_permission.code`，可为空 |
| `meta` | `JSONB` | 其他扩展 |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | |

索引：`idx_sys_menu_parent_id`, `idx_sys_menu_permission_code`.

### 3.6 菜单-权限关联（可选）

如需一菜单多权限，可建立 `sys_menu_permission(menu_id, permission_id)`。

### 3.7 `sys_login_log` 登录日志

| 字段 | 类型 | 描述 |
| ---- | ---- | ---- |
| `id` | `BIGSERIAL` | PK |
| `user_id` | `BIGINT REFERENCES sys_user(id)` | 可为空（未知用户） |
| `username` | `VARCHAR(64)` | 登录账号 |
| `status` | `VARCHAR(16)` | `('success','failed','locked')` |
| `ip` | `INET` | 登录 IP |
| `user_agent` | `VARCHAR(256)` | 客户端信息 |
| `message` | `VARCHAR(256)` | 失败描述 |
| `logged_at` | `TIMESTAMPTZ` | 登录时间 |

### 3.8 `sys_operation_log` 操作日志（可选）

记录关键操作，如导出、权限调整。

---

## 4. 业务示例表结构

### 4.1 `prod_category` 商品分类

| 字段 | 类型 | 描述 |
| ---- | ---- | ---- |
| `id` | `BIGSERIAL` | PK |
| `parent_id` | `BIGINT REFERENCES prod_category(id)` | 父级 |
| `name` | `VARCHAR(64)` NOT NULL |
| `code` | `VARCHAR(64)` | |
| `order_num` | `INT` | |
| `status` | `VARCHAR(16)` | `('enabled','disabled')` |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | |

### 4.2 `prod_product` 商品

| 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- |
| `id` | `BIGSERIAL` | PK |
| `category_id` | `BIGINT REFERENCES prod_category(id)` | NOT NULL |
| `name` | `VARCHAR(128)` | NOT NULL |
| `sku` | `VARCHAR(64)` | UNIQUE |
| `price` | `NUMERIC(12,2)` | NOT NULL |
| `stock` | `INTEGER` | DEFAULT 0 |
| `status` | `VARCHAR(16)` | `('on','off','draft')` |
| `thumbnail` | `VARCHAR(512)` | |
| `tags` | `VARCHAR[]` | | 标签数组 |
| `description` | `TEXT` | 详情 |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | |

索引：`idx_prod_product_category_id`, `idx_prod_product_status`.

### 4.3 `customer` 客户

| 字段 | 类型 | 描述 |
| ---- | ---- | ---- |
| `id` | `BIGSERIAL` |
| `name` | `VARCHAR(128)` |
| `phone` | `VARCHAR(32)` |
| `email` | `VARCHAR(128)` |
| `level` | `VARCHAR(16)` | 枚举：`vip`, `normal` |
| `created_at` / `updated_at` | `TIMESTAMPTZ` |

### 4.4 `ord_order` 订单

| 字段 | 类型 | 描述 |
| ---- | ---- | ---- |
| `id` | `BIGSERIAL` | PK |
| `order_no` | `VARCHAR(64)` UNIQUE NOT NULL | 订单号 |
| `customer_id` | `BIGINT REFERENCES customer(id)` | |
| `status` | `VARCHAR(16)` | `('pending','paid','shipped','completed','cancelled','refunded')` |
| `channel` | `VARCHAR(32)` | 渠道（线上、线下、App 等） |
| `total_amount` | `NUMERIC(12,2)` |
| `discount_amount` | `NUMERIC(12,2)` |
| `pay_amount` | `NUMERIC(12,2)` |
| `pay_time` | `TIMESTAMPTZ` |
| `remark` | `VARCHAR(256)` |
| `created_at` / `updated_at` | `TIMESTAMPTZ` |

索引：`idx_ord_order_status`, `idx_ord_order_channel`, `idx_ord_order_created_at`.

### 4.5 `ord_order_item` 订单明细

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | `BIGSERIAL` | PK |
| `order_id` | `BIGINT REFERENCES ord_order(id) ON DELETE CASCADE` | NOT NULL |
| `product_id` | `BIGINT REFERENCES prod_product(id)` | NOT NULL |
| `product_name` | `VARCHAR(128)` | 冗余 |
| `price` | `NUMERIC(12,2)` |
| `quantity` | `INTEGER` |
| `subtotal` | `NUMERIC(12,2)` |

### 4.6 `anl_dashboard_snapshot` 仪表盘快照

| 字段 | 类型 | 描述 |
| ---- | ---- | ---- |
| `id` | `BIGSERIAL` |
| `stat_date` | `DATE` | 统计日期 |
| `metrics` | `JSONB` | 指标集合（用户访问量、订单数等） |
| `orders_trend` | `JSONB` | 折线图数据 |
| `category_distribution` | `JSONB` |
| `channel_map` | `JSONB` |
| `rankings` | `JSONB` |
| `created_at` | `TIMESTAMPTZ` |

在定时任务中写入，接口直接读取。

---

## 5. 支撑与配置表

### 5.1 `sys_file` 文件记录

| 字段 | 类型 | 描述 |
| ---- | ---- | ---- |
| `id` | `BIGSERIAL` |
| `biz_type` | `VARCHAR(32)` | 业务类型（avatar、excel、rich_text） |
| `url` | `VARCHAR(512)` | 访问地址 |
| `path` | `VARCHAR(512)` | 存储路径 |
| `file_name` | `VARCHAR(256)` | 原文件名 |
| `content_type` | `VARCHAR(128)` | MIME |
| `size` | `BIGINT` | 字节大小 |
| `uploader_id` | `BIGINT REFERENCES sys_user(id)` | |
| `created_at` | `TIMESTAMPTZ` |

### 5.2 `sys_notification` 消息中心

| 字段 | 类型 | 描述 |
| ---- | ---- | ---- |
| `id` | `BIGSERIAL` |
| `title` | `VARCHAR(128)` |
| `content` | `TEXT` |
| `type` | `VARCHAR(32)` | `('system','order','warning')` |
| `status` | `VARCHAR(16)` | `('unread','read')` |
| `receiver_id` | `BIGINT REFERENCES sys_user(id)` |
| `created_at` | `TIMESTAMPTZ` |
| `read_at` | `TIMESTAMPTZ` |

### 5.3 `sys_theme` 主题设置

| 字段 | 类型 | 描述 |
| ---- | ---- | ---- |
| `id` | `BIGSERIAL` |
| `user_id` | `BIGINT REFERENCES sys_user(id)` UNIQUE | 每个用户一条 |
| `primary_color` | `VARCHAR(16)` |
| `success_color` | `VARCHAR(16)` |
| `warning_color` | `VARCHAR(16)` |
| `danger_color` | `VARCHAR(16)` |
| `info_color` | `VARCHAR(16)` |
| `header_bg_color` | `VARCHAR(16)` |
| `header_text_color` | `VARCHAR(16)` |
| `sidebar_bg_color` | `VARCHAR(16)` |
| `sidebar_text_color` | `VARCHAR(16)` |
| `updated_at` | `TIMESTAMPTZ` |

### 5.4 `sys_setting` 全局设置

| 字段 | 类型 | 描述 |
| ---- | ---- | ---- |
| `id` | `BIGSERIAL` |
| `key` | `VARCHAR(64)` UNIQUE |
| `value` | `JSONB` |
| `description` | `VARCHAR(256)` |
| `updated_at` | `TIMESTAMPTZ` |

---

## 6. 数据字典（字段映射）

以下为前端常用字段与数据库列的对照：

| 前端字段 | 接口 | 数据库列 | 说明 |
| -------- | ---- | -------- | ---- |
| `id` | 用户列表 | `sys_user.id` | |
| `name` | 用户列表 | `sys_user.nickname` / `sys_user.username` | 可在接口组装 |
| `role` | 用户列表 | `sys_role.name` | 通过关联查询 |
| `permiss` | 菜单/按钮权限 | `sys_permission.code` | 登录时返回 `perms` 数组 |
| `menus` | 菜单树 | `sys_menu` | 通过 `parent_id` 构建树形 |
| `tableData` | 表格 | `prod_product` | |
| `order trend` | 仪表盘 | `anl_dashboard_snapshot.orders_trend` | |
| `messages` | 消息中心 | `sys_notification` | |

---

## 7. DDL 示例

以下为关键表 DDL 示例（可依据 `Flyway`/`Liquibase` 迁移文件拆分）。

```sql
CREATE TABLE sys_user (
  id            BIGSERIAL PRIMARY KEY,
  username      VARCHAR(64)  NOT NULL UNIQUE,
  password_hash VARCHAR(128) NOT NULL,
  nickname      VARCHAR(64),
  email         VARCHAR(128) UNIQUE,
  phone         VARCHAR(32)  UNIQUE,
  avatar_url    VARCHAR(512),
  status        VARCHAR(16)  NOT NULL DEFAULT 'enabled'
                 CHECK (status IN ('enabled','disabled','locked')),
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE sys_role (
  id          BIGSERIAL PRIMARY KEY,
  code        VARCHAR(64) NOT NULL UNIQUE,
  name        VARCHAR(64) NOT NULL,
  description VARCHAR(256),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sys_user_role (
  user_id BIGINT NOT NULL REFERENCES sys_user(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES sys_role(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE prod_product (
  id          BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES prod_category(id),
  name        VARCHAR(128) NOT NULL,
  sku         VARCHAR(64) UNIQUE,
  price       NUMERIC(12,2) NOT NULL,
  stock       INTEGER DEFAULT 0,
  status      VARCHAR(16) DEFAULT 'on',
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
```

其余表结构可依照上文字段表定义编写。

---

## 8. 后续扩展建议

1. **多租户**：在所有业务表增加 `tenant_id`，索引 + 数据权限控制。
2. **数据归档**：`ord_order` 等大表可按月份分区（PostgreSQL 分区表）。
3. **全文搜索**：如需要，可在 `prod_product` 增加 `tsvector` 字段 + GIN 索引。
4. **审计审查**：对关键表启用逻辑删除和操作日志。
5. **数据迁移**：使用 Flyway/Liquibase 管理版本，保持与文档同步。

---

本设计文档将与 `api-spec.md`、前端字段保持一致，后续如果接口或前端字段调整，应同步更新此文档与数据迁移脚本。 
