/**
 * 环境配置统一入口（约束规范 §4.3、§14）
 *
 * 四套环境：development / test / staging / production，分别对应
 * `.env.development` / `.env.test` / `.env.staging` / `.env.production`。
 * 业务代码只从这里读配置，不得直接访问 import.meta.env，更不得写死服务地址。
 */
export type AppEnv = 'development' | 'test' | 'staging' | 'production';

interface EnvConfig {
  /** 平台标识 */
  appCode: string;
  /** 当前环境 */
  env: AppEnv;
  /** 是否生产形态（生产不输出调试信息，§14） */
  isProd: boolean;
  /** 接口基地址 */
  apiBaseUrl: string;
  /** 统一认证中心地址 */
  ssoBaseUrl: string;
  /** 统一文件服务地址（预留，§13） */
  fileBaseUrl: string;
  /** 事件总线地址（预留，§11） */
  eventBaseUrl: string;
}

const rawEnv = (import.meta.env.VITE_ENV || 'development') as AppEnv;

export const config: EnvConfig = {
  appCode: import.meta.env.VITE_APP_CODE || 'exam',
  env: rawEnv,
  isProd: rawEnv === 'production',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  ssoBaseUrl: import.meta.env.VITE_SSO_BASE_URL || '',
  fileBaseUrl: import.meta.env.VITE_FILE_BASE_URL || '',
  eventBaseUrl: import.meta.env.VITE_EVENT_BASE_URL || ''
};

/** 开发期自检：必需变量缺失时明确报错，避免带病上线（§14 禁止写死地址） */
if (!config.apiBaseUrl) {
  // eslint-disable-next-line no-console
  console.error('[env] 缺少 VITE_API_BASE_URL，请检查对应 .env.' + rawEnv + ' 配置');
}
