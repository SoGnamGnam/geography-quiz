import type { Answer, Question, Quiz, TemplateId } from './types'

export type Outcome = 'correct' | 'wrong' | 'skipped'

export function checkAnswer(question: Question, optionId: string | null): Outcome {
  if (optionId === null) return 'skipped'
  return optionId === question.correctOptionId ? 'correct' : 'wrong'
}

export interface ResultItem {
  readonly question: Question
  /** The chosen option id, or null if skipped / out of time. */
  readonly chosenOptionId: string | null
  readonly outcome: Outcome
}

export interface QuizResult {
  readonly total: number
  readonly correct: number
  readonly wrong: number
  readonly skipped: number
  readonly byTemplate: Readonly<Partial<Record<TemplateId, { total: number; correct: number }>>>
  readonly items: readonly ResultItem[]
}

/** Scores a finished quiz. Questions without an answer count as skipped. */
export function summarize(quiz: Quiz, answers: readonly Answer[]): QuizResult {
  const chosen = new Map(answers.map((a) => [a.questionId, a.optionId]))
  const byTemplate: Partial<Record<TemplateId, { total: number; correct: number }>> = {}
  const counts = { correct: 0, wrong: 0, skipped: 0 }

  const items = quiz.questions.map((question): ResultItem => {
    const chosenOptionId = chosen.get(question.id) ?? null
    const outcome = checkAnswer(question, chosenOptionId)
    counts[outcome]++
    const stats = (byTemplate[question.templateId] ??= { total: 0, correct: 0 })
    stats.total++
    if (outcome === 'correct') stats.correct++
    return { question, chosenOptionId, outcome }
  })

  return { total: quiz.questions.length, ...counts, byTemplate, items }
}
