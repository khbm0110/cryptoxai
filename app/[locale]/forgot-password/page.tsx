import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: 'en' | 'ar' }> }) {
  const { locale } = await params;
  return (
    <main style={{ padding: '80px 24px' }}>
      <ForgotPasswordForm locale={locale} />
    </main>
  );
}
