/**
 * 登录页（§2.2 / §7.1：不自建账号密码体系，跳转论坛统一认证中心）
 * 页面只负责发起授权码跳转，凭据交换全部由服务端完成（§7.2）。
 *
 * 版式：左侧品牌与能力说明（深色），右侧单一登录动作，避免多入口造成「到底点哪个」。
 */
import { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import {
  ApartmentOutlined,
  CloudServerOutlined,
  SafetyCertificateFilled,
  SafetyCertificateOutlined,
  ScanOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { endpoints } from '../api';
import { pageIn } from '../utils/motion';
import { config } from '../env';

const FEATURES = [
  {
    icon: <SafetyCertificateOutlined />,
    title: '双达标判定',
    desc: '总分过线且每个知识点组达标，才发放项目准入资格'
  },
  {
    icon: <ScanOutlined />,
    title: '人机共判',
    desc: 'AI 初评 + 教师确认，低置信度答卷自动排在阅卷队首'
  },
  {
    icon: <ThunderboltOutlined />,
    title: '跨平台联动',
    desc: '通过状态以 exam.passed / exam.failed 事件提供给实训工坊'
  }
];

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/hall';
  const ref = useRef<HTMLDivElement>(null);
  const [meta, setMeta] = useState<any>(null);

  useEffect(() => {
    pageIn(ref.current);
    endpoints.meta().then(setMeta).catch(() => {});
  }, []);

  const goSso = async () => {
    setLoading(true);
    try {
      const r = await endpoints.ssoUrl(redirect);
      window.location.href = r.authorizeUrl;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="yj-login" ref={ref}>
      <section className="yj-login-l">
        <div className="yj-login-grid" />
        <div className="yj-login-halo" />
        <div className="yj-login-goldline" />

        <div className="yj-login-top">
          <div className="yj-login-mark">
            <SafetyCertificateFilled />
          </div>
          <div>
            <div className="t">警院智慧考试平台</div>
            <div className="s">EXAM PLATFORM</div>
          </div>
          <div className="sys">
            <CloudServerOutlined /> 智慧警务 · 五平台体系
          </div>
        </div>

        <div className="yj-login-mid">
          <div className="yj-login-badge">
            <SafetyCertificateOutlined /> 统一身份 · 项目准入
          </div>
          <h1>
            考试、阅卷与准入
            <br />
            <span>在同一条链路上。</span>
          </h1>
          <p>
            随堂测试、专项考试与项目准入统一入口。成绩经 AI 初评与教师确认后生效，
            双达标结果自动同步给实训工坊，作为进入真实项目的依据。
          </p>

          <div className="yj-login-feats">
            {FEATURES.map((f) => (
              <div className="feat" key={f.title}>
                <div className="fi">{f.icon}</div>
                <div>
                  <b>{f.title}</b>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="yj-login-bot">
          <div className="yj-plat">
            <span className="pl">自学平台</span>
            <span className="pl">实训工坊</span>
            <span className="pl cur">考试平台</span>
            <span className="pl">论坛社区</span>
            <span className="pl">资源中心</span>
          </div>
          <div className="yj-copy">© 警院智慧警务教学体系 · 本平台不自建账号密码</div>
        </div>
      </section>

      <section className="yj-login-r">
        <div className="yj-login-r-top">
          <ApartmentOutlined />
          <span>统一身份认证中心</span>
        </div>

        <div className="yj-login-r-body">
          <div className="yj-login-card">
            <div className="eyebrow">SIGN IN</div>
            <h2>登录考试平台</h2>
            <p className="desc">
              将跳转至「警院统一认证中心」完成身份校验，认证完成后自动返回
              {redirect !== '/hall' ? '原页面' : '考试大厅'}。账号、密码与角色权限均由认证中心维护。
            </p>

            <Button type="primary" size="large" block loading={loading} onClick={goSso} style={{ marginTop: 24, height: 42, fontSize: 14 }}>
              前往统一认证中心登录
            </Button>

            {meta?.ssoMode === 'mock' && (
              <div className="yj-login-warn">
                当前为联调模式（Mock 认证中心），生产环境由论坛平台提供认证服务。
              </div>
            )}

            <div className="yj-login-or">
              <span>接入信息</span>
            </div>

            <div className="yj-login-box">
              <div className="bt">
                <CloudServerOutlined /> 本环境配置
              </div>
              <div className="bp">以下信息由服务端下发，用于联调排查，无需在此填写任何凭据。</div>
              <div className="code">
                <span>
                  appCode <b>{config.appCode}</b>
                </span>
                <span>
                  环境 <b>{config.env}</b>
                </span>
                <span>
                  认证 <b>{meta?.ssoMode === 'mock' ? 'Mock' : '统一认证'}</b>
                </span>
              </div>
            </div>

            <div className="yj-login-foot">
              <span>遇到登录问题？请联系教务管理员</span>
              <span>{meta ? meta.sourcePlatform : '论坛认证中心'}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
