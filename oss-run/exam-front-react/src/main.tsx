import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import App from './App';
import { SessionProvider } from './contexts/session';
import { theme } from './constants/theme';
import './styles.css';

dayjs.locale('zh-cn');

/* §5.1 统一主题：令牌集中在 constants/theme.ts，平台特色仅通过业务组件表达 */
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
