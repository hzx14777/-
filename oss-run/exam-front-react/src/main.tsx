import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import App from './App';
import { SessionProvider } from './session';
import './styles.css';

dayjs.locale('zh-cn');

/* §5.1 统一主题：字体、主色、圆角、阴影在此集中配置，平台特色仅通过业务组件表达 */
const theme = {
  token: {
    colorPrimary: '#1e5eff',
    colorInfo: '#1e5eff',
    colorSuccess: '#0f9d76',
    colorWarning: '#c2761b',
    colorError: '#d4380d',
    borderRadius: 8,
    fontFamily:
      "-apple-system, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif",
    fontSize: 14
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={theme}>
      <AntApp>
        <SessionProvider>
          <BrowserRouter basename="/yj">
            <App />
          </BrowserRouter>
        </SessionProvider>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
);
