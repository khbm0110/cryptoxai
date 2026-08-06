'use server';

import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { canAppoint, canAssignSupervisorToPlan, canManagePlans, UserRole } from '@/lib/roles';
import { FormState } from './types';

async function getActorRole(): Promise<{ id: string; role: UserRole } | null> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('id, role').eq('id', user.id).single();
  return data as { id: string; role: UserRole } | null;
}

/** Super admin appoints a user as 'admin' (المدير) or 'trade_supervisor' (مشرف). */
export async function appointRoleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const targetUserId = formData.get('userId') as string;
  const newRole = formData.get('role') as UserRole;

  const actor = await getActorRole();
  if (!actor) return { status: 'error', message: 'Not authenticated' };

  const admin = createAdminSupabase();
  const { data: target } = await admin.from('users').select('role').eq('id', targetUserId).single();
  if (!target) return { status: 'error', message: 'Target user not found' };

  if (!canAppoint(actor.role, newRole)) {
    return { status: 'error', message: `Role '${actor.role}' is not authorized to appoint '${newRole}'` };
  }

  const { error: updateError } = await admin
    .from('users')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', targetUserId);
  if (updateError) return { status: 'error', message: 'Could not update the role. Please try again.' };

  // audit trail — every role change is logged, no exceptions
  await admin.from('role_assignments').insert({
    user_id: targetUserId,
    old_role: target.role,
    new_role: newRole,
    assigned_by: actor.id,
  });

  return { status: 'success', message: 'Role updated.' };
}

/** Admin or super_admin assigns a trade_supervisor to oversee a specific plan. */
export async function assignSupervisorToPlanAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const supervisorId = formData.get('supervisorId') as string;
  const planId = formData.get('planId') as string;

  const actor = await getActorRole();
  if (!actor) return { status: 'error', message: 'Not authenticated' };
  if (!canAssignSupervisorToPlan(actor.role)) {
    return { status: 'error', message: `Role '${actor.role}' cannot assign supervisors to plans` };
  }

  const admin = createAdminSupabase();

  const { data: supervisor } = await admin.from('users').select('role').eq('id', supervisorId).single();
  if (!supervisor || supervisor.role !== 'trade_supervisor') {
    return { status: 'error', message: 'Selected user is not a trade supervisor' };
  }

  const { error } = await admin
    .from('supervisor_plan_assignments')
    .upsert(
      { supervisor_id: supervisorId, plan_id: planId, assigned_by: actor.id, active: true },
      { onConflict: 'supervisor_id,plan_id' }
    );
  if (error) return { status: 'error', message: 'Could not save the assignment. Please try again.' };

  return { status: 'success', message: 'Supervisor assigned to plan.' };
}

interface PlanInput {
  slug: string;
  name_en: string;
  name_ar: string;
  price_usdt: number;
  max_exposure_ratio: number;
  order_limit_per_day: number | null;
  min_capital_usdt: number; // the eligibility condition, e.g. 3000 for Basic
  includes_telegram: boolean;
}

/** Create or update a plan. Only admin/super_admin. */
export async function upsertPlan(input: PlanInput, planId?: string) {
  const actor = await getActorRole();
  if (!actor || !canManagePlans(actor.role)) {
    throw new Error('Not authorized to manage plans');
  }

  const admin = createAdminSupabase();
  const payload = { ...input, updated_at: new Date().toISOString() };

  const { error } = planId
    ? await admin.from('plans').update(payload).eq('id', planId)
    : await admin.from('plans').insert(payload);

  if (error) throw error;
  return { success: true };
}
