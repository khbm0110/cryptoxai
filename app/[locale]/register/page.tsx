import RegisterForm from '@/components/auth/RegisterForm';

export default async function RegisterPage({ params }: { params: Promise<{ locale: 'en' | 'ar' }> }) {
  const { locale } = await params;
  return (
    <main style={{ padding: '80px 24px' }}>
      <RegisterForm locale={locale} />
    </main>
  );
}
