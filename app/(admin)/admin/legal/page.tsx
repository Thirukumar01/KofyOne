import { Metadata } from 'next';
import { AdminHeader } from '@/components/admin/admin-header';
import { getAllAdminPages } from '@/lib/data/site-pages';
import { LegalEditorClient } from './legal-editor-client';

export const metadata: Metadata = {
  title: 'Legal & Site Pages — Admin Portal',
  description: 'Manage, edit, draft, and publish Terms & Conditions, Privacy Policy, About, and Contact content.',
};

export default async function AdminLegalPage() {
  const pages = await getAllAdminPages();

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Legal & Site Pages"
        description="Draft, edit, preview, and publish official Terms & Conditions, Privacy Policy, About, and Contact pages for KofyOne."
      />

      <LegalEditorClient initialPages={pages} />
    </div>
  );
}
