export const tasks = {
  select: '帮我查看和这次需求相关的产品资料',
  usage: '我已有产品，了解使用方法',
} as const

export type Task = keyof typeof tasks

export function knownTask(value: unknown): Task | null {
  return value === 'select' || value === 'usage' ? value : null
}

export const discomforts = {
  none: '现在没有明显不适',
  explicit: '现在有明确不适，包括刺痛、灼热、明显泛红、脱皮加重或爆痘加重',
  unsure: '说不准现在算不算不适',
} as const

export type Discomfort = keyof typeof discomforts

export const observableSigns = {
  sting: '刺痛或灼热',
  redness: '明显发红',
  peeling: '脱皮比使用前更明显',
  breakout: '爆痘比使用前更严重',
  just_worried: '以上表现都没有，只是不放心',
  still_unclear: '仍然无法确认',
} as const

export type ObservableSign = keyof typeof observableSigns

export const skinTypes = {
  oily: '油性',
  combination_oily: '混油',
  dry: '干性',
  combination_dry: '混干',
  normal: '中性',
  uncertain: '不确定',
} as const

export type SkinType = keyof typeof skinTypes

export const goals = {
  congestion: '黑头、闭口、毛孔、痘痘或出油',
  dryness: '干燥紧绷',
  dullness: '暗沉或肤色不均',
  aging: '细纹或松弛',
  eyes: '眼周',
  sunscreen: '日间防晒',
  uncertain: '不确定，主要想问用法',
} as const

export type Goal = keyof typeof goals

export const sensitivityLevels = {
  rare: '很少',
  occasional: '偶尔',
  frequent: '经常',
  uncertain: '不确定',
} as const

export type Sensitivity = keyof typeof sensitivityLevels

export const experienceLevels = {
  never: '没用过',
  problem: '用过但出过状况',
  accepted: '用过且能接受',
  uncertain: '不确定',
} as const

export type ExperienceLevel = keyof typeof experienceLevels

export const ingredientFields = {
  bha: '水杨酸',
  niacinamide: '烟酰胺',
  retinoid: 'A醇或A醛',
  vitaminC: '维生素C',
} as const

export type IngredientKey = keyof typeof ingredientFields

export const ownedStatuses = {
  none: '没有',
  named: '有，我写出名称',
  unclear: '有，但现在说不清名称',
} as const

export type OwnedStatus = keyof typeof ownedStatuses

export const budgets = {
  cap350: { label: '350元及以下', cap: 350 },
  cap650: { label: '351–650元', cap: 650 },
  above650: { label: '650元以上', cap: null },
  unset: { label: '暂不设预算', cap: null },
} as const

export type Budget = keyof typeof budgets

export function knownBudget(value: unknown): Budget | null {
  return value === 'cap350' || value === 'cap650' || value === 'above650' || value === 'unset' ? value : null
}

export const textures = {
  none: '没有质地偏好',
  light: '偏好清爽',
  rich: '偏好滋润',
} as const

export type Texture = keyof typeof textures

export type YesNo = 'no' | 'yes'

export type Answers = {
  task: Task | null
  productName: string
  productDetail: string
  currentDiscomfort: Discomfort | null
  observableSigns: ObservableSign | null
  discomfortAfter: string
  skinType: SkinType | null
  primaryGoal: Goal | null
  sensitivityHistory: Sensitivity | null
  ingredientExperience: Record<IngredientKey, ExperienceLevel | null>
  ownedStatus: OwnedStatus | null
  ownedName: string
  ownedDetail: string
  purchaseBudget: Budget | null
  texturePreference: Texture | null
  avoidStatus: YesNo | null
  avoidIngredients: string
  allergyStatus: YesNo | null
  knownAllergens: string
}

export const stepIds = [
  'discomfort',
  'product',
  'skin',
  'goal',
  'history',
  'owned',
  'budget',
  'limits',
] as const

export type StepId = (typeof stepIds)[number]

export function emptyIngredients(): Answers['ingredientExperience'] {
  return { bha: null, niacinamide: null, retinoid: null, vitaminC: null }
}

export function createAnswers(task: Task | null): Answers {
  return {
    task,
    productName: '',
    productDetail: '',
    currentDiscomfort: null,
    observableSigns: null,
    discomfortAfter: '',
    skinType: null,
    primaryGoal: null,
    sensitivityHistory: null,
    ingredientExperience: emptyIngredients(),
    ownedStatus: null,
    ownedName: '',
    ownedDetail: '',
    purchaseBudget: null,
    texturePreference: null,
    avoidStatus: null,
    avoidIngredients: '',
    allergyStatus: null,
    knownAllergens: '',
  }
}

export function asksForProduct(task: Task | null) {
  return task === 'usage'
}

export function asksForSelection(task: Task | null) {
  return task === 'select'
}

export function limitsCurrentUse(answers: Answers) {
  if (answers.currentDiscomfort === 'explicit') return true
  if (answers.currentDiscomfort !== 'unsure' || !answers.observableSigns) return false
  return answers.observableSigns !== 'just_worried'
}

export function discomfortReady(answers: Answers) {
  if (!answers.currentDiscomfort) return false
  if (answers.currentDiscomfort === 'unsure') return answers.observableSigns !== null
  return true
}

export function progressTotal(answers: Answers) {
  if (discomfortReady(answers)) return applicableSteps(answers).length
  const preview: Answers = { ...answers, currentDiscomfort: 'none', observableSigns: null, discomfortAfter: '' }
  return applicableSteps(preview).length
}

export function applicableSteps(answers: Answers): StepId[] {
  const steps: StepId[] = ['discomfort']
  if (!knownTask(answers.task) || !discomfortReady(answers)) return steps
  if (asksForProduct(answers.task)) steps.push('product')
  if (asksForSelection(answers.task)) steps.push('skin', 'goal')
  steps.push('history')
  if (asksForSelection(answers.task)) steps.push('owned', 'budget')
  steps.push('limits')
  return steps
}

export function pruneAnswers(answers: Answers): Answers {
  const next: Answers = {
    ...answers,
    task: knownTask(answers.task),
    ingredientExperience: { ...answers.ingredientExperience },
  }
  if (next.currentDiscomfort !== 'unsure') next.observableSigns = null
  if (next.currentDiscomfort !== 'explicit') next.discomfortAfter = ''
  if (!discomfortReady(next)) {
    next.productName = ''
    next.productDetail = ''
    next.skinType = null
    next.primaryGoal = null
    next.sensitivityHistory = null
    next.ingredientExperience = emptyIngredients()
    next.ownedStatus = null
    next.ownedName = ''
    next.ownedDetail = ''
    next.purchaseBudget = null
    next.texturePreference = null
    next.avoidStatus = null
    next.avoidIngredients = ''
    next.allergyStatus = null
    next.knownAllergens = ''
    return next
  }
  if (!asksForProduct(next.task)) {
    next.productName = ''
    next.productDetail = ''
  }
  if (!asksForSelection(next.task)) {
    next.skinType = null
    next.primaryGoal = null
    next.ownedStatus = null
    next.ownedName = ''
    next.ownedDetail = ''
    next.purchaseBudget = null
    next.texturePreference = null
  } else {
    next.purchaseBudget = knownBudget(next.purchaseBudget)
  }
  if (next.ownedStatus !== 'named') {
    next.ownedName = ''
    next.ownedDetail = ''
  }
  if (next.avoidStatus !== 'yes') next.avoidIngredients = ''
  if (next.allergyStatus !== 'yes') next.knownAllergens = ''
  return next
}

export function validateStep(step: StepId, answers: Answers) {
  if (step === 'discomfort') {
    if (!knownTask(answers.task)) return '请选择这次要做的事。'
    if (!answers.currentDiscomfort) return '请选择现在有没有不适。'
    if (answers.currentDiscomfort === 'unsure' && !answers.observableSigns) {
      return '请先选择现在能够观察到的表现。'
    }
    return ''
  }
  if (step === 'product') {
    if (!answers.productName.trim()) return '请填写要了解的产品名称。'
    if (!answers.productDetail.trim()) return '请填写浓度、规格或完整名称。不清楚可以填写“不清楚”。'
    return ''
  }
  if (step === 'skin') return answers.skinType ? '' : '请选择肤质。'
  if (step === 'goal') return answers.primaryGoal ? '' : '请选择这次最想处理的一件事。'
  if (step === 'history') {
    if (!answers.sensitivityHistory) return '请选择过去是否容易敏感。'
    for (const key of Object.keys(ingredientFields) as IngredientKey[]) {
      if (!answers.ingredientExperience[key]) return `请选择${ingredientFields[key]}的使用经验。`
    }
    return ''
  }
  if (step === 'owned') {
    if (!answers.ownedStatus) return '请选择手上是否有相关产品。'
    if (answers.ownedStatus === 'named' && !answers.ownedName.trim()) {
      return '请填写产品名称。'
    }
    if (answers.ownedStatus === 'named' && !answers.ownedDetail.trim()) {
      return '请补充浓度、规格或完整名称。不清楚可以填写“不清楚”。'
    }
    return ''
  }
  if (step === 'budget') return knownBudget(answers.purchaseBudget) ? '' : '请选择单件产品的价格范围。'
  if (!answers.avoidStatus) return '请回答是否有需要避开的成分。'
  if (!answers.allergyStatus) return '请回答是否有已知过敏的成分。'
  if (asksForSelection(answers.task) && !answers.texturePreference) return '请选择质地偏好。'
  if (answers.avoidStatus === 'yes' && !answers.avoidIngredients.trim()) return '请填写要避开的成分。'
  if (answers.allergyStatus === 'yes' && !answers.knownAllergens.trim()) return '请填写已知过敏的成分。'
  return ''
}

export function budgetLabel(value: unknown) {
  const budget = knownBudget(value)
  return budget ? budgets[budget].label : ''
}

export type SummaryRow = {
  stepId: StepId
  label: string
  value: string
}

export function summaryRows(answers: Answers): SummaryRow[] {
  const rows: SummaryRow[] = [
    { stepId: 'discomfort', label: '任务', value: answers.task ? tasks[answers.task] : '' },
  ]
  let discomfort = answers.currentDiscomfort ? discomforts[answers.currentDiscomfort] : ''
  if (answers.observableSigns) discomfort += `；${observableSigns[answers.observableSigns]}`
  if (answers.discomfortAfter.trim()) discomfort += `；发生在：${answers.discomfortAfter.trim()}`
  rows.push({ stepId: 'discomfort', label: '当前不适', value: discomfort })
  if (asksForProduct(answers.task)) {
    rows.push({
      stepId: 'product',
      label: '要了解的产品',
      value: `${answers.productName.trim()}；${answers.productDetail.trim()}`,
    })
  }
  if (asksForSelection(answers.task)) {
    rows.push(
      { stepId: 'skin', label: '肤质', value: answers.skinType ? skinTypes[answers.skinType] : '' },
      { stepId: 'goal', label: '这次最想处理', value: answers.primaryGoal ? goals[answers.primaryGoal] : '' },
    )
  }
  const experience = (Object.keys(ingredientFields) as IngredientKey[])
    .map((key) => {
      const level = answers.ingredientExperience[key]
      return `${ingredientFields[key]}：${level ? experienceLevels[level] : ''}`
    })
    .join('；')
  rows.push({
    stepId: 'history',
    label: '过去的敏感和成分经验',
    value: `过去敏感：${answers.sensitivityHistory ? sensitivityLevels[answers.sensitivityHistory] : ''}；${experience}`,
  })
  if (asksForSelection(answers.task)) {
    let owned = answers.ownedStatus ? ownedStatuses[answers.ownedStatus] : ''
    if (answers.ownedStatus === 'named') owned += `；${answers.ownedName.trim()}；${answers.ownedDetail.trim()}`
    rows.push(
      { stepId: 'owned', label: '手上已有产品', value: owned },
      {
        stepId: 'budget',
        label: '单件价格',
        value: budgetLabel(answers.purchaseBudget),
      },
    )
  }
  const avoid = answers.avoidStatus === 'yes' ? answers.avoidIngredients.trim() : '没有需要避开的成分'
  const allergy = answers.allergyStatus === 'yes' ? answers.knownAllergens.trim() : '没有已知过敏成分'
  const texture = asksForSelection(answers.task)
    ? `质地：${answers.texturePreference ? textures[answers.texturePreference] : ''}；`
    : ''
  rows.push({
    stepId: 'limits',
    label: '避开成分和已知过敏',
    value: `${texture}避开：${avoid}；已知过敏：${allergy}`,
  })
  return rows
}
