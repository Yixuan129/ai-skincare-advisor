import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  applicableSteps,
  createAnswers,
  pruneAnswers,
  stepIds,
  validateStep,
  type Answers,
  type StepId,
  type Task,
} from './model.ts'

type Phase = 'quiz' | 'review' | 'result'

type Session = {
  stepId: StepId
  phase: Phase
  answers: Answers
}

type QuizContextValue = {
  session: Session | null
  start: (task: Task | null) => void
  setAnswers: (recipe: (current: Answers) => Answers) => void
  goNext: () => string
  goBack: () => void
  editStep: (stepId: StepId) => void
  finishEdit: () => string
  showResult: () => void
  backToReview: () => void
  restart: () => void
}

const QuizContext = createContext<QuizContextValue | null>(null)

function relocate(steps: StepId[], stepId: StepId) {
  if (steps.includes(stepId)) return stepId
  const previous = stepIds.indexOf(stepId)
  const earlier = steps.findLast((id) => stepIds.indexOf(id) < previous)
  return earlier ?? steps[0]
}

export function QuizProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)

  const value = useMemo<QuizContextValue>(() => {
    const settle = (answers: Answers, stepId: StepId, phase: Phase): Session => {
      const pruned = pruneAnswers(answers)
      const steps = applicableSteps(pruned)
      return { answers: pruned, stepId: relocate(steps, stepId), phase }
    }

    return {
      session,
      start: (task) => {
        setSession({ answers: createAnswers(task), stepId: 'discomfort', phase: 'quiz' })
      },
      setAnswers: (recipe) => {
        setSession((current) => {
          if (!current) return current
          return settle(recipe(current.answers), current.stepId, current.phase)
        })
      },
      goNext: () => {
        if (!session) return ''
        const message = validateStep(session.stepId, session.answers)
        if (message) return message
        const steps = applicableSteps(session.answers)
        const index = steps.indexOf(session.stepId)
        if (index < steps.length - 1) {
          setSession({ ...session, stepId: steps[index + 1], phase: 'quiz' })
          return ''
        }
        setSession({ ...session, phase: 'review' })
        return ''
      },
      goBack: () => {
        if (!session) return
        const steps = applicableSteps(session.answers)
        const index = steps.indexOf(session.stepId)
        if (index <= 0) return
        setSession({ ...session, stepId: steps[index - 1], phase: 'quiz' })
      },
      editStep: (stepId) => {
        if (!session) return
        setSession({ ...session, stepId, phase: 'quiz' })
      },
      finishEdit: () => {
        if (!session) return ''
        const steps = applicableSteps(session.answers)
        for (const stepId of steps) {
          const message = validateStep(stepId, session.answers)
          if (message) {
            setSession({ ...session, stepId, phase: 'quiz' })
            return message
          }
        }
        setSession({ ...session, phase: 'review' })
        return ''
      },
      showResult: () => {
        if (!session) return
        setSession({ ...session, phase: 'result' })
      },
      backToReview: () => {
        if (!session) return
        setSession({ ...session, phase: 'review' })
      },
      restart: () => setSession(null),
    }
  }, [session])

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>
}

export function useQuiz() {
  const value = useContext(QuizContext)
  if (!value) throw new Error('问答状态尚未就绪')
  return value
}
