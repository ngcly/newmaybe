---
title: 隐私优先原则
pubDate: 2026-06-23
updatedDate: 2026-06-24
category: 准则
connections: ['notes/anti-tracking']
version: 1.0.2
---
隐私优先（Privacy First）是系统设计的一种核心约束，要求从架构底层默认保护用户的数据主权与隐私权。

基本实践：
1.  **零追踪**：不使用第三方商业跟踪代码，如 Google Analytics 等。
2.  **静态生成（SSG）**：将全站编译为静态 HTML 页面分发，从而消除服务端动态追踪用户的可能性。
3.  **零 Cookie 运行**：如果可能，避免全站向用户写入任何 Cookie，确保用户的浏览是完全匿名且不可关联的。
