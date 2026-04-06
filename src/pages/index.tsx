import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

const features = [
  {
    title: '实时监控',
    icon: '📊',
    description: 'CPU、内存、磁盘、网络 I/O，通过 WebSocket 实时推送，一目了然。',
  },
  {
    title: '多节点管理',
    icon: '🖥️',
    description: '集中管理所有服务器，支持分组、排序、标签，轻松掌控全局。',
  },
  {
    title: '告警通知',
    icon: '🔔',
    description: '灵活的告警规则，支持 Telegram、Email、Webhook 等多通道通知。',
  },
  {
    title: 'Web SSH',
    icon: '💻',
    description: '浏览器内 SSH 终端 + SFTP 文件管理器，随时随地远程管理。',
  },
  {
    title: 'DNS 管理',
    icon: '🌐',
    description: '域名 DNS 记录管理 + DDNS 动态更新，一站式网络配置。',
  },
  {
    title: '安全优先',
    icon: '🔒',
    description: 'SSO 登录、双因素认证、SSH CA 证书颁发，全方位安全保障。',
  },
];

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs">
            快速开始
          </Link>
          <Link
            className="button button--outline button--lg"
            style={{marginLeft: '1rem', color: 'white', borderColor: 'white'}}
            href="https://github.com/collei-monitor/collei">
            GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

function Feature({title, icon, description}: {title: string; icon: string; description: string}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center" style={{fontSize: '2.5rem'}}>
        {icon}
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {features.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
