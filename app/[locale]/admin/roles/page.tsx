import { getTranslations } from 'next-intl/server';

import { createAdminSupabase, createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui';
import AppointRoleForm from '@/components/admin/AppointRoleForm';
import AssignSupervisorForm from '@/components/admin/AssignSupervisorForm';

export default async function AdminRolesPage({ params }: { params: Promise<{ locale: 'en' | 'ar' }> }) {
  const { locale } = await params;
  const t = await getTranslations('admin.roles');
  const tr = await getTranslations('roles');

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const admin = createAdminSupabase();
  const { data: me } = await admin.from('users').select('role').eq('id', user.id).single();

  // Only super_admin and admin can view this page at all — enforced server-side,
  // not just hidden in the UI.
  if (!me || (me.role !== 'super_admin' && me.role !== 'admin')) {
    redirect(`/${locale}`);
  }

  const { data: users } = await admin
    .from('users')
    .select('id, email, full_name, role')
    .order('created_at', { ascending: false });

  const { data: plans } = await admin.from('plans').select('id, name_en, name_ar').eq('is_active', true);
  const supervisors = (users ?? []).filter((u: { role: string }) => u.role === 'trade_supervisor');

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ fontSize: 26 }}>{t('title')}</h1>

      <Card style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 17, marginBottom: 16 }}>{t('appoint')}</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'start', fontSize: 12.5, color: 'var(--muted)', paddingBottom: 8 }}>Email</th>
              <th style={{ textAlign: 'start', fontSize: 12.5, color: 'var(--muted)', paddingBottom: 8 }}>Role</th>
              {me.role === 'super_admin' && <th></th>}
            </tr>
          </thead>
          <tbody>
            {users?.map((u: { id: string; email: string; role: string }) => (
              <tr key={u.id} style={{ borderTop: '1px solid var(--hair)' }}>
                <td style={{ padding: '12px 0', fontSize: 14 }}>{u.email}</td>
                <td style={{ fontSize: 14 }}>{tr(u.role as any)}</td>
                {me.role === 'super_admin' && (
                  <td style={{ padding: '8px 0' }}>
                    <AppointRoleForm userId={u.id} currentRole={u.role} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 17, marginBottom: 16 }}>{t('assignSupervisor')}</h2>
        <AssignSupervisorForm
          supervisors={supervisors.map((s) => ({ id: s.id, email: s.email }))}
          plans={(plans ?? []).map((p) => ({ id: p.id, name: locale === 'ar' ? p.name_ar : p.name_en }))}
        />
      </Card>
    </main>
  );
}
