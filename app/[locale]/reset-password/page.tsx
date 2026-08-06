import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export default async function ResetPasswordPage({ params }: { params: Promise<{ locale: 'en' | 'ar' }> }) {
  const { locale } = await params;
  return (
    <main style={{ padding: '80px 24px' }}>
      <ResetPasswordForm locale={locale} />
    </main>
  );
}
