import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Email Address
            </label>
            <Input type="email" placeholder="student@example.edu" />
          </div>
          <Button className="w-full">
            Continue with Email
          </Button>
          <p className="text-center text-xs text-zinc-500">
            Powered by Supabase Auth with Row Level Security.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
