/**
 * 默认简历模板
 * 
 * 这个模板内嵌在前端代码中，不依赖后端接口
 * 用户数据保存在浏览器 localStorage 中
 * 
 * 使用 ResumeData 格式，包含 HTML 样式排版
 */
import type { ResumeData } from '../pages/Workspace/v2/types'

export const DEFAULT_RESUME_TEMPLATE: ResumeData = {
  id: `resume_${Date.now()}`,
  title: '我的简历',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  templateId: null,
  templateType: 'latex',  // 默认使用 LaTeX 模板
  basic: {
    name: "张三",
    title: "后端开发工程师",
    email: "zhangsan@example.com",
    phone: "13800138000",
    location: ""
  },
  education: [
    {
      id: `edu_${Date.now()}_0`,
      school: "北京大学",
      major: "计算机科学与技术专业",
      degree: "本科",
      startDate: "2022.09",
      endDate: "2026.06",
      description: "",
      visible: true
    }
  ],
  workExperience: [
    {
      id: `work_${Date.now()}_0`,
      company: "腾讯",
      position: "后端开发工程师",
      date: "2025.07 - 至今",
      details: "<ul class=\"custom-list\"><li><p>负责核心高并发微服务开发与维护，实现分布式缓存防护及 API 网关路由配置</p></li><li><p>主导缓存击穿与雪崩防护优化，提升系统在高并发场景下的服务稳定性</p></li></ul><p></p>",
      visible: true,
      companyLogo: "tencent"
    }
  ],
  experience: [
    {
      id: `exp_${Date.now()}_0`,
      company: "字节跳动",
      position: "后端开发实习生",
      date: "2025.06 - 2025.10",
      details: "<ul class=\"custom-list\"><li><p>参与核心业务模块的开发与维护，负责接口设计与实现</p></li><li><p>参与系统性能优化工作，通过代码重构和查询优化提升接口响应速度</p></li><li><p>参与技术方案讨论，协助解决开发过程中遇到的技术问题</p></li></ul><p></p>",
      visible: true,
      companyLogo: "bytedance"
    },
    {
      id: `exp_${Date.now()}_1`,
      company: "美团",
      position: "后端开发实习生",
      date: "2025.03 - 2025.06",
      details: "<ul class=\"custom-list\"><li><p>参与新功能模块的开发，负责需求分析、技术方案设计和代码实现</p></li><li><p>参与代码审查，学习并实践代码规范和最佳实践</p></li><li><p>协助团队完成项目交付，参与测试和问题修复工作</p></li></ul><p></p>",
      visible: true,
      companyLogo: "meituan"
    },
    {
      id: `exp_${Date.now()}_2`,
      company: "快手",
      position: "后端开发实习生",
      date: "2024.12 - 2025.03",
      details: "<ul class=\"custom-list\"><li><p>参与业务系统开发，熟悉企业级应用开发流程</p></li><li><p>学习并实践常用框架和中间件的使用，提升技术能力</p></li><li><p>参与团队技术分享，学习系统架构设计相关知识</p></li></ul><p></p>",
      visible: true,
      companyLogo: "kuaishou"
    }
  ],
  projects: [
    {
      id: `proj_${Date.now()}_0`,
      name: "项目经历一",
      role: "",
      date: "",
      description: "<ul class=\"custom-list\"><li><p><strong>专项一</strong></p><ul class=\"custom-list\"><li><p>面向高并发业务场景，主导系统性能与稳定性问题的分析与优化，提升整体服务响应能力</p></li><li><p>参与核心服务架构设计与拆分，推动系统模块解耦与资源隔离，增强系统可扩展性与可靠性</p></li><li><p>推动数据一致性与稳定性保障方案的设计与落地，降低异常情况下的数据风险</p></li><li><p>参与数据库访问性能优化，通过查询与结构调整显著提升关键接口响应效率</p></li></ul></li><li><p><strong>专项二</strong></p><ul class=\"custom-list\"><li><p>设计并落地多层次容错与降级方案，提升系统在异常场景下的稳定运行能力</p></li><li><p>针对数据访问瓶颈，参与缓存体系与数据访问策略优化，支撑高并发访问场景</p></li></ul></li><li><p><strong>专项三</strong></p><ul class=\"custom-list\"><li><p>推动数据一致性与稳定性保障方案的设计与落地，降低异常情况下的数据风险</p></li><li><p>参与数据库访问性能优化，通过查询与结构调整显著提升关键接口响应效率</p></li></ul></li></ul><p></p>",
      visible: true
    },
    {
      id: `proj_${Date.now()}_1`,
      name: "项目经历二",
      role: "",
      date: "",
      description: "<ul class=\"custom-list\"><li><p><strong>项目描述：</strong>基于大模型的智能简历系统</p></li><li><p><strong>核心职责与产出：</strong>参与智能信息检索系统的整体方案设计，提升系统对复杂查询和用户意图的理解能力</p><ul class=\"custom-list\"><li><p>设计并实现多策略检索与结果融合机制，提升系统信息召回质量与准确性</p></li><li><p><strong>模块一：生成内容 LLM</strong>：结合大模型能力，参与生成式内容模块设计，增强系统在复杂场景下的信息整合与表达能力</p></li><li><p><strong>模块二：检索</strong>：智能简历检索</p></li><li><p><strong>模块三：RAG</strong>：构建简历 RAG</p></li></ul></li></ul><p></p>",
      visible: true
    }
  ],
  openSource: [
    {
      id: `os_${Date.now()}_0`,
      name: "开源项目一（某分布式项目）",
      role: "",
      repo: "https://github.com/example/project",
      date: "",
      description: "<ul class=\"custom-list\"><li><p>仓库：<a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"https://github.com/example/project\">https://github.com/example/project</a></p></li><li><p>社区日常 Issue 维护与答疑、问题复现与定位</p></li><li><p>实现某功能 PR 记录：<a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"https://github.com/example/project/issues/xxx\">https://github.com/example/project/issues/xxx</a></p></li></ul><p></p>",
      visible: true
    },
    {
      id: `os_${Date.now()}_1`,
      name: "黑马点评",
      role: "个人项目",
      repo: "",
      date: "",
      description: "<ul class=\"custom-list\"><li><p><strong>项目描述：</strong>基于 Spring Boot + Redis + MySQL 开发的本地生活服务平台，提供商家信息展示、用户评价、优惠券等功能。</p></li><li><p><strong>核心功能：</strong></p><ul class=\"custom-list\"><li><p><strong>商家管理：</strong>实现商家信息录入、分类管理、位置搜索等功能</p></li><li><p><strong>用户评价：</strong>支持用户对商家进行评价、上传图片、点赞等操作</p></li><li><p><strong>优惠券系统：</strong>实现优惠券发放、秒杀抢购、库存管理等核心业务</p></li></ul></li></ul><p></p>",
      visible: true
    }
  ],
  awards: [],
  customData: {},
  selfEvaluation: "<p>具备扎实的计算机基础与后端开发能力，熟悉 Java/Golang、数据库、缓存与常见工程化实践，关注系统性能优化与稳定性建设。</p>",
  skillContent: "<p></p><ul class=\"custom-list\"><li><p><strong>后端</strong>：熟悉 Java 编程语言、Golang 编程语言等原理</p></li><li><p><strong>数据库</strong>：熟悉 MySQL、MongoDB、ES 等主流数据库原理。有优秀的 SQL 调优经验</p></li><li><p><strong>缓存</strong>：熟悉 Redis 底层数据结构、分布式锁等机制。熟悉缓存击穿、穿透、雪崩概念</p></li><li><p><strong>计算机网络</strong>：熟悉 TCP、UDP、HTTP、HTTPS 等网络协议。掌握 TCP 三次握手、四次挥手等机制</p></li><li><p><strong>操作系统</strong>：熟悉进程、线程、虚拟内存、I/O 多路复用等。掌握进程间通信和多线程同步技术</p></li><li><p><strong>AI</strong>：了解 RAG、FunctionCall、LLM Prompt 提示词工程</p></li></ul><p></p>",
  activeSection: "basic",
  draggingProjectId: null,
  menuSections: [
    { id: 'basic', title: '基本信息', icon: '👤', enabled: true, order: 0 },
    { id: 'education', title: '教育经历', icon: '🎓', enabled: true, order: 1 },
    { id: 'workExperience', title: '工作经历', icon: '🏢', enabled: true, order: 2 },
    { id: 'experience', title: '实习经历', icon: '💼', enabled: true, order: 3 },
    { id: 'projects', title: '项目经历', icon: '🚀', enabled: true, order: 4 },
    { id: 'openSource', title: '开源经历', icon: '🔗', enabled: true, order: 5 },
    { id: 'skills', title: '专业技能', icon: '⚡', enabled: true, order: 6 },
    { id: 'awards', title: '荣誉奖项', icon: '🏆', enabled: true, order: 7 },
    { id: 'selfEvaluation', title: '自我评价', icon: '📝', enabled: true, order: 8 },
    { id: 'custom_research', title: '竞赛科研', icon: '🔬', enabled: true, order: 9 }
  ],
  globalSettings: {
    lineHeight: 1.5,
    baseFontSize: 16,
    headerSize: 18,
    pagePadding: 40,
    sectionSpacing: 20,
    paragraphSpacing: 10,
    experienceListType: "none",
    experienceGap: 1,
    projectExperienceGap: 1,
    latexHeaderTopGapPx: -4,
    latexHeaderNameContactGapPx: 0,
    latexHeaderBottomGapPx: -1,
    openSourceRepoDisplay: "icon"
  }
}
