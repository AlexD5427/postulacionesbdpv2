import type {
  ApplicationSubmissionResult,
  AssessmentAttempt,
  AssessmentDefinition,
  AssessmentInvitation,
  CandidateProfile,
  CoverLetter,
  DigitalCV,
  JobApplication,
  JobFilters,
  JobPublication,
  JobSummary,
  MediaAsset,
  Notification,
  NotificationPreferences,
  Paginated,
  PageRequest,
  TelemetryBatch,
} from '@/shared/types/domain';
import type { AuthSession, LoginInput, RegisterInput } from '@/core/auth/types';
import type { DataProvider } from '@/core/data/repositories';
import { AppError } from '@/core/errors/app-error';
import { confirmationNumber, uuid } from '@/shared/utils/ids';
import { mockMeta } from './seed/meta';
import { seedJobs } from './seed/jobs.seed';
import { seedAssessments, seedInvitations } from './seed/assessments.seed';
import { toJobSummary } from '@/infrastructure/mappers/public-dto';
import { delay, loadState, mutateState } from './store';
import {
  buildAccount,
  buildCV,
  buildDefaultNotificationPrefs,
  buildProfile,
  buildWelcomeNotifications,
} from './factories';

/**
 * Filter + sort + paginate an in-memory job list. Extracted so the hybrid
 * provider can reuse the exact same public-facing semantics.
 */
export function queryJobs(
  jobs: JobPublication[],
  filters: JobFilters,
  page: PageRequest,
): Paginated<JobSummary> {
  const q = filters.query?.trim().toLowerCase();
  let list = jobs.filter((job) => job.status === 'published');

  if (q) {
    list = list.filter((job) =>
      [job.title, job.area, job.city, job.shortDescription, job.reference, ...job.tags]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }
  if (filters.area) list = list.filter((j) => j.area === filters.area);
  if (filters.city) list = list.filter((j) => j.city === filters.city);
  if (filters.workMode) list = list.filter((j) => j.workMode === filters.workMode);
  if (filters.employmentType) list = list.filter((j) => j.employmentType === filters.employmentType);
  if (filters.experienceLevel) list = list.filter((j) => j.experienceLevel === filters.experienceLevel);

  const sort = filters.sort ?? 'recent';
  list = [...list].sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title, 'es');
    if (sort === 'closing_soon') {
      const av = a.closesAt ? new Date(a.closesAt).getTime() : Number.POSITIVE_INFINITY;
      const bv = b.closesAt ? new Date(b.closesAt).getTime() : Number.POSITIVE_INFINITY;
      return av - bv;
    }
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  const limit = page.limit ?? 9;
  const start = page.cursor ? Number.parseInt(page.cursor, 10) || 0 : 0;
  const slice = list.slice(start, start + limit);
  const nextIndex = start + limit;
  const nextCursor = nextIndex < list.length ? String(nextIndex) : null;

  return {
    items: slice.map(toJobSummary),
    nextCursor,
    totalHint: list.length,
  };
}

function requireSession(): AuthSession {
  const { session } = loadState();
  if (!session) throw new AppError('unauthorized');
  return session;
}

export function createMockProvider(): DataProvider {
  return {
    mode: 'mock',

    auth: {
      async getSession() {
        await delay(40);
        return loadState().session;
      },
      async register(input: RegisterInput) {
        await delay();
        const account = buildAccount(input);
        const profile = buildProfile(account, input.firstName, input.lastName);
        const cv = buildCV(account);
        const session: AuthSession = { identity: account.identity, expiresAt: null };
        mutateState((s) => {
          s.session = session;
          s.account = account;
          s.profile = profile;
          s.cv = cv;
          s.notifications = buildWelcomeNotifications(account.identity.id);
          s.notificationPrefs = buildDefaultNotificationPrefs(account.identity.id);
        });
        return session;
      },
      async login(input: LoginInput) {
        await delay();
        const state = loadState();
        // Mock: reuse the stored account if the email matches, else fabricate one.
        let account = state.account;
        if (!account || account.identity.email !== input.email) {
          account = buildAccount({
            firstName: 'Candidata',
            lastName: 'Demo',
            email: input.email,
          });
        }
        const session: AuthSession = { identity: account.identity, expiresAt: null };
        const acct = account;
        mutateState((s) => {
          s.session = session;
          s.account = { ...acct, lastLoginAt: new Date().toISOString() };
          s.profile = s.profile ?? buildProfile(acct, 'Candidata', 'Demo');
          s.cv = s.cv ?? buildCV(acct);
          if (s.notifications.length === 0) s.notifications = buildWelcomeNotifications(acct.identity.id);
          s.notificationPrefs = s.notificationPrefs ?? buildDefaultNotificationPrefs(acct.identity.id);
        });
        return session;
      },
      async logout() {
        await delay(40);
        mutateState((s) => {
          s.session = null;
        });
      },
      async requestPasswordReset() {
        await delay();
        // No-op in mock: always resolves (generic messaging in UI).
      },
      async resetPassword() {
        await delay();
      },
      async verifyEmail() {
        await delay();
        mutateState((s) => {
          if (s.account) {
            s.account.identity.emailVerified = true;
            s.account.status = 'active';
          }
        });
      },
    },

    candidate: {
      async getAccount() {
        await delay(40);
        return loadState().account;
      },
      async getProfile() {
        await delay(60);
        return loadState().profile;
      },
      async updateProfile(patch: Partial<CandidateProfile>) {
        await delay();
        const state = mutateState((s) => {
          if (!s.profile) throw new AppError('not_found');
          s.profile = {
            ...s.profile,
            ...patch,
            contact: { ...s.profile.contact, ...patch.contact },
            preferences: { ...s.profile.preferences, ...patch.preferences },
            updatedAt: new Date().toISOString(),
          };
        });
        return state.profile as CandidateProfile;
      },
      async requestAccountDeletion() {
        await delay();
      },
      async requestDataExport() {
        await delay();
        return { requestId: uuid() };
      },
    },

    cv: {
      async getCV() {
        await delay(60);
        return loadState().cv;
      },
      async saveCV(cv: DigitalCV) {
        await delay();
        const next = { ...cv, updatedAt: new Date().toISOString() };
        mutateState((s) => {
          s.cv = next;
        });
        return next;
      },
    },

    coverLetters: {
      async list() {
        await delay(60);
        return loadState().coverLetters;
      },
      async get(id: string) {
        await delay(40);
        return loadState().coverLetters.find((l) => l.meta.id === id) ?? null;
      },
      async create(letter) {
        await delay();
        const id = uuid();
        const created: CoverLetter = {
          ...letter,
          meta: mockMeta(id, `EXT-CL-${id.slice(0, 8)}`),
          updatedAt: new Date().toISOString(),
        };
        mutateState((s) => {
          s.coverLetters.unshift(created);
        });
        return created;
      },
      async update(id: string, patch: Partial<CoverLetter>) {
        await delay();
        let updated: CoverLetter | undefined;
        mutateState((s) => {
          const idx = s.coverLetters.findIndex((l) => l.meta.id === id);
          if (idx < 0) throw new AppError('not_found');
          updated = { ...s.coverLetters[idx]!, ...patch, updatedAt: new Date().toISOString() };
          s.coverLetters[idx] = updated;
        });
        return updated as CoverLetter;
      },
      async remove(id: string) {
        await delay();
        mutateState((s) => {
          s.coverLetters = s.coverLetters.filter((l) => l.meta.id !== id);
        });
      },
      async duplicate(id: string) {
        await delay();
        let dup: CoverLetter | undefined;
        mutateState((s) => {
          const found = s.coverLetters.find((l) => l.meta.id === id);
          if (!found) throw new AppError('not_found');
          const newId = uuid();
          dup = {
            ...found,
            meta: mockMeta(newId, `EXT-CL-${newId.slice(0, 8)}`),
            title: `${found.title} (copia)`,
            isTemplate: false,
            updatedAt: new Date().toISOString(),
          };
          s.coverLetters.unshift(dup);
        });
        return dup as CoverLetter;
      },
    },

    jobs: {
      async listJobs(filters: JobFilters, page: PageRequest) {
        await delay(120);
        return queryJobs(seedJobs, filters, page);
      },
      async getJob(id: string): Promise<JobPublication | null> {
        await delay(80);
        return seedJobs.find((j) => j.meta.id === id || j.reference === id) ?? null;
      },
      async getFeatured(limit = 3) {
        await delay(80);
        return seedJobs
          .filter((j) => j.featured && j.status === 'published')
          .slice(0, limit)
          .map(toJobSummary);
      },
      async getFacets() {
        await delay(40);
        return {
          areas: [...new Set(seedJobs.map((j) => j.area))].sort(),
          cities: [...new Set(seedJobs.map((j) => j.city))].sort(),
        };
      },
    },

    applications: {
      async list() {
        await delay(80);
        return loadState().applications;
      },
      async get(id: string) {
        await delay(40);
        return loadState().applications.find((a) => a.meta.id === id) ?? null;
      },
      async getDraftForJob(jobId: string) {
        await delay(40);
        return (
          loadState().applications.find((a) => a.jobId === jobId && a.lifecycle === 'draft') ?? null
        );
      },
      async saveDraft(application: JobApplication) {
        await delay();
        const next = { ...application, updatedAt: new Date().toISOString() };
        mutateState((s) => {
          const idx = s.applications.findIndex((a) => a.meta.id === next.meta.id);
          if (idx >= 0) s.applications[idx] = next;
          else s.applications.unshift(next);
        });
        return next;
      },
      async submit(application: JobApplication, idempotencyKey: string): Promise<ApplicationSubmissionResult> {
        await delay();
        const state = loadState();
        // Idempotency: if we already submitted with this key, return the same result.
        const existing = state.applications.find(
          (a) => a.idempotencyKey === idempotencyKey && a.lifecycle === 'submitted',
        );
        if (existing && existing.confirmationNumber && existing.submittedAt) {
          return {
            applicationId: existing.meta.id,
            confirmationNumber: existing.confirmationNumber,
            submittedAt: existing.submittedAt,
            deduplicated: true,
          };
        }
        const confirmation = confirmationNumber();
        const submittedAt = new Date().toISOString();
        const submitted: JobApplication = {
          ...application,
          lifecycle: 'submitted',
          submittedAt,
          confirmationNumber: confirmation,
          idempotencyKey,
          withdrawable: true,
          updatedAt: submittedAt,
        };
        mutateState((s) => {
          const idx = s.applications.findIndex((a) => a.meta.id === submitted.meta.id);
          if (idx >= 0) s.applications[idx] = submitted;
          else s.applications.unshift(submitted);
          s.notifications.unshift({
            id: uuid(),
            accountId: submitted.accountId,
            category: 'application_receipt',
            title: `Recibimos tu postulación (${confirmation})`,
            body: `Tu postulación a "${submitted.jobTitle}" fue registrada. Guarda tu número de confirmación.`,
            createdAt: submittedAt,
            read: false,
            actionRequired: false,
            link: `/candidate/applications/${submitted.meta.id}`,
          });
        });
        return { applicationId: submitted.meta.id, confirmationNumber: confirmation, submittedAt, deduplicated: false };
      },
      async withdraw(id: string) {
        await delay();
        mutateState((s) => {
          const app = s.applications.find((a) => a.meta.id === id);
          if (!app) throw new AppError('not_found');
          if (!app.withdrawable) throw new AppError('forbidden');
          app.lifecycle = 'withdrawn';
          app.withdrawable = false;
          app.updatedAt = new Date().toISOString();
        });
      },
    },

    assessments: {
      async listInvitations(): Promise<AssessmentInvitation[]> {
        await delay(60);
        // Merge seed invitations with attempt progress for realism.
        const attempts = loadState().attempts;
        return seedInvitations.map((inv) => {
          const attempt = attempts[inv.assessmentId];
          if (!attempt) return inv;
          const status =
            attempt.status === 'submitted'
              ? 'completed'
              : attempt.status === 'in_progress'
                ? 'in_progress'
                : inv.status;
          return { ...inv, status };
        });
      },
      async getDefinition(assessmentId: string): Promise<AssessmentDefinition | null> {
        await delay(80);
        return seedAssessments.find((a) => a.meta.id === assessmentId) ?? null;
      },
      async getAttempt(assessmentId: string) {
        await delay(40);
        return loadState().attempts[assessmentId] ?? null;
      },
      async startAttempt(assessmentId: string) {
        await delay();
        const def = seedAssessments.find((a) => a.meta.id === assessmentId);
        if (!def) throw new AppError('not_found');
        const session = requireSession();
        const id = uuid();
        const attempt: AssessmentAttempt = {
          meta: mockMeta(id, `EXT-ATT-${id.slice(0, 8)}`),
          assessmentId,
          accountId: session.identity.id,
          status: 'in_progress',
          startedAt: new Date().toISOString(),
          submittedAt: null,
          currentSectionId: def.sections[0]?.id,
          answers: [],
          deadlineAt:
            def.timing.mode === 'total' && def.timing.totalMinutes
              ? new Date(Date.now() + def.timing.totalMinutes * 60_000).toISOString()
              : null,
        };
        mutateState((s) => {
          s.attempts[assessmentId] = attempt;
        });
        return attempt;
      },
      async saveAttempt(attempt: AssessmentAttempt) {
        await delay(80);
        mutateState((s) => {
          s.attempts[attempt.assessmentId] = attempt;
        });
        return attempt;
      },
      async submitAttempt(attempt: AssessmentAttempt) {
        await delay();
        const submitted: AssessmentAttempt = {
          ...attempt,
          status: 'submitted',
          submittedAt: new Date().toISOString(),
        };
        mutateState((s) => {
          s.attempts[attempt.assessmentId] = submitted;
          s.notifications.unshift({
            id: uuid(),
            accountId: attempt.accountId,
            category: 'general',
            title: 'Recibimos tu evaluación',
            body: 'Gracias por completar la evaluación demostrativa. El banco se pondrá en contacto contigo si corresponde.',
            createdAt: submitted.submittedAt as string,
            read: false,
            actionRequired: false,
          });
        });
        return submitted;
      },
    },

    notifications: {
      async list(): Promise<Notification[]> {
        await delay(60);
        return [...loadState().notifications].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      },
      async markRead(id: string) {
        await delay(30);
        mutateState((s) => {
          const n = s.notifications.find((x) => x.id === id);
          if (n) n.read = true;
        });
      },
      async markAllRead() {
        await delay(30);
        mutateState((s) => {
          s.notifications.forEach((n) => (n.read = true));
        });
      },
      async getPreferences(): Promise<NotificationPreferences> {
        await delay(40);
        const state = loadState();
        return (
          state.notificationPrefs ??
          buildDefaultNotificationPrefs(state.account?.identity.id ?? 'anonymous')
        );
      },
      async savePreferences(prefs: NotificationPreferences) {
        await delay();
        mutateState((s) => {
          s.notificationPrefs = prefs;
        });
        return prefs;
      },
    },

    documents: {
      async createUploadIntent(_input) {
        await delay();
        // Mock never issues real URLs; a server adapter will (R2). See SECURITY.md.
        return { uploadUrl: null, documentId: uuid(), requiresServerUpload: true };
      },
    },

    media: {
      async resolveAsset(asset: MediaAsset) {
        // Public preview URLs already resolvable in mock mode.
        return asset;
      },
    },

    telemetry: {
      async sendBatch(batch: TelemetryBatch) {
        // Mock sink: accept and drop. Real adapter posts to a server route.
        return { accepted: batch.events.length };
      },
    },
  };
}
