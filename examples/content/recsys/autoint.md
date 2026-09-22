# AutoInt：用自注意力机制自动学习特征交互

> 论文：*AutoInt: Automatic Feature Interaction Learning via Self-Attentive Neural Networks*

## 背景

AutoInt 使用多头自注意力机制自动学习高阶特征交互。

| 方法 | 思路 | 局限 |
| --- | --- | --- |
| FM | 隐向量内积 | 只能建模二阶交互 |
| AutoInt | 多头自注意力 | 需要控制模型复杂度 |

## 核心公式

$$
\alpha_{m,k} = \frac{\exp(\psi(\mathbf e_m, \mathbf e_k))}{\sum_l \exp(\psi(\mathbf e_m, \mathbf e_l))}
$$

## 示例代码

```python
import torch
from torch import nn

attention = nn.MultiheadAttention(64, 4, batch_first=True)
```
