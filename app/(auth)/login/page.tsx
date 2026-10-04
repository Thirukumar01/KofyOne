import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Sign in to KofyOne</CardTitle>
          <CardDescription>
            Access your saved resources, history, and personalized recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <p className="text-center text-xs text-zinc-500">
            Powered by Supabase Auth with Row Level Security.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
