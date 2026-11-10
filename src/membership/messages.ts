import { goals, limitsCurrentUse, type Answers } from '../qa/model.ts'

export type PreviewMessage = {
  title: string
  body: string
}

export function previewMessages(answers: Answers, productNames: string[]): PreviewMessage[] | null {
  const names = [...new Set(productNames.map((name) => name.trim()).filter(Boolean))]
  if (names.length === 0) return null
  const listed = names.map((name) => `「${name}」`).join('、')
  const goal =
    answers.task === 'select' && answers.primaryGoal && answers.primaryGoal !== 'uncertain'
      ? goals[answers.primaryGoal]
      : null
  const need = goal ? `想先处理「${goal}」` : '查看已点名的产品资料'
  const stillNeed = goal ? `是否仍然想处理「${goal}」` : '是否仍然想查看这些产品资料'
  const messages = [
    {
      title: '方案保存提醒',
      body: `你这次${need}。相关产品包括${listed}。保存后，可以在本机的已保存方案里查看这些信息。`,
    },
    {
      title: '使用反馈邀请',
      body: `想先问一下：你有没有开始使用${listed}？如果还没有开始，可以先不用回答。如果已经开始使用，目前的体验怎么样？`,
    },
    {
      title: '复购前确认',
      body: `想问一下${listed}现在还剩多少，以及你${stillNeed}。这里只询问剩余量和是否仍有需求。`,
    },
  ]
  if (!limitsCurrentUse(answers)) return messages
  return messages.filter((message) => message.title === '方案保存提醒')
}
