import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { loadCatalog } from '../rules/catalog.ts'
import { PageShell } from '../components/PageShell.tsx'
import {
  applicableSteps,
  asksForSelection,
  budgets,
  discomforts,
  discomfortReady,
  experienceLevels,
  goals,
  ingredientFields,
  observableSigns,
  ownedStatuses,
  skinTypes,
  tasks,
  textures,
  knownTask,
  progressTotal,
  type Answers,
  type StepId,
  type Budget,
  type Discomfort,
  type ExperienceLevel,
  type Goal,
  type IngredientKey,
  type ObservableSign,
  type OwnedStatus,
  type SkinType,
  type Task,
  type Texture,
  type YesNo,
} from '../qa/model.ts'
import { useQuiz } from '../qa/session.tsx'
import { ResultPage } from './ResultPage.tsx'
import { ReviewPage } from './ReviewPage.tsx'

function optionEntries<T extends string>(options: Record<T, string>) {
  return Object.entries(options) as [T, string][]
}

function Choices<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string
  name: string
  value: T | null
  options: Record<T, string>
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="choice-set">
      <legend>{legend}</legend>
      {optionEntries(options).map(([option, label]) => (
        <label key={option} className={value === option ? 'choice selected' : 'choice'}>
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  )
}

export function QuizPage() {
  const { intent } = useParams()
  const location = useLocation()
  const quiz = useQuiz()
  const task = intent === 'select' || intent === 'usage' ? intent : null
  const choosingTask = intent === 'both'
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const startedKey = useRef<string | null>(null)
  const mapAppliedKey = useRef<string | null>(null)
  const fresh = Boolean((location.state as { fresh?: boolean } | null)?.fresh)

  useEffect(() => {
    if (choosingTask) {
      if (startedKey.current === location.key) return
      quiz.start(null)
      startedKey.current = location.key
      setEditing(false)
      setError('')
      return
    }
    if (!task) return
    if (quiz.session && !knownTask(quiz.session.answers.task)) {
      if (startedKey.current === location.key) return
      quiz.start(null)
      startedKey.current = location.key
      setEditing(false)
      setError('')
      return
    }
    if (fresh || !quiz.session) {
      quiz.start(task)
      startedKey.current = location.key
      setEditing(false)
      setError('')
    }
    // A homepage entry passes fresh and replaces the in-memory session.
    // An old mixed task returns to an unselected task choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, task, choosingTask])

  useEffect(() => {
    const mapGoal = (location.state as { mapGoal?: unknown } | null)?.mapGoal
    if (task === 'select' && quiz.session?.stepId === 'goal' && quiz.session.phase === 'quiz' && mapAppliedKey.current !== location.key && typeof mapGoal === 'string' && Object.hasOwn(goals, mapGoal) && mapGoal !== 'uncertain') {
      mapAppliedKey.current = location.key
      quiz.setAnswers(current => ({ ...current, primaryGoal: current.primaryGoal ?? mapGoal as Goal }))
    }
  }, [location.key, location.state, task, quiz.session?.stepId, quiz.session?.phase])

  if (!task && !choosingTask) return <Navigate to="/" replace />
  if ((fresh && startedKey.current !== location.key) || (choosingTask && startedKey.current !== location.key) || !quiz.session) {
    return null
  }
  if (!knownTask(quiz.session.answers.task) && quiz.session.phase !== 'quiz') return null
  if (quiz.session.phase === 'review') return <ReviewPage onEdit={() => setEditing(true)} />
  if (quiz.session.phase === 'result') return <ResultPage />

  const { answers } = quiz.session
  const steps = applicableSteps(answers)
  const index = Math.max(0, steps.indexOf(quiz.session.stepId))
  const stepId = steps[index]

  const update = (recipe: (current: Answers) => Answers) => {
    setError('')
    quiz.setAnswers(recipe)
  }

  const next = () => {
    const message = quiz.goNext()
    setError(message)
    if (!message) setEditing(false)
  }

  return (
    <PageShell showBack>
      <section className="card status-card">
        <p className="section-label">问答</p>
        
        <p className="progress">
          适用问题 {index + 1} / {progressTotal(answers)}
        </p>
        {stepId === 'discomfort' ? (
          <Choices
            legend="你希望了解什么？"
            name="task"
            value={answers.task}
            options={tasks}
            onChange={(value: Task) => update((current) => ({ ...current, task: value }))}
          />
        ) : null}
        <StepFields
          stepId={stepId}
          answers={answers}
          update={update}
        />
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="actions">
          <button type="button" className="secondary-button" onClick={quiz.goBack} disabled={index === 0}>
            上一步
          </button>
          <button type="button" className="primary-button" onClick={next}>
            {discomfortReady(answers) && index === steps.length - 1 ? '完成' : '下一步'}
          </button>
          {editing ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                const message = quiz.finishEdit()
                setError(message)
                if (!message) setEditing(false)
              }}
            >
              完成修改
            </button>
          ) : null}
        </div>
      </section>
    </PageShell>
  )
}

function StepFields({
  stepId,
  answers,
  update,
}: {
  stepId: StepId
  answers: Answers
  update: (recipe: (current: Answers) => Answers) => void
}) {
  if (stepId === 'discomfort') {
    return (
      <>
        <h1>现在皮肤有没有正在发生的不适？</h1>
        <Choices
          legend="当前不适和过去的敏感分开记录"
          name="currentDiscomfort"
          value={answers.currentDiscomfort}
          options={discomforts}
          onChange={(value: Discomfort) => update((current) => ({ ...current, currentDiscomfort: value }))}
        />
        {answers.currentDiscomfort === 'explicit' ? (
          <label className="text-field">
            如果方便，写下发生在哪一支之后。可以不填，也不会据此作判断。
            <input
              value={answers.discomfortAfter}
              onChange={(event) => update((current) => ({ ...current, discomfortAfter: event.target.value }))}
            />
          </label>
        ) : null}
        {answers.currentDiscomfort === 'unsure' ? (
          <Choices
            legend="先看现在能够观察到的表现"
            name="observableSigns"
            value={answers.observableSigns}
            options={observableSigns}
            onChange={(value: ObservableSign) => update((current) => ({ ...current, observableSigns: value }))}
          />
        ) : null}
      </>
    )
  }

  if (stepId === 'product') {
    return (
      <>
        <h1>想了解哪一个产品？</h1>
        <label className="text-field">从产品库选择<select defaultValue="" onChange={event => { const product = loadCatalog().products.find(p => p.id === event.target.value); if (product) update(current => ({ ...current, productName: product.displayName, productDetail: product.spec ?? product.displayName })) }}><option value="">请选择产品，或在下方填写名称</option>{loadCatalog().products.map(product => <option value={product.id} key={product.id}>{product.displayName} · {product.spec}</option>)}</select></label>
        <label className="text-field">
          产品名称
          <input
            value={answers.productName}
            onChange={(event) => update((current) => ({ ...current, productName: event.target.value }))}
          />
        </label>
        <label className="text-field">
          浓度、规格或完整名称
          <input
            value={answers.productDetail}
            onChange={(event) => update((current) => ({ ...current, productDetail: event.target.value }))}
          />
        </label>
      </>
    )
  }

  if (stepId === 'skin') {
    return (
      <>
        <h1>日常更接近哪一种肤质？</h1>
        <Choices
          legend="肤质"
          name="skinType"
          value={answers.skinType}
          options={skinTypes}
          onChange={(value: SkinType) => update((current) => ({ ...current, skinType: value }))}
        />
      </>
    )
  }

  if (stepId === 'goal') {
    return (
      <>
        <h1>如果只能先处理一件事，是哪一件？</h1>
        <Choices
          legend="主目标"
          name="primaryGoal"
          value={answers.primaryGoal}
          options={goals}
          onChange={(value: Goal) => update((current) => ({ ...current, primaryGoal: value }))}
        />
      </>
    )
  }

  if (stepId === 'history') {
    return (
      <>
        <h1>过去的敏感和成分经验</h1>
        <Choices
          legend="过去是否容易敏感"
          name="sensitivityHistory"
          value={answers.sensitivityHistory}
          options={{ rare: '很少', occasional: '偶尔', frequent: '经常', uncertain: '不确定' }}
          onChange={(value) => update((current) => ({ ...current, sensitivityHistory: value }))}
        />
        {(Object.keys(ingredientFields) as IngredientKey[]).map((key) => (
          <Choices
            key={key}
            legend={ingredientFields[key]}
            name={key}
            value={answers.ingredientExperience[key]}
            options={experienceLevels}
            onChange={(value: ExperienceLevel) =>
              update((current) => ({
                ...current,
                ingredientExperience: { ...current.ingredientExperience, [key]: value },
              }))
            }
          />
        ))}
      </>
    )
  }

  if (stepId === 'owned') {
    return (
      <>
        <h1>现在手上有哪些和这次问题相关的产品？</h1>
        <Choices
          legend="已有产品"
          name="ownedStatus"
          value={answers.ownedStatus}
          options={ownedStatuses}
          onChange={(value: OwnedStatus) => update((current) => ({ ...current, ownedStatus: value }))}
        />
        {answers.ownedStatus === 'named' ? (
          <>
            <label className="text-field">
              产品名称
              <input
                value={answers.ownedName}
                onChange={(event) => update((current) => ({ ...current, ownedName: event.target.value }))}
              />
            </label>
            <label className="text-field">
              浓度、规格或完整名称
              <input
                value={answers.ownedDetail}
                onChange={(event) => update((current) => ({ ...current, ownedDetail: event.target.value }))}
              />
            </label>
          </>
        ) : null}
      </>
    )
  }

  if (stepId === 'budget') {
    return (
      <>
        <h1>你希望单件产品的价格控制在多少？</h1>
        <p className="note">按产品资料参考价筛选预算范围，实际售价以购买渠道为准。</p>
        <fieldset className="choice-set">
          <legend>单件产品价格</legend>
          {(Object.keys(budgets) as Budget[]).map((option) => (
            <label key={option} className={answers.purchaseBudget === option ? 'choice selected' : 'choice'}>
              <input
                type="radio"
                name="purchaseBudget"
                value={option}
                checked={answers.purchaseBudget === option}
                onChange={() => update((current) => ({ ...current, purchaseBudget: option }))}
              />
              <span>{budgets[option].label}</span>
            </label>
          ))}
        </fieldset>
      </>
    )
  }

  return (
    <>
      <h1>{asksForSelection(answers.task) ? "质地与成分偏好" : "成分偏好与已知过敏"}</h1>
      <p className="note">请分别填写成分偏好和已知过敏信息。</p>
      {asksForSelection(answers.task) ? (
        <Choices
          legend="质地偏好"
          name="texturePreference"
          value={answers.texturePreference}
          options={textures}
          onChange={(value: Texture) => update((current) => ({ ...current, texturePreference: value }))}
        />
      ) : null}
      <YesNoField
        legend="需要避开的成分"
        name="avoidStatus"
        value={answers.avoidStatus}
        yesLabel="有需要避开的成分"
        noLabel="没有需要避开的成分"
        textLabel="避开的成分"
        text={answers.avoidIngredients}
        onStatus={(value) => update((current) => ({ ...current, avoidStatus: value }))}
        onText={(value) => update((current) => ({ ...current, avoidIngredients: value }))}
      />
      <YesNoField
        legend="已知过敏"
        name="allergyStatus"
        value={answers.allergyStatus}
        yesLabel="有已知过敏的成分"
        noLabel="没有已知过敏的成分"
        textLabel="过敏的成分"
        text={answers.knownAllergens}
        onStatus={(value) => update((current) => ({ ...current, allergyStatus: value }))}
        onText={(value) => update((current) => ({ ...current, knownAllergens: value }))}
      />
    </>
  )
}

function YesNoField({
  legend,
  name,
  value,
  yesLabel,
  noLabel,
  textLabel,
  text,
  onStatus,
  onText,
}: {
  legend: string
  name: string
  value: YesNo | null
  yesLabel: string
  noLabel: string
  textLabel: string
  text: string
  onStatus: (value: YesNo) => void
  onText: (value: string) => void
}) {
  return (
    <fieldset className="choice-set">
      <legend>{legend}</legend>
      {([['no', noLabel], ['yes', yesLabel]] as const).map(([option, label]) => (
        <label key={option} className={value === option ? 'choice selected' : 'choice'}>
          <input type="radio" name={name} value={option} checked={value === option} onChange={() => onStatus(option)} />
          <span>{label}</span>
        </label>
      ))}
      {value === 'yes' ? (
        <label className="text-field">
          {textLabel}
          <input value={text} onChange={(event) => onText(event.target.value)} />
        </label>
      ) : null}
    </fieldset>
  )
}

