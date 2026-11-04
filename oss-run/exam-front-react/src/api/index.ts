/** 接口层：路径与字段命名与 OpenAPI 文档（docs/openapi.yaml）保持一致（§10.4 接口文档为联调唯一依据） */
import { api } from './request';

export const endpoints = {
  health: () => api('/api/v1/health'),
  meta: () => api('/api/v1/meta'),
  me: () => api('/api/v1/me'),

  ssoUrl: (redirect: string) => api(`/api/v1/sso/url?redirect=${encodeURIComponent(redirect)}`),
  ssoExchange: (code: string, state: string) => api('/api/v1/sso/exchange', { method: 'POST', body: { code, state } }),
  logout: (refreshToken: string) => api('/api/v1/auth/logout', { method: 'POST', body: { refreshToken } }),

  hall: () => api('/api/v1/hall'),
  exam: (id: string) => api(`/api/v1/exams/${id}`),
  startAttempt: (examId: string) => api(`/api/v1/exams/${examId}/attempts`, { method: 'POST' }),
  attempt: (id: string) => api(`/api/v1/attempts/${id}`),
  saveAnswers: (id: string, answers: Record<string, any>) => api(`/api/v1/attempts/${id}/answers`, { method: 'PATCH', body: { answers } }),
  pushEvents: (id: string, events: any[]) => api(`/api/v1/attempts/${id}/events`, { method: 'POST', body: { events } }),
  submitAttempt: (id: string, answers: Record<string, any>) => api(`/api/v1/attempts/${id}/submit`, { method: 'POST', body: { answers } }),
  attemptResult: (id: string) => api(`/api/v1/attempts/${id}/result`),

  records: (page = 1, pageSize = 20) => api(`/api/v1/records?page=${page}&pageSize=${pageSize}`),
  wrongBook: () => api('/api/v1/wrong-book'),
  masterWrong: (qid: string, mastered: boolean) => api('/api/v1/wrong-book/master', { method: 'POST', body: { qid, mastered } }),
  admissions: (page = 1, pageSize = 20) => api(`/api/v1/admissions?page=${page}&pageSize=${pageSize}`),

  courses: (page = 1, pageSize = 50) => api(`/api/v1/courses?page=${page}&pageSize=${pageSize}`),
  chapter: (id: string) => api(`/api/v1/chapters/${id}`),
  createJob: (body: any) => api('/api/v1/ai/jobs', { method: 'POST', body }),
  job: (id: string) => api(`/api/v1/ai/jobs/${id}`),
  reviewJob: (id: string, body: any) => api(`/api/v1/ai/jobs/${id}/review`, { method: 'POST', body }),

  aiBankSummary: () => api('/api/v1/ai-bank/summary'),
  aiBankQuestions: (query: string) => api(`/api/v1/ai-bank/questions?${query}`),
  setAiBankStatus: (id: string, status: string) =>
    api(`/api/v1/ai-bank/questions/${id}/status`, { method: 'POST', body: { status } }),
  createQuestion: (body: any) => api('/api/v1/ai-bank/questions', { method: 'POST', body }),
  updateQuestion: (id: string, body: any) => api(`/api/v1/ai-bank/questions/${id}`, { method: 'PATCH', body }),
  deleteQuestion: (id: string) => api(`/api/v1/ai-bank/questions/${id}`, { method: 'DELETE' }),

  catalog: () => api('/api/v1/catalog'),
  createCourse: (body: any) => api('/api/v1/catalog/courses', { method: 'POST', body }),
  renameCourse: (id: string, body: any) => api(`/api/v1/catalog/courses/${id}`, { method: 'PATCH', body }),
  deleteCourse: (id: string) => api(`/api/v1/catalog/courses/${id}`, { method: 'DELETE' }),
  createChapter: (body: any) => api('/api/v1/catalog/chapters', { method: 'POST', body }),
  renameChapter: (id: string, body: any) => api(`/api/v1/catalog/chapters/${id}`, { method: 'PATCH', body }),
  deleteChapter: (id: string) => api(`/api/v1/catalog/chapters/${id}`, { method: 'DELETE' }),
  createKp: (body: any) => api('/api/v1/catalog/kps', { method: 'POST', body }),
  updateKp: (id: string, body: any) => api(`/api/v1/catalog/kps/${id}`, { method: 'PATCH', body }),
  deleteKp: (id: string) => api(`/api/v1/catalog/kps/${id}`, { method: 'DELETE' }),

  documents: (query: string) => api(`/api/v1/doclib/documents?${query}`),
  document: (id: string) => api(`/api/v1/doclib/documents/${id}`),
  createDocument: (body: any) => api('/api/v1/doclib/documents', { method: 'POST', body }),
  deleteDocument: (id: string) => api(`/api/v1/doclib/documents/${id}`, { method: 'DELETE' }),
  renameDocument: (id: string, body: any) => api(`/api/v1/doclib/documents/${id}`, { method: 'PATCH', body }),

  publishDocuments: (query: string) => api(`/api/v1/publish/documents?${query}`),
  reviewPublishDoc: (id: string, body: any) => api(`/api/v1/publish/documents/${id}/review`, { method: 'POST', body }),
  publishExam: (id: string, body: any) => api(`/api/v1/publish/documents/${id}/publish`, { method: 'POST', body }),
  publishExams: (query: string) => api(`/api/v1/publish/exams?${query}`),
  deleteExam: (id: string) => api(`/api/v1/exams/${id}`, { method: 'DELETE' }),

  gradingQueue: () => api('/api/v1/grading/queue'),
  gradingDetail: (id: string) => api(`/api/v1/grading/${id}`),
  gradingConfirm: (id: string, items: any[]) => api(`/api/v1/grading/${id}/confirm`, { method: 'POST', body: { items } }),

  stats: (examId: string) => api(`/api/v1/stats/${examId}`),
  papers: (page = 1, pageSize = 50) => api(`/api/v1/papers?page=${page}&pageSize=${pageSize}`),
  exams: (page = 1, pageSize = 50) => api(`/api/v1/exams?page=${page}&pageSize=${pageSize}`),
  setExamStatus: (id: string, status: string) => api(`/api/v1/exams/${id}/status`, { method: 'POST', body: { status } }),

  audit: (page = 1, pageSize = 20) => api(`/api/v1/audit?page=${page}&pageSize=${pageSize}`),
  events: (page = 1, pageSize = 20) => api(`/api/v1/events?page=${page}&pageSize=${pageSize}`),
  outboxRetry: (eventId: string) => api('/api/v1/admin/outbox/retry', { method: 'POST', body: { eventId } })
};
