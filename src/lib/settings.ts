// The quiz configuration, persisted in localStorage. It is the only thing the
// app stores (see CONTEXT.md: no accounts, no progress tracking).

import { writable } from 'svelte/store'
import {
  defaultQuizConfig,
  normalizeQuizConfig,
  type QuizConfig,
  type TemplateConfig,
  type TemplateDifficulty,
  type TemplateId,
} from '../engine'

const STORAGE_KEY = 'world-quiz:config'

function load(): QuizConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? normalizeQuizConfig(JSON.parse(saved)) : defaultQuizConfig()
  } catch {
    // Storage blocked (private mode, disabled site data) or corrupt JSON.
    return defaultQuizConfig()
  }
}

export const quizConfig = writable<QuizConfig>(load())

quizConfig.subscribe((config) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Not persisted: the app still works for this session.
  }
})

// Typed update helpers, so components never mutate the (readonly) config.

export function setQuestionCount(count: number) {
  quizConfig.update((c) => normalizeQuizConfig({ ...c, questionCount: count }))
}

export function setTemplate(id: TemplateId, patch: Partial<Omit<TemplateConfig, 'difficulty'>>) {
  quizConfig.update((c) => ({
    ...c,
    templates: { ...c.templates, [id]: { ...c.templates[id], ...patch } },
  }))
}

export function setDifficulty(id: TemplateId, patch: Partial<TemplateDifficulty>) {
  quizConfig.update((c) => {
    const template = c.templates[id]
    const difficulty = { ...template.difficulty, ...patch }
    if (!difficulty.timeLimitSeconds) delete difficulty.timeLimitSeconds
    return { ...c, templates: { ...c.templates, [id]: { ...template, difficulty } } }
  })
}

export function toggleFilter<K extends 'continents' | 'categories'>(
  key: K,
  value: QuizConfig['filters'][K][number],
) {
  quizConfig.update((c) => {
    const current = c.filters[key] as readonly string[]
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    return { ...c, filters: { ...c.filters, [key]: next } }
  })
}

export function clearFilter(key: 'continents' | 'categories') {
  quizConfig.update((c) => ({ ...c, filters: { ...c.filters, [key]: [] } }))
}

export function resetConfig() {
  quizConfig.set(defaultQuizConfig())
}
