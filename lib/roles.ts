export type UserRole = 'super_admin' | 'admin' | 'trade_supervisor' | 'client';

// Order encodes authority. super_admin (المدير العام) is the only role
// allowed to appoint an admin (المدير) or a trade_supervisor.
const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 3,
  admin: 2,
  trade_supervisor: 1,
  client: 0,
};

export function canAppoint(actorRole: UserRole, targetRole: UserRole): boolean {
  // Only super_admin appoints admin or trade_supervisor.
  if (targetRole === 'admin' || targetRole === 'trade_supervisor') {
    return actorRole === 'super_admin';
  }
  // admin and super_admin can both manage clients (e.g. approve/suspend).
  return ROLE_RANK[actorRole] > ROLE_RANK[targetRole];
}

export function canAssignSupervisorToPlan(actorRole: UserRole): boolean {
  // admin or super_admin can assign a trade_supervisor to oversee a plan's signals.
  return actorRole === 'admin' || actorRole === 'super_admin';
}

export function canManagePlans(actorRole: UserRole): boolean {
  return actorRole === 'admin' || actorRole === 'super_admin';
}
