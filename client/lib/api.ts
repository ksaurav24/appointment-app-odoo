import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import type {
  AcquireSlotLockInput,
  AdminAppointmentItem,
  AdminDashboard,
  AdminOrganizationStatusFilter,
  AdminTimeseriesQuery,
  AdminUserDetail,
  ApiErrorBody,
  AppointmentType,
  AppointmentTypeWithRelations,
  AppointmentWithRelations,
  AuditLog,
  AvailabilityQuery,
  AvailabilityResponse,
  BookablePerson,
  BookableResource,
  CancelAppointmentInput,
  ChangePasswordInput,
  ChangeRoleInput,
  CreateAppointmentInput,
  CreateAppointmentRequestInput,
  CreateAppointmentTypeInput,
  CreateBookablePersonInput,
  CreateBookableResourceInput,
  CreateOrganizationInput,
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  DeleteResult,
  DisableTwoFactorInput,
  DurationOptionsQuery,
  DurationOptionsResponse,
  ForgotPasswordInput,
  GenericMessage,
  ListAdminAppointmentsQuery,
  ListAppointmentTypesQuery,
  ListBookablePersonsQuery,
  ListAuditLogsQuery,
  ListMyAppointmentsQuery,
  ListOrgAppointmentsQuery,
  ListUsersQuery,
  LoginInput,
  LoginResponse,
  OrgByAppointmentType,
  OrgBusyHours,
  OrgDashboard,
  OrgStaffPerformance,
  OrgTimeseriesQuery,
  Organization,
  OrganizationWithOrganiser,
  PaginatedResult,
  RegisterInput,
  RegisterResponse,
  RejectAppointmentInput,
  RejectOrganizationInput,
  ResourceUtilizationReport,
  ResendOtpInput,
  RescheduleAppointmentInput,
  ResetPasswordInput,
  SafeUser,
  SetBookingQuestionsInput,
  SetEntitiesInput,
  SetScheduleInput,
  SlotLock,
  TimeBucket,
  TopOrganization,
  TopOrganizationsQuery,
  UpdateAppointmentTypeInput,
  UpdateBookablePersonInput,
  UpdateBookableResourceInput,
  VerifyEmailInput,
  VerifyPaymentInput,
  VerifyPaymentResult,
  VerifyTwoFactorInput,
} from "@/types";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.appointly.sauravcodes.in";

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export class ApiError extends Error {
  status: number;
  messages: string[];
  raw: unknown;

  constructor(status: number, messages: string[], raw: unknown) {
    super(messages[0] ?? "Request failed");
    this.status = status;
    this.messages = messages;
    this.raw = raw;
  }
}

export function extractApiError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<ApiErrorBody>;
    const status = axiosErr.response?.status ?? 0;
    const body = axiosErr.response?.data;
    const raw = body?.message;
    const messages = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
        ? [raw]
        : [axiosErr.message || "Request failed"];
    throw new ApiError(status, messages, body);
  }
  if (err instanceof Error) {
    throw new ApiError(0, [err.message], err);
  }
  throw new ApiError(0, ["Unknown error"], err);
}

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean };

let refreshInFlight: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  if (!refreshInFlight) {
    refreshInFlight = api
      .post("/auth/refresh")
      .then(() => undefined)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (
      status !== 401 ||
      !original ||
      original._retry ||
      original.url?.startsWith("/auth/refresh") ||
      original.url?.startsWith("/auth/login") ||
      original.url === "/auth/me"
    ) {
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      await refreshSession();
    } catch {
      return Promise.reject(error);
    }
    return api.request(original);
  },
);

export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const { data } = await api.get<SafeUser>("/auth/me");
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      return null;
    }
    extractApiError(err);
  }
}

export async function loginUser(body: LoginInput): Promise<LoginResponse> {
  try {
    const { data } = await api.post<LoginResponse>("/auth/login", body);
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function loginTwoFactor(
  body: VerifyTwoFactorInput,
): Promise<{ user: SafeUser }> {
  try {
    const { data } = await api.post<{ user: SafeUser }>(
      "/auth/login/2fa",
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function registerUser(
  body: RegisterInput,
): Promise<RegisterResponse> {
  try {
    const { data } = await api.post<RegisterResponse>("/auth/register", body);
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function verifyEmail(
  body: VerifyEmailInput,
): Promise<GenericMessage> {
  try {
    const { data } = await api.post<GenericMessage>(
      "/auth/verify-email",
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function resendOtp(
  body: ResendOtpInput,
): Promise<GenericMessage> {
  try {
    const { data } = await api.post<GenericMessage>("/auth/resend-otp", body);
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function forgotPassword(
  body: ForgotPasswordInput,
): Promise<GenericMessage> {
  try {
    const { data } = await api.post<GenericMessage>(
      "/auth/forgot-password",
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function resetPassword(
  body: ResetPasswordInput,
): Promise<GenericMessage> {
  try {
    const { data } = await api.post<GenericMessage>(
      "/auth/reset-password",
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function changePassword(
  body: ChangePasswordInput,
): Promise<GenericMessage> {
  try {
    const { data } = await api.post<GenericMessage>(
      "/auth/change-password",
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function logoutUser(): Promise<GenericMessage> {
  try {
    const { data } = await api.post<GenericMessage>("/auth/logout");
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function logoutAll(): Promise<GenericMessage> {
  try {
    const { data } = await api.post<GenericMessage>("/auth/logout-all");
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function enableTwoFactor(): Promise<GenericMessage> {
  try {
    const { data } = await api.post<GenericMessage>("/auth/2fa/enable");
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function disableTwoFactor(
  body: DisableTwoFactorInput,
): Promise<GenericMessage> {
  try {
    const { data } = await api.post<GenericMessage>("/auth/2fa/disable", body);
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getMyOrganization(): Promise<Organization | null> {
  try {
    const { data } = await api.get<Organization>("/organizations/me");
    return data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 404 || status === 401 || status === 403) return null;
    }
    extractApiError(err);
  }
}

export async function createOrganization(
  body: CreateOrganizationInput,
): Promise<Organization> {
  try {
    const { data } = await api.post<Organization>("/organizations", body);
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  try {
    const { data } = await api.get<AdminDashboard>("/admin/analytics/dashboard");
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getAdminTimeseries(
  query: AdminTimeseriesQuery,
): Promise<TimeBucket[]> {
  try {
    const { data } = await api.get<TimeBucket[]>("/admin/analytics/timeseries", {
      params: query,
    });
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getTopOrganizations(
  query: TopOrganizationsQuery = {},
): Promise<TopOrganization[]> {
  try {
    const { data } = await api.get<TopOrganization[]>(
      "/admin/analytics/top-organizations",
      { params: query },
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getOrgDashboard(): Promise<OrgDashboard> {
  try {
    const { data } = await api.get<OrgDashboard>(
      "/organizations/me/analytics/dashboard",
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getOrgTimeseries(
  query: OrgTimeseriesQuery,
): Promise<TimeBucket[]> {
  try {
    const { data } = await api.get<TimeBucket[]>(
      "/organizations/me/analytics/timeseries",
      { params: query },
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getOrgByAppointmentType(): Promise<OrgByAppointmentType[]> {
  try {
    const { data } = await api.get<OrgByAppointmentType[]>(
      "/organizations/me/analytics/by-appointment-type",
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getOrgBusyHours(): Promise<OrgBusyHours> {
  try {
    const { data } = await api.get<OrgBusyHours>(
      "/organizations/me/analytics/busy-hours",
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getOrgStaffPerformance(): Promise<OrgStaffPerformance[]> {
  try {
    const { data } = await api.get<OrgStaffPerformance[]>(
      "/organizations/me/analytics/staff-performance",
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

// ─── Admin: users ────────────────────────────────────────────────

export async function listAdminUsers(
  query: ListUsersQuery = {},
): Promise<PaginatedResult<SafeUser>> {
  try {
    const { data } = await api.get<PaginatedResult<SafeUser>>("/admin/users", {
      params: query,
    });
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getAdminUser(userId: string): Promise<AdminUserDetail> {
  try {
    const { data } = await api.get<AdminUserDetail>(`/admin/users/${userId}`);
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function activateUser(userId: string): Promise<SafeUser> {
  try {
    const { data } = await api.patch<SafeUser>(
      `/admin/users/${userId}/activate`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function deactivateUser(userId: string): Promise<SafeUser> {
  try {
    const { data } = await api.patch<SafeUser>(
      `/admin/users/${userId}/deactivate`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function changeUserRole(
  userId: string,
  body: ChangeRoleInput,
): Promise<SafeUser> {
  try {
    const { data } = await api.patch<SafeUser>(
      `/admin/users/${userId}/role`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

// ─── Admin: organizations ────────────────────────────────────────

export async function listAdminOrganizations(
  status: AdminOrganizationStatusFilter = "APPROVED",
): Promise<OrganizationWithOrganiser[]> {
  try {
    const { data } = await api.get<OrganizationWithOrganiser[]>(
      "/admin/organizations",
      { params: { status } },
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function approveOrganization(
  organizationId: string,
): Promise<Organization> {
  try {
    const { data } = await api.post<Organization>(
      `/admin/organizations/${organizationId}/approve`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function rejectOrganization(
  organizationId: string,
  body: RejectOrganizationInput = {},
): Promise<Organization> {
  try {
    const { data } = await api.post<Organization>(
      `/admin/organizations/${organizationId}/reject`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function activateOrganization(
  organizationId: string,
): Promise<Organization> {
  try {
    const { data } = await api.patch<Organization>(
      `/admin/organizations/${organizationId}/activate`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function deactivateOrganization(
  organizationId: string,
): Promise<Organization> {
  try {
    const { data } = await api.patch<Organization>(
      `/admin/organizations/${organizationId}/deactivate`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

// ─── Admin: appointments ─────────────────────────────────────────

export async function listAdminAppointments(
  query: ListAdminAppointmentsQuery = {},
): Promise<PaginatedResult<AdminAppointmentItem>> {
  try {
    const { data } = await api.get<PaginatedResult<AdminAppointmentItem>>(
      "/admin/appointments",
      { params: query },
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

// ─── Admin: audit logs ───────────────────────────────────────────

export async function listAuditLogs(
  query: ListAuditLogsQuery = {},
): Promise<PaginatedResult<AuditLog>> {
  try {
    const { data } = await api.get<PaginatedResult<AuditLog>>(
      "/admin/audit-logs",
      { params: query },
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

// ─── Public discovery ────────────────────────────────────────────

export async function listPublicAppointmentTypes(): Promise<AppointmentType[]> {
  try {
    const { data } = await api.get<AppointmentType[]>(
      "/public/appointment-types",
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getPublicAppointmentType(
  id: string,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.get<AppointmentTypeWithRelations>(
      `/public/appointment-types/${id}`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getPublicAppointmentTypeByToken(
  token: string,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.get<AppointmentTypeWithRelations>(
      `/public/appointment-types/share/${token}`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getAvailability(
  appointmentTypeId: string,
  query: AvailabilityQuery,
): Promise<AvailabilityResponse> {
  try {
    const { data } = await api.get<AvailabilityResponse>(
      `/public/appointment-types/${appointmentTypeId}/availability`,
      { params: query },
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getDurationOptions(
  appointmentTypeId: string,
  query: DurationOptionsQuery,
): Promise<DurationOptionsResponse> {
  try {
    const { data } = await api.get<DurationOptionsResponse>(
      `/public/appointment-types/${appointmentTypeId}/availability/duration-options`,
      { params: query },
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

// ─── Slot locks ──────────────────────────────────────────────────

export async function acquireSlotLock(
  body: AcquireSlotLockInput,
): Promise<SlotLock> {
  try {
    const { data } = await api.post<SlotLock>("/slot-locks", body);
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function extendSlotLock(id: string): Promise<SlotLock> {
  try {
    const { data } = await api.post<SlotLock>(`/slot-locks/${id}/extend`);
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function releaseSlotLock(id: string): Promise<void> {
  try {
    await api.delete(`/slot-locks/${id}`);
  } catch (err) {
    extractApiError(err);
  }
}

// Best-effort release using sendBeacon for tab-close. No-op if unsupported.
export function releaseSlotLockBeacon(id: string): void {
  if (typeof navigator === "undefined" || !("sendBeacon" in navigator)) return;
  const baseURL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const url = `${baseURL}/slot-locks/${id}`;
  // sendBeacon does not support DELETE; we POST a tombstone the server's
  // existing DELETE handles. For now, we attempt fetch with keepalive as
  // the most reliable cross-browser option.
  try {
    fetch(url, { method: "DELETE", credentials: "include", keepalive: true });
  } catch {
    // best-effort only
  }
}

// ─── Appointments (customer) ─────────────────────────────────────

export async function createAppointment(
  body: CreateAppointmentInput,
): Promise<AppointmentWithRelations> {
  try {
    const { data } = await api.post<AppointmentWithRelations>(
      "/appointments",
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function submitAppointmentRequest(
  appointmentTypeId: string,
  body: CreateAppointmentRequestInput,
): Promise<AppointmentWithRelations> {
  try {
    const { data } = await api.post<AppointmentWithRelations>(
      `/public/appointment-types/${appointmentTypeId}/requests`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getMyAppointment(
  publicId: string,
): Promise<AppointmentWithRelations> {
  try {
    const { data } = await api.get<AppointmentWithRelations>(
      `/appointments/${publicId}`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function cancelMyAppointment(
  publicId: string,
  body: CancelAppointmentInput = {},
): Promise<AppointmentWithRelations> {
  try {
    const { data } = await api.post<AppointmentWithRelations>(
      `/appointments/${publicId}/cancel`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

// ─── Payments ────────────────────────────────────────────────────

export async function createPaymentIntent(
  body: CreatePaymentIntentInput,
): Promise<CreatePaymentIntentResult> {
  try {
    const { data } = await api.post<CreatePaymentIntentResult>(
      "/payments/intent",
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function verifyPayment(
  body: VerifyPaymentInput,
): Promise<VerifyPaymentResult> {
  try {
    const { data } = await api.post<VerifyPaymentResult>(
      "/payments/verify",
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

// ─── Bookable persons ──────────────────────────────────────────

export async function listBookablePersons(
  query: ListBookablePersonsQuery = {},
): Promise<BookablePerson[]> {
  try {
    const { data } = await api.get<BookablePerson[]>("/bookable-persons", {
      params: query,
    });
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getBookablePerson(id: string): Promise<BookablePerson> {
  try {
    const { data } = await api.get<BookablePerson>(`/bookable-persons/${id}`);
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function createBookablePerson(
  body: CreateBookablePersonInput,
): Promise<BookablePerson> {
  try {
    const { data } = await api.post<BookablePerson>("/bookable-persons", body);
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function updateBookablePerson(
  id: string,
  body: UpdateBookablePersonInput,
): Promise<BookablePerson> {
  try {
    const { data } = await api.patch<BookablePerson>(
      `/bookable-persons/${id}`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function deleteBookablePerson(id: string): Promise<DeleteResult> {
  try {
    const { data } = await api.delete<DeleteResult>(`/bookable-persons/${id}`);
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

// ─── Bookable resources ────────────────────────────────────────

export async function listBookableResources(
  includeInactive = false,
): Promise<BookableResource[]> {
  try {
    const { data } = await api.get<BookableResource[]>("/bookable-resources", {
      params: { includeInactive },
    });
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getBookableResource(
  id: string,
): Promise<BookableResource> {
  try {
    const { data } = await api.get<BookableResource>(
      `/bookable-resources/${id}`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function createBookableResource(
  body: CreateBookableResourceInput,
): Promise<BookableResource> {
  try {
    const { data } = await api.post<BookableResource>(
      "/bookable-resources",
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function updateBookableResource(
  id: string,
  body: UpdateBookableResourceInput,
): Promise<BookableResource> {
  try {
    const { data } = await api.patch<BookableResource>(
      `/bookable-resources/${id}`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function deleteBookableResource(
  id: string,
): Promise<DeleteResult> {
  try {
    const { data } = await api.delete<DeleteResult>(
      `/bookable-resources/${id}`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getResourceUtilizationReport(): Promise<ResourceUtilizationReport> {
  try {
    const { data } = await api.get<ResourceUtilizationReport>(
      "/bookable-resources/utilization-report",
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

// ─── Appointment types ─────────────────────────────────────────

export async function listAppointmentTypes(
  query: ListAppointmentTypesQuery = {},
): Promise<AppointmentType[]> {
  try {
    const { data } = await api.get<AppointmentType[]>("/appointment-types", {
      params: query,
    });
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getAppointmentType(
  id: string,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.get<AppointmentTypeWithRelations>(
      `/appointment-types/${id}`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function createAppointmentType(
  body: CreateAppointmentTypeInput,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.post<AppointmentTypeWithRelations>(
      "/appointment-types",
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function updateAppointmentType(
  id: string,
  body: UpdateAppointmentTypeInput,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.patch<AppointmentTypeWithRelations>(
      `/appointment-types/${id}`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function deleteAppointmentType(id: string): Promise<void> {
  try {
    await api.delete(`/appointment-types/${id}`);
  } catch (err) {
    extractApiError(err);
  }
}

export async function setAppointmentTypeEntities(
  id: string,
  body: SetEntitiesInput,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.put<AppointmentTypeWithRelations>(
      `/appointment-types/${id}/entities`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function setAppointmentTypeSchedule(
  id: string,
  body: SetScheduleInput,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.put<AppointmentTypeWithRelations>(
      `/appointment-types/${id}/schedule`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function setAppointmentTypeQuestions(
  id: string,
  body: SetBookingQuestionsInput,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.put<AppointmentTypeWithRelations>(
      `/appointment-types/${id}/questions`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function publishAppointmentType(
  id: string,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.post<AppointmentTypeWithRelations>(
      `/appointment-types/${id}/publish`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function unpublishAppointmentType(
  id: string,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.post<AppointmentTypeWithRelations>(
      `/appointment-types/${id}/unpublish`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function regenerateShareToken(
  id: string,
): Promise<{ shareToken: string }> {
  try {
    const { data } = await api.post<{ shareToken: string }>(
      `/appointment-types/${id}/share-token`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function archiveAppointmentType(
  id: string,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.post<AppointmentTypeWithRelations>(
      `/appointment-types/${id}/archive`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function unarchiveAppointmentType(
  id: string,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.post<AppointmentTypeWithRelations>(
      `/appointment-types/${id}/unarchive`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

// ─── Organizer appointments ────────────────────────────────────

export async function listOrgAppointments(
  query: ListOrgAppointmentsQuery = {},
): Promise<AppointmentWithRelations[]> {
  try {
    const { data } = await api.get<AppointmentWithRelations[]>(
      "/organizations/me/appointments",
      { params: query },
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getOrgAppointment(
  publicId: string,
): Promise<AppointmentWithRelations> {
  try {
    const { data } = await api.get<AppointmentWithRelations>(
      `/organizations/me/appointments/${publicId}`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function approveOrgAppointment(
  publicId: string,
): Promise<AppointmentWithRelations> {
  try {
    const { data } = await api.post<AppointmentWithRelations>(
      `/organizations/me/appointments/${publicId}/approve`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function rejectOrgAppointment(
  publicId: string,
  body: RejectAppointmentInput = {},
): Promise<AppointmentWithRelations> {
  try {
    const { data } = await api.post<AppointmentWithRelations>(
      `/organizations/me/appointments/${publicId}/reject`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function completeOrgAppointment(
  publicId: string,
): Promise<AppointmentWithRelations> {
  try {
    const { data } = await api.post<AppointmentWithRelations>(
      `/organizations/me/appointments/${publicId}/complete`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function noShowOrgAppointment(
  publicId: string,
): Promise<AppointmentWithRelations> {
  try {
    const { data } = await api.post<AppointmentWithRelations>(
      `/organizations/me/appointments/${publicId}/no-show`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function cancelOrgAppointment(
  publicId: string,
  body: CancelAppointmentInput = {},
): Promise<AppointmentWithRelations> {
  try {
    const { data } = await api.post<AppointmentWithRelations>(
      `/organizations/me/appointments/${publicId}/cancel`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function rescheduleOrgAppointment(
  publicId: string,
  body: RescheduleAppointmentInput,
): Promise<AppointmentWithRelations> {
  try {
    const { data } = await api.post<AppointmentWithRelations>(
      `/organizations/me/appointments/${publicId}/reschedule`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function listMyAppointments(
  query: ListMyAppointmentsQuery = {},
): Promise<AppointmentWithRelations[]> {
  try {
    const { data } = await api.get<AppointmentWithRelations[]>(
      "/appointments/me",
      { params: query },
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function rescheduleAppointment(
  publicId: string,
  body: RescheduleAppointmentInput,
): Promise<AppointmentWithRelations> {
  try {
    const { data } = await api.post<AppointmentWithRelations>(
      `/appointments/${publicId}/reschedule`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}
