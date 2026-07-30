import type { ResumeData } from '@/pages/Workspace/v2/types'

export const initialResumeData: ResumeData = {
  templateType: 'html',
  basic: {
    name: '你的名字',
    title: '前端开发实习生',
    phone: '13800138000',
    email: 'email@example.com',
    location: '北京',
  },
  education: [
    {
      id: '1',
      school: '清华大学',
      major: '计算机科学与技术',
      degree: '本科',
      startDate: '2022年05月',
      endDate: '2026年07月',
      description: '核心课程：数据结构与算法(95)、操作系统(92)、计算机网络(94)、Web开发基础(96)、软件工程(90)\\n获得学业优秀奖学金(前5%)、校级三好学生、优秀学生干部'
    }
  ],
  experience: [
    {
      id: '1',
      company: 'XX科技公司',
      position: '前端开发实习生',
      date: '2025.06 - 2025.12',
      details: '<ul><li>负责数据看板页面的开发与优化，通过仿滑动和数据缓存存储，使页面加载时间降低60%，熟悉Vue开发状态。</li><li>参与组件库建设，独立开发3个通用业务组件，被团队内其他项目复用15+次，显著提升开发效率。</li></ul>'
    },
    {
      id: '2',
      company: 'YY互联网公司',
      position: '前端开发实习生',
      date: '2024.12 - 2025.05',
      details: '<ul><li>参与核心应用系统的前端研发，负责常用 UI 组件与交互逻辑的实现。</li><li>配合后端团队完成 API 接口联调，修复性能瓶颈与线上问题。</li></ul>'
    }
  ],
  projects: [
    {
      id: '1',
      name: 'XX项目名称',
      role: '前端负责人',
      date: '2024.09 - 2025.01',
      description: '<ul><li>作为前端负责人，使用Taro + React开发跨平台小程序，实现功能1、功能2等10+功能模块。</li><li>设计并实现组件化开发方案，抽象出15+个通用组件，代码复用率达70%，显著提升开发效率。</li><li>通过性能优化和代码分割分析，使小程序首屏加载时间从3.5s内，用户体验评分达4.8/5.0。</li><li>项目上线后，2个月内累计用户5000+，日活用户800+，获得学校创新创业大赛一等奖。</li></ul>',
      link: ''
    }
  ],
  skills: '<ul><li><strong>前端技术：</strong> React、TypeScript、HTML/CSS</li><li><strong>工程工具：</strong> Webpack、Git、npm</li><li><strong>计算机基础：</strong> 数据结构、算法、计算机网络</li><li><strong>其他能力：</strong> 英语CET-6、快速学习、团队协作</li></ul>',
  openSource: [],
  awards: [
    {
      id: '1',
      title: '大学英语六级',
      issuer: '全国大学英语四六级考试委员会',
      date: '2024',
      description: '成绩：580分'
    }
  ],
  customData: {},
  selfEvaluation: '<p>具备扎实的前端开发基础，熟悉 React、TypeScript 与工程化实践，关注用户体验、性能优化和组件复用。</p>',
  menuSections: [
    { id: 'education', title: '教育经历', icon: '🎓', enabled: true, order: 0 },
    { id: 'experience', title: '工作经历', icon: '💼', enabled: true, order: 1 },
    { id: 'projects', title: '项目经历', icon: '🚀', enabled: true, order: 2 },
    { id: 'skills', title: '专业技能', icon: '⚡', enabled: true, order: 3 },
    { id: 'awards', title: '证书荣誉', icon: '🏆', enabled: true, order: 4 },
    { id: 'selfEvaluation', title: '自我评价', icon: '📝', enabled: true, order: 5 },
  ]
}
