import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "Collei",
  tagline: "一个多功能的自托管服务器监控工具",
  favicon: "img/favicon.ico",

  future: {
    v4: true,
  },

  url: "https://collei-monitor.github.io",
  baseUrl: "/",

  organizationName: "collei-monitor",
  projectName: "collei",

  onBrokenLinks: "throw",

  i18n: {
    defaultLocale: "zh-Hans",
    locales: ["zh-Hans"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          routeBasePath: "docs",
          editUrl: "https://github.com/collei-monitor/collei/tree/master/docs/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/collei-social-card.jpg",
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Collei",
      logo: {
        alt: "Collei Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "文档",
        },
        {
          href: "https://github.com/collei-monitor/collei",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "文档",
          items: [
            {
              label: "快速安装",
              to: "/docs",
            },
            {
              label: "Docker 部署",
              to: "/docs/deploy/docker",
            },
            {
              label: "裸机安装",
              to: "/docs/deploy/bare-metal",
            },
          ],
        },
        {
          title: "更多",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/collei-monitor/collei",
            },
            {
              label: "Agent",
              href: "https://github.com/collei-monitor/collei-agent",
            },
            {
              label: "前端",
              href: "https://github.com/collei-monitor/collei-web",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Collei. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "nginx", "ini", "yaml", "docker"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
