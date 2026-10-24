/**
 * KofyOne - Account Deleted Confirmation Page
 */

import Link from 'next/link';
import { CheckCircle2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function AccountDeletedPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20">
      <Card className="text-center shadow-md">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Account Deleted
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            Your KofyOne account and associated personal data have been removed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Thank you for being part of KofyOne. You can browse all public learning tracks and Microsoft resources anytime without an account.
          </p>

          <Link href="/">
            <Button variant="primary" className="w-full inline-flex items-center justify-center gap-2">
              <Home className="h-4 w-4" />
              Return to Homepage
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
