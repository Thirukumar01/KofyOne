import { Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LoginForm } from './login-form';
import { getSiteBranding } from '@/lib/data/site-branding';
import { BrandingLogo } from '@/components/branding/branding-logo';

export default async function LoginPage() {
  const branding = await getSiteBranding();

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <Card className="shadow-md">
        <CardHeader className="text-center pb-4 space-y-3">
          <div className="flex justify-center">
            <BrandingLogo branding={branding} variant="primary" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold">
            Enter KofyOne
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Sign in with your username and PIN or password to access your personalized resources.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-center text-sm text-zinc-500 py-6">Loading sign-in options…</p>}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
