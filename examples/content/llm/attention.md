---
description: 从缩放点积注意力到多头注意力的核心原理。
date: 2026-08-31
---

# Transformer 注意力机制

Attention 允许模型根据相关性动态聚合上下文信息。

## Scaled Dot-Product Attention

$$\operatorname{Attention}(Q,K,V)=\operatorname{softmax}(QK^T/\sqrt{d_k})V$$
