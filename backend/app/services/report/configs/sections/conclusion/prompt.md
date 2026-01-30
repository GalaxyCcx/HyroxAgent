# Conclusion 章节

这是一个静态章节，不需要独立的 LLM 调用。

## 数据来源

conclusion 章节的内容由各章节的输出自动汇总：

1. **優勢**：来自 `summary.highlights[type=strength]`
2. **改進方向**：来自 `time_loss.loss_items` 和 `training.weakness_analysis`
3. **下一步行動**：来自 `training.key_workouts` 的前3项
4. **目標成績**：来自 `prediction.recommended_target`

## 前端渲染

前端根据 `conclusion` 章节的 `blocks` 渲染以下组件：

1. **StrengthsList**：优势列表
2. **ImprovementsList**：改进方向列表
3. **ActionItems**：行动项列表
4. **TargetCard**：目标成绩卡片

## 生成逻辑（ReportAssembler）

```python
def assemble_conclusion(sections: Dict[str, SectionOutput]) -> List[ContentBlock]:
    blocks = []
    
    # 1. 汇总优势
    strengths = [h for h in sections['summary'].highlights if h['type'] == 'strength']
    blocks.append({
        'type': 'list',
        'component': 'StrengthsList',
        'props': {'items': strengths, 'title': '您的優勢'}
    })
    
    # 2. 汇总改进方向
    improvements = sections['training'].weakness_analysis[:3]
    blocks.append({
        'type': 'list',
        'component': 'ImprovementsList',
        'props': {'items': improvements, 'title': '重點改進方向'}
    })
    
    # 3. 汇总行动项
    actions = sections['training'].key_workouts[:3]
    blocks.append({
        'type': 'list',
        'component': 'ActionItems',
        'props': {'items': actions, 'title': '下一步行動'}
    })
    
    # 4. 目标成绩
    target = sections['prediction'].recommended_target
    target_time = sections['prediction'].prediction_tiers[target]
    blocks.append({
        'type': 'card',
        'component': 'TargetCard',
        'props': {'target': target, 'time': target_time, 'title': '目標成績'}
    })
    
    return blocks
```

## 样式建议

- 使用卡片式布局，每个模块一个卡片
- 优势用绿色主题
- 改进方向用橙色主题
- 行动项用蓝色主题
- 目标成绩用金色/渐变主题，突出显示
