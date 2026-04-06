import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: '部署',
      collapsed: false,
      items: [
        'deploy/quickstart',
        'deploy/docker',
        'deploy/bare-metal',
        'deploy/build',
        'deploy/upgrade',
      ],
    },
    {
      type: 'category',
      label: 'Agent',
      collapsed: false,
      items: [
        'agent/install',
        'agent/docker',
        'agent/configuration',
        'agent/script-reference',
      ],
    },
    'faq',
    {
      type: 'category',
      label: '开发',
      collapsed: false,
      items: [
        'development/frontend',
        // 'development/agent',
      ],
    },
  ],
  deploySidebar: [
    {
      type: 'category',
      label: '部署',
      collapsed: false,
      items: [
        'deploy/quickstart',
        'deploy/docker',
        'deploy/bare-metal',
        'deploy/build',
        'deploy/upgrade',
      ],
    },
  ],
  agentSidebar: [
    {
      type: 'category',
      label: 'Agent',
      collapsed: false,
      items: [
        'agent/install',
        'agent/docker',
        'agent/configuration',
        'agent/script-reference',
      ],
    },
  ],
};

export default sidebars;
