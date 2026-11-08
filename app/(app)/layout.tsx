import type { ReactNode } from "react";
import { FigmaPortalShell } from "@/components/figma-portal-shell";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  getApprovalQueueScope,
  getVerificationQueueScope,
} from "@/lib/auth/scope";

export const instant = false;

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  const [approvalCount, verificationCount] = await Promise.all([
    prisma.statement.count({ where: getApprovalQueueScope(user) }),
    prisma.statement.count({ where: getVerificationQueueScope(user) }),
  ]);

  return (
    <FigmaPortalShell
      employee={{
        namaLengkap: user.employee.namaLengkap,
        nipp: user.employee.nipp,
        businessArea: user.employee.businessArea.nama,
      }}
      role={user.role}
      pendingCount={approvalCount + verificationCount}>
      {children}
    </FigmaPortalShell>
  );
}
