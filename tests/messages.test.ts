import assert from 'node:assert/strict'
import test from 'node:test'
import { previewMessages } from '../src/membership/messages.ts'
import { createAnswers } from '../src/qa/model.ts'

function answersFor(goal: 'congestion' | 'eyes', discomfort: 'none' | 'explicit' = 'none') {
  const answers = createAnswers('select')
  answers.currentDiscomfort = discomfort
  answers.discomfortAfter = '秘密不适经过'
  answers.primaryGoal = goal
  answers.knownAllergens = '秘密过敏原'
  answers.avoidIngredients = '秘密避开成分'
  return answers
}

test('两个画像按需求和产品名称生成不同消息，且不包含敏感内容', () => {
  const pores = previewMessages(answersFor('congestion'), ['宝拉珍选水杨酸精华露'])
  const eyes = previewMessages(answersFor('eyes'), ['宝拉珍选高效胜肽胶原眼霜'])
  assert.ok(pores && eyes)
  assert.deepEqual(pores.map((item) => item.title), ['方案保存提醒', '使用反馈邀请', '复购前确认'])
  const poreText = pores.map((item) => item.body).join('\n')
  const eyeText = eyes.map((item) => item.body).join('\n')
  assert.match(poreText, /黑头、闭口、毛孔、痘痘或出油/)
  assert.match(poreText, /宝拉珍选水杨酸精华露/)
  assert.equal(poreText.includes('眼周'), false)
  assert.match(eyeText, /眼周/)
  assert.match(eyeText, /宝拉珍选高效胜肽胶原眼霜/)
  assert.equal(eyeText.includes('水杨酸'), false)
  for (const text of [poreText, eyeText]) {
    assert.equal(text.includes('模拟消息，未发送'), false)
    assert.match(text, /有没有开始使用/)
    assert.match(text, /还剩多少/)
    for (const phrase of ['秘密过敏原', '秘密不适经过', '秘密避开成分', '优惠', '小样', '每周', '每天', '升级', '用完']) {
      assert.equal(text.includes(phrase), false, phrase)
    }
  }
})

test('当前不适时不生成开始使用或复购消息', () => {
  const messages = previewMessages(answersFor('congestion', 'explicit'), ['宝拉珍选水杨酸精华露'])
  assert.ok(messages)
  assert.deepEqual(messages.map((item) => item.title), ['方案保存提醒'])
  const text = messages.map((item) => item.body).join('\n')
  assert.equal(text.includes('有没有开始使用'), false)
  assert.equal(text.includes('还剩多少'), false)
  assert.equal(text.includes('秘密不适经过'), false)
})

test('没有候选产品时不生成消息', () => {
  assert.equal(previewMessages(answersFor('congestion'), []), null)
  assert.equal(previewMessages(answersFor('congestion'), ['  ']), null)
})
