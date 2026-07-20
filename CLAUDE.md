@AGENTS.md

# MamaVege HR 系统

这是 **Mama Global International Sdn Bhd** 的内部 HR 管理系统。

## 技术栈

- **前端框架**：Next.js 16（App Router）
- **数据库 + 认证**：Supabase（PostgreSQL + Auth）
- **部署**：Vercel（推送到 GitHub 后自动部署）
- **样式**：Inline styles，设计系统在 `src/lib/design.ts`

## 项目结构

```
src/
  app/
    (dashboard)/
      employee/    # 员工页面（打卡、假期、报销、薪资单等）
      hr/          # HR 管理页面（员工管理、考勤、薪资、设置等）
      director/    # 董事页面（报表、建议箱）
      supervisor/  # 主管页面（审批加班）
    api/           # 服务器 API（需要 service role 的操作）
  components/      # 共用组件（侧边栏等）
  lib/
    design.ts      # 设计系统（颜色、字体、样式）
    supabase/      # Supabase 客户端
```

## 角色权限

| 角色 | 说明 |
|------|------|
| `employee` | 普通员工 |
| `supervisor` | 主管（可审批加班） |
| `hr` | HR Manager（可管理所有员工） |
| `director` | 董事（只读报表） |

## 数据库重要说明

- 数据库托管在 **Supabase**，连接信息在 `.env.local`
- **DDL 操作**（建表、加字段、改约束、RLS 政策）**不能**通过代码直接执行，需要提供 SQL 给用户，让他在 Supabase SQL Editor 手动运行
- 普通数据读写（SELECT/INSERT/UPDATE/DELETE）可以直接用 Supabase client 操作
- 有 Row Level Security (RLS)，员工只能看到自己的数据，HR 可以看到所有人的

## 修改代码的流程

1. 用中文告诉 Claude 你要改什么
2. Claude 会帮你修改代码
3. 修改完后告诉 Claude **"帮我推送"**
4. Vercel 会自动部署，约 1-2 分钟后生效

## 每次开工前

告诉 Claude：**"帮我拉取最新代码"**，确保拿到最新版本。

## 推送前检查

Claude 会自动运行以下命令确认没有错误才推送：
```
npx tsc --noEmit
npm run build
```

## 常用 Supabase 数据库表

| 表名 | 用途 |
|------|------|
| `profiles` | 员工资料（姓名、工号、部门、薪资等） |
| `attendance` | 打卡记录 |
| `leave_requests` | 假期申请 |
| `leave_entitlements` | 假期额度 |
| `ot_requests` | 加班申请 |
| `claims` | 报销申请 |
| `claim_limits` | 报销额度限制 |
| `public_holidays` | 公共假期 |
| `employee_holidays` | 员工特别假期（州假期） |
| `departments` | 部门列表 |
| `payslips` | 薪资单 |
| `company_settings` | 公司设置 |

## 注意事项

- 沟通语言：中文或英文都可以
- 修改 UI 时请参考 `src/lib/design.ts` 里的颜色和样式，保持风格一致
- 如果需要新增数据库字段，Claude 会提供 SQL，你需要去 [supabase.com](https://supabase.com) 的 SQL Editor 运行
- Supabase 免费方案如果 7 天没有使用会自动暂停，需要去 supabase.com 手动恢复
