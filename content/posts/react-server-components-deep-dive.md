---
title: "深入解析 React Server Components (RSC) 的心智模型"
slug: "react-server-components-deep-dive"
date: "2026-05-15T09:15:00.000Z"
tags: "科技"
status: "PUBLISHED"
summary: "抛开繁琐的 API，从根本上理解为什么 RSC 是 Next.js 乃至未来 Web 应用渲染机制的分水岭。"
---

## 🚀 重新划定客户端与服务端的边界

过去的十年里，Web 经历了从传统的服务器端模板渲染（JSP/PHP）到完全客户端渲染（SPA）的剧烈摇摆。

React Server Components (RSC) 的诞生，标志着这种摇摆的终结。它不仅仅是性能优化的雕虫小技，而是在组件层面将“服务器的绝对安全和计算资源”与“客户端的动态交互和即时反馈”无缝焊接在了一起。

### 🧠 心智模型差异
* **传统服务端渲染 (SSR)**：在服务器端一次性将组件树拍扁成 HTML 送给客户端，客户端必须整体“脱水”和“注水”。
* **服务端组件 (RSC)**：组件只在服务端运行，直接读取数据库，最后生成描述虚拟 DOM 的轻量级 JSON 协议流，支持在不失真客户端状态的前提下动态刷新。
