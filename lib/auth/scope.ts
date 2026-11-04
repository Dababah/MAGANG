import type { Prisma } from "@prisma/client";
import type { ReturnType } from "@/lib/auth/session";

export type UserSession = NonNullable<
  Awaited<ReturnType<typeof import("@/lib/auth/session").getCurrentUser>>
>;

/**
 * Helper function to determine statement visibility scope based on user role.
 * Used consistently across all pages and APIs.
 *
 * Rules:
 * - PEKERJA: Only own statements
 * - ATASAN: Own statements + direct subordinates' statements
 * - ADMIN_TI: All statements in DISETUJUI_ATASAN status only
 * - SUPER_ADMIN: All statements in DIAJUKAN or DISETUJUI_ATASAN status only
 */
export function getStatementVisibilityScope(
  user: UserSession,
): Prisma.StatementWhereInput {
  if (user.role === "PEKERJA") {
    return { pekerjaId: user.employeeId };
  }

  if (user.role === "ATASAN") {
    return {
      OR: [
        { pekerjaId: user.employeeId },
        { pekerja: { atasanId: user.employeeId } },
      ],
    };
  }

  if (user.role === "ADMIN_TI") {
    return { status: "DISETUJUI_ATASAN" };
  }

  if (user.role === "SUPER_ADMIN") {
    return { status: { in: ["DIAJUKAN", "DISETUJUI_ATASAN"] } };
  }

  // Fallback: return empty set (no access)
  return { id: -1 };
}

/**
 * Helper function to determine approval queue scope based on user role.
 * This is more restrictive than visibility scope - only shows pending items
 * that the user can actually act on.
 *
 * Rules:
 * - ATASAN: Subordinates' DIAJUKAN statements (excluding own)
 * - ADMIN_TI: DISETUJUI_ATASAN statements (excluding own)
 * - SUPER_ADMIN: DIAJUKAN or DISETUJUI_ATASAN statements (excluding own)
 * - PEKERJA: Empty (cannot approve)
 */
export function getApprovalQueueScope(
  user: UserSession,
): Prisma.StatementWhereInput {
  // PEKERJA cannot approve anything
  if (user.role === "PEKERJA") {
    return { id: -1 };
  }

  if (user.role === "ATASAN") {
    return {
      status: "DIAJUKAN",
      pekerjaId: { not: user.employeeId },
      pekerja: { atasanId: user.employeeId },
    };
  }

  if (user.role === "ADMIN_TI") {
    return {
      status: "DISETUJUI_ATASAN",
      pekerjaId: { not: user.employeeId },
    };
  }

  if (user.role === "SUPER_ADMIN") {
    return {
      status: { in: ["DIAJUKAN", "DISETUJUI_ATASAN"] },
      pekerjaId: { not: user.employeeId },
    };
  }

  // Fallback: return empty set (no access)
  return { id: -1 };
}

/**
 * Helper function to determine archive scope based on user role.
 * Archive shows completed (DISETUJUI_TI or DITOLAK) statements.
 *
 * Rules:
 * - PEKERJA: Only own archived statements
 * - ATASAN: Own + subordinates' archived statements
 * - ADMIN_TI: All archived statements (they processed them)
 * - SUPER_ADMIN: All archived statements
 */
export function getArchiveScope(user: UserSession): Prisma.StatementWhereInput {
  const baseStatus = { status: { in: ["DISETUJUI_TI", "DITOLAK"] as const } };

  if (user.role === "PEKERJA") {
    return {
      ...baseStatus,
      pekerjaId: user.employeeId,
    };
  }

  if (user.role === "ATASAN") {
    return {
      ...baseStatus,
      OR: [
        { pekerjaId: user.employeeId },
        { pekerja: { atasanId: user.employeeId } },
      ],
    };
  }

  // ADMIN_TI and SUPER_ADMIN can see all archived statements
  return baseStatus;
}

/**
 * Helper function to determine PDF access scope.
 * Same rules as visibility scope - if you can see it, you can download the PDF.
 */
export function getPdfAccessScope(
  user: UserSession,
): Prisma.StatementWhereInput {
  return getStatementVisibilityScope(user);
}

/**
 * Helper function to determine attachment access scope.
 * Same as PDF access - if you can see the statement, you can access attachments.
 */
export function getAttachmentAccessScope(
  user: UserSession,
): Prisma.StatementWhereInput {
  return getStatementVisibilityScope(user);
}

/**
 * Validation helper to check if user can approve a specific statement.
 * This is stricter than just checking role - it validates the actual relationship.
 */
export async function canUserApproveStatement(
  user: UserSession,
  statementId: number,
  prisma: any,
): Promise<{
  canApprove: boolean;
  stage?: number;
  reason?: string;
}> {
  const statement = await prisma.statement.findUnique({
    where: { id: statementId },
    include: { pekerja: { select: { atasanId: true } } },
  });

  if (!statement) {
    return { canApprove: false, reason: "Statement not found" };
  }

  // Cannot approve own statement
  if (statement.pekerjaId === user.employeeId) {
    return { canApprove: false, reason: "Cannot approve own statement" };
  }

  // PEKERJA cannot approve
  if (user.role === "PEKERJA") {
    return { canApprove: false, reason: "PEKERJA role cannot approve" };
  }

  // ATASAN can approve stage 1 (DIAJUKAN)
  if (user.role === "ATASAN") {
    if (
      statement.status === "DIAJUKAN" &&
      statement.pekerja.atasanId === user.employeeId
    ) {
      return { canApprove: true, stage: 1 };
    }
    return {
      canApprove: false,
      reason: "ATASAN can only approve DIAJUKAN status for subordinates",
    };
  }

  // ADMIN_TI can approve stage 2 (DISETUJUI_ATASAN)
  if (user.role === "ADMIN_TI") {
    if (statement.status === "DISETUJUI_ATASAN") {
      return { canApprove: true, stage: 2 };
    }
    return {
      canApprove: false,
      reason: "ADMIN_TI can only approve DISETUJUI_ATASAN status",
    };
  }

  // SUPER_ADMIN can approve both stage 1 and stage 2
  if (user.role === "SUPER_ADMIN") {
    if (statement.status === "DIAJUKAN") {
      return { canApprove: true, stage: 1 };
    }
    if (statement.status === "DISETUJUI_ATASAN") {
      return { canApprove: true, stage: 2 };
    }
    return {
      canApprove: false,
      reason:
        "SUPER_ADMIN can only approve DIAJUKAN or DISETUJUI_ATASAN status",
    };
  }

  return { canApprove: false, reason: "Unknown role" };
}
