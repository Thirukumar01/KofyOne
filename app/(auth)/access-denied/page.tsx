/**
 * KofyOne - Access Denied (HTTP 403) Page
 */

import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col justify-center px-4 py-20">
      <Card className="border-red-200 dark:border-red-950/50 shadow-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Access Denied (403)
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            You do not have permission to access the requested administrative resource.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 p-4 text-xs text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 text-left space-y-1.5">
            <p className="font-semibold text-zinc-800 dark:text-zinc-200">
              Why am I seeing this?
            </p>
            <p>
              The area you attempted to visit requires an assigned <span className="font-semibold text-orange-600 dark:text-orange-400">admin</span> role in the KofyOne system.
            </p>
            <p>
              If you are a member of the administration team, ensure your user UUID is granted administrator authorization in the database.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button variant="outline" className="w-full sm:w-auto inline-flex items-center gap-2">
                <Home className="h-4 w-4" />
                Return to Home
              </Button>
            </Link>
            <Link href="/resources">
              <Button variant="primary" className="w-full sm:w-auto inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Explore Catalog
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
