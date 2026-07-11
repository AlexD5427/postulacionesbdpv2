import type {
  AssessmentAttempt,
  AssessmentDefinition,
  AssessmentInvitation,
  CandidateAccount,
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

/**
 * Repository contracts (ports).
 *
 * These provider-neutral interfaces are the ONLY data surface the UI/services
 * consume. Concrete adapters (mock, supabase, apps-script, hybrid) implement
 * them in `src/infrastructure/providers`. This is classic dependency
 * inversion: swap the backend without touching a single component. See
 * DATA_PROVIDER_ARCHITECTURE.md.
 */

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>;
  register(input: RegisterInput): Promise<AuthSession>;
  login(input: LoginInput): Promise<AuthSession>;
  logout(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  verifyEmail(token: string): Promise<void>;
}

export interface CandidateRepository {
  getAccount(): Promise<CandidateAccount | null>;
  getProfile(): Promise<CandidateProfile | null>;
  updateProfile(patch: Partial<CandidateProfile>): Promise<CandidateProfile>;
  requestAccountDeletion(): Promise<void>;
  requestDataExport(): Promise<{ requestId: string }>;
}

export interface CVRepository {
  getCV(): Promise<DigitalCV | null>;
  saveCV(cv: DigitalCV): Promise<DigitalCV>;
}

export interface CoverLettersRepository {
  list(): Promise<CoverLetter[]>;
  get(id: string): Promise<CoverLetter | null>;
  create(letter: Omit<CoverLetter, 'meta' | 'updatedAt'>): Promise<CoverLetter>;
  update(id: string, patch: Partial<CoverLetter>): Promise<CoverLetter>;
  remove(id: string): Promise<void>;
  duplicate(id: string): Promise<CoverLetter>;
}

export interface JobsRepository {
  /** Directory listing with filters + cursor pagination. */
  listJobs(filters: JobFilters, page: PageRequest): Promise<Paginated<JobSummary>>;
  getJob(id: string): Promise<JobPublication | null>;
  getFeatured(limit?: number): Promise<JobSummary[]>;
  /** Distinct facet values for filter controls. */
  getFacets(): Promise<{ areas: string[]; cities: string[] }>;
}

export interface ApplicationsRepository {
  list(): Promise<JobApplication[]>;
  get(id: string): Promise<JobApplication | null>;
  getDraftForJob(jobId: string): Promise<JobApplication | null>;
  saveDraft(application: JobApplication): Promise<JobApplication>;
  submit(
    application: JobApplication,
    idempotencyKey: string,
  ): Promise<import('@/shared/types/domain').ApplicationSubmissionResult>;
  withdraw(id: string): Promise<void>;
}

export interface AssessmentsRepository {
  listInvitations(): Promise<AssessmentInvitation[]>;
  getDefinition(assessmentId: string): Promise<AssessmentDefinition | null>;
  getAttempt(assessmentId: string): Promise<AssessmentAttempt | null>;
  startAttempt(assessmentId: string): Promise<AssessmentAttempt>;
  saveAttempt(attempt: AssessmentAttempt): Promise<AssessmentAttempt>;
  submitAttempt(attempt: AssessmentAttempt): Promise<AssessmentAttempt>;
}

export interface NotificationsRepository {
  list(): Promise<Notification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
  getPreferences(): Promise<NotificationPreferences>;
  savePreferences(prefs: NotificationPreferences): Promise<NotificationPreferences>;
}

export interface DocumentsRepository {
  /** Future: request a signed upload URL (R2) from a server adapter. */
  createUploadIntent(input: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<{ uploadUrl: string | null; documentId: string; requiresServerUpload: boolean }>;
}

export interface MediaRepository {
  /** Resolve a possibly-private asset to a displayable URL (signed if needed). */
  resolveAsset(asset: MediaAsset): Promise<MediaAsset>;
}

export interface TelemetryRepository {
  /** Send a batch; must be best-effort and never block submission. */
  sendBatch(batch: TelemetryBatch): Promise<{ accepted: number }>;
}

/** Aggregate of all repositories exposed to the app. */
export interface DataProvider {
  readonly mode: string;
  readonly auth: AuthRepository;
  readonly candidate: CandidateRepository;
  readonly cv: CVRepository;
  readonly coverLetters: CoverLettersRepository;
  readonly jobs: JobsRepository;
  readonly applications: ApplicationsRepository;
  readonly assessments: AssessmentsRepository;
  readonly notifications: NotificationsRepository;
  readonly documents: DocumentsRepository;
  readonly media: MediaRepository;
  readonly telemetry: TelemetryRepository;
}
