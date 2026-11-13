import { describe, expect, it } from 'vitest'
import { defaultQuizConfig } from './config'
import { DATA } from './fixtures'
import { generateQuiz } from './generator'
import { checkAnswer, summarize } from './scoring'

const quiz = generateQuiz(DATA, { ...defaultQuizConfig(), questionCount: 6 }, 77)
const [q1, q2, q3] = quiz.questions

describe('checkAnswer', () => {
  it('distinguishes correct, wrong and skipped', () => {
    const wrong = q1!.options.find((o) => o.id !== q1!.correctOptionId)!.id
    expect(checkAnswer(q1!, q1!.correctOptionId)).toBe('correct')
    expect(checkAnswer(q1!, wrong)).toBe('wrong')
    expect(checkAnswer(q1!, null)).toBe('skipped')
  })
})

describe('summarize', () => {
  it('counts outcomes, treating missing answers as skipped', () => {
    const wrong = q2!.options.find((o) => o.id !== q2!.correctOptionId)!.id
    const result = summarize(quiz, [
      { questionId: q1!.id, optionId: q1!.correctOptionId },
      { questionId: q2!.id, optionId: wrong },
      { questionId: q3!.id, optionId: null },
    ])
    expect(result).toMatchObject({ total: 6, correct: 1, wrong: 1, skipped: 4 })
    expect(result.items[0]).toMatchObject({
      outcome: 'correct',
      chosenOptionId: q1!.correctOptionId,
    })
    expect(result.items[5]!.outcome).toBe('skipped')
  })

  it('groups results by template', () => {
    const answers = quiz.questions.map((q) => ({ questionId: q.id, optionId: q.correctOptionId }))
    const result = summarize(quiz, answers)
    const totals = Object.values(result.byTemplate).reduce((sum, t) => sum + t.total, 0)
    expect(totals).toBe(6)
    for (const stats of Object.values(result.byTemplate)) expect(stats.correct).toBe(stats.total)
  })
})
