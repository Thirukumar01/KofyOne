'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  User,
  Palette,
  Clock,
  Shield,
  Check,
  Sparkles,
  Bookmark,
  Trash2,
  RefreshCw,
  KeyRound,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { PRESET_AVATARS } from '@/config/avatars';
import { PresetAvatar } from '@/components/common/preset-avatar';
import { ThemeSelectorCards, useTheme } from '@/components/common/theme-provider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PREDEFINED_SECURITY_QUESTIONS } from '@/lib/auth/security-questions';
import { validatePassword } from '@/lib/auth/password';
import type { UserProfile } from '@/types/user';

type SettingsTab = 'profile' | 'appearance' | 'activity' | 'security';

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get('tab') as SettingsTab) || 'profile';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  const { theme } = useTheme();

  // Profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states - Profile
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState('avatar-student-1');
  const [bio, setBio] = useState('');
  const [roleFocus, setRoleFocus] = useState<'student' | 'developer' | 'educator'>('student');
  const [preferredPlatform, setPreferredPlatform] = useState('microsoft');

  // Form states - Appearance & Discovery
  const [resourceSort, setResourceSort] = useState<'featured' | 'popular' | 'newest'>('featured');
  const [cardLayout, setCardLayout] = useState<'comfortable' | 'compact'>('comfortable');

  // Activity stats
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [recentCount, setRecentCount] = useState(0);

  // Action states
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefMessage, setPrefMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Clearing history/favorites
  const [clearingFavorites, setClearingFavorites] = useState(false);
  const [clearingRecent, setClearingRecent] = useState(false);
  const [activityNotice, setActivityNotice] = useState<string | null>(null);

  // Security - Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Security - Recovery Question
  const [secQuestionId, setSecQuestionId] = useState(PREDEFINED_SECURITY_QUESTIONS[0].id);
  const [secAnswer, setSecAnswer] = useState('');
  const [updatingQuestion, setUpdatingQuestion] = useState(false);
  const [questionStatus, setQuestionStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Security - Delete Account
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) return;
        const data = await res.json();
        if (data.profile) {
          const p = data.profile as UserProfile;
          setProfile(p);
          setDisplayName(p.display_name || p.full_name || '');
          setSelectedAvatarId(p.avatar_url || 'avatar-student-1');
          setBio(p.bio || '');
          setRoleFocus((p.learner_role || p.role_focus || 'student') as 'student' | 'developer' | 'educator');
          setPreferredPlatform(p.preferred_platform || 'microsoft');
          if (p.default_sort) setResourceSort(p.default_sort as typeof resourceSort);
          else if (p.resource_sort_preference) setResourceSort(p.resource_sort_preference as typeof resourceSort);
          if (p.card_density) setCardLayout(p.card_density as typeof cardLayout);
          else if (p.card_layout_preference) setCardLayout(p.card_layout_preference as typeof cardLayout);
        }
        if (data.stats) {
          setFavoritesCount(data.stats.favoritesCount || 0);
          setRecentCount(data.stats.recentCount || 0);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  // Handle Profile Save
  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    if (savingProfile) return;
    setSavingProfile(true);
    setProfileMessage(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          full_name: displayName,
          avatar_url: selectedAvatarId,
          bio,
          learner_role: roleFocus,
          role_focus: roleFocus,
          preferred_platform: preferredPlatform,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');

      setProfileMessage({ type: 'success', text: 'Profile changes saved successfully.' });
      if (profile) {
        setProfile({
          ...profile,
          display_name: displayName,
          full_name: displayName,
          avatar_url: selectedAvatarId,
          bio,
          role_focus: roleFocus,
          learner_role: roleFocus,
          preferred_platform: preferredPlatform,
        });
      }
    } catch (err) {
      setProfileMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error updating profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  }

  // Handle Appearance & Discovery Save
  async function handlePreferencesSave(e: FormEvent) {
    e.preventDefault();
    if (savingPrefs) return;
    setSavingPrefs(true);
    setPrefMessage(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme_preference: theme,
          default_sort: resourceSort,
          resource_sort_preference: resourceSort,
          card_density: cardLayout,
          card_layout_preference: cardLayout,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save preferences');

      setPrefMessage({ type: 'success', text: 'Preferences updated and applied.' });
      if (profile) {
        setProfile({
          ...profile,
          theme_preference: theme,
          default_sort: resourceSort,
          resource_sort_preference: resourceSort,
          card_density: cardLayout,
          card_layout_preference: cardLayout,
        });
      }
    } catch (err) {
      setPrefMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update preferences.',
      });
    } finally {
      setSavingPrefs(false);
    }
  }

  // Clear Favorites
  async function handleClearFavorites() {
    if (!window.confirm('Are you sure you want to remove all saved favorites?')) return;
    setClearingFavorites(true);
    setActivityNotice(null);
    try {
      const res = await fetch('/api/personalization/favorites/clear', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to clear favorites');
      setFavoritesCount(0);
      setActivityNotice('All saved favorites have been cleared.');
    } catch {
      setActivityNotice('Could not clear favorites. Please try again.');
    } finally {
      setClearingFavorites(false);
    }
  }

  // Clear Recent Views
  async function handleClearRecent() {
    if (!window.confirm('Are you sure you want to clear your recently viewed history?')) return;
    setClearingRecent(true);
    setActivityNotice(null);
    try {
      const res = await fetch('/api/personalization/recent/clear', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to clear history');
      setRecentCount(0);
      setActivityNotice('Recently viewed history has been cleared.');
    } catch {
      setActivityNotice('Could not clear recent history. Please try again.');
    } finally {
      setClearingRecent(false);
    }
  }

  // Password Update
  const pwdStrength = validatePassword(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    if (pwdStrength.errors.length > 0 || !passwordsMatch || updatingPassword) return;
    setUpdatingPassword(true);
    setPasswordStatus(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      setPasswordStatus({ type: 'success', text: 'Password has been updated successfully.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update password.',
      });
    } finally {
      setUpdatingPassword(false);
    }
  }

  // Security Question Update
  async function handleSecurityQuestionChange(e: FormEvent) {
    e.preventDefault();
    if (!secAnswer.trim() || updatingQuestion) return;
    setUpdatingQuestion(true);
    setQuestionStatus(null);

    try {
      const res = await fetch('/api/auth/security-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: secQuestionId, answer: secAnswer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update security question');

      setQuestionStatus({ type: 'success', text: 'Security recovery question updated.' });
      setSecAnswer('');
    } catch (err) {
      setQuestionStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update security question.',
      });
    } finally {
      setUpdatingQuestion(false);
    }
  }

  // Delete Account
  async function handleDeleteAccount(e: FormEvent) {
    e.preventDefault();
    if (deleteConfirmation !== 'DELETE' || deleting) return;
    setDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation: deleteConfirmation,
          password: deletePassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');

      window.location.assign(data.redirect || '/account-deleted');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error deleting account.');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center text-sm text-zinc-500">
        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#B94A50] dark:text-[#D98C91]" />
        Loading settings…
      </div>
    );
  }

  const usernameDisplay = profile?.username
    ? `@${profile.username}`
    : profile?.email
    ? `@${profile.email.split('@')[0]}`
    : '@student';

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
      {/* Page Title & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
          <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-zinc-700 dark:text-zinc-300 font-medium">User Settings</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <PresetAvatar avatarId={selectedAvatarId} size={48} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                User Settings Hub
                <Badge variant={profile?.role === 'admin' ? 'default' : 'secondary'} className="capitalize text-xs">
                  {profile?.role || 'student'}
                </Badge>
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Manage your identity, curated avatar, appearance tokens, and account privacy.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 font-mono text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {usernameDisplay}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-[#B94A50] text-[#B94A50] dark:border-[#D98C91] dark:text-[#D98C91]'
              : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          <User className="h-4 w-4" />
          Profile & Avatar
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'appearance'
              ? 'border-[#B94A50] text-[#B94A50] dark:border-[#D98C91] dark:text-[#D98C91]'
              : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          <Palette className="h-4 w-4" />
          Appearance & Discovery
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'activity'
              ? 'border-[#B94A50] text-[#B94A50] dark:border-[#D98C91] dark:text-[#D98C91]'
              : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          <Clock className="h-4 w-4" />
          Activity & Privacy
          {(favoritesCount > 0 || recentCount > 0) && (
            <span className="ml-1 rounded-full bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.2 text-[10px] font-bold">
              {favoritesCount + recentCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-[#B94A50] text-[#B94A50] dark:border-[#D98C91] dark:text-[#D98C91]'
              : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          <Shield className="h-4 w-4" />
          Security & Account
        </button>
      </div>

      {/* TAB 1: Profile & Preset Avatars */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#B94A50] dark:text-[#D98C91]" />
                Select Curated Preset Avatar
              </CardTitle>
              <CardDescription className="text-xs">
                Choose one of 6 official badges for your profile. External photo uploads and URLs are disabled for clean platform safety.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PRESET_AVATARS.map((avatar) => {
                  const isSelected = selectedAvatarId === avatar.id;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setSelectedAvatarId(avatar.id)}
                      className={`relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#B94A50] bg-[#FCECEB] dark:bg-[rgba(217,140,145,0.15)] shadow-xs ring-2 ring-[#B94A50] dark:ring-[#D98C91]'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                      }`}
                    >
                      <PresetAvatar avatarId={avatar.id} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {avatar.name}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                          {avatar.title}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#B94A50] text-white">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="text-base">Profile Details</CardTitle>
              <CardDescription className="text-xs">
                Public learner information displayed across KofyOne.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="display-name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Display Name
                    </label>
                    <Input
                      id="display-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Alex Johnson"
                      disabled={savingProfile}
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Username (Immutable)
                    </label>
                    <div className="flex h-10 items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 font-mono text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                      {usernameDisplay}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="bio" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Short Bio / Headline
                  </label>
                  <Input
                    id="bio"
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="e.g. CS Undergrad | Cloud & AI Enthusiast"
                    disabled={savingProfile}
                    maxLength={300}
                  />
                  <p className="text-[11px] text-zinc-400">
                    Brief snapshot of your academic or development journey (max 300 characters).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="role-focus" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Primary Learner Role / Stage
                    </label>
                    <select
                      id="role-focus"
                      value={roleFocus}
                      onChange={(e) => setRoleFocus(e.target.value as 'student' | 'developer' | 'educator')}
                      disabled={savingProfile}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="student">Student (University / High School)</option>
                      <option value="developer">Developer (Aspiring / Professional)</option>
                      <option value="educator">Educator (Instructor / Mentor)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="platform-pref" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Primary Ecosystem Focus
                    </label>
                    <select
                      id="platform-pref"
                      value={preferredPlatform}
                      onChange={(e) => setPreferredPlatform(e.target.value)}
                      disabled={savingProfile}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="microsoft">Microsoft (Azure, Learn, AI, Developer)</option>
                      <option value="aws">AWS (Amazon Web Services)</option>
                      <option value="google">Google Cloud & Workspace</option>
                      <option value="all">All Ecosystems</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <Button disabled={savingProfile}>
                    {savingProfile ? 'Saving Changes…' : 'Save Profile Changes'}
                  </Button>
                </div>

                {profileMessage && (
                  <p
                    role={profileMessage.type === 'error' ? 'alert' : 'status'}
                    className={`rounded-lg p-3 text-xs ${
                      profileMessage.type === 'error'
                        ? 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200'
                        : 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200'
                    }`}
                  >
                    {profileMessage.text}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: Appearance & Discovery Preferences */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4 text-[#B94A50] dark:text-[#D98C91]" />
                Theme Engine & Color Scheme
              </CardTitle>
              <CardDescription className="text-xs">
                Switch instantly between Dark Mode, Light (White) Mode, and System synchronization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ThemeSelectorCards />
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="text-base">Resource Discovery Preferences</CardTitle>
              <CardDescription className="text-xs">
                Customize how catalog resources are sorted and formatted for your device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePreferencesSave} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                    Default Resource Sort Order
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'featured', label: 'Featured First', desc: 'Curated ambassador highlights' },
                      { id: 'popular', label: 'Most Popular', desc: 'Highest views and link clicks' },
                      { id: 'newest', label: 'Newest Releases', desc: 'Recently added learning assets' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setResourceSort(opt.id as typeof resourceSort)}
                        className={`p-3 rounded-xl border text-left text-xs transition-all ${
                          resourceSort === opt.id
                            ? 'border-[#B94A50] bg-[#FCECEB] dark:bg-[rgba(217,140,145,0.15)] ring-1 ring-[#B94A50] dark:ring-[#D98C91] font-medium'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                        }`}
                      >
                        <span className="font-semibold block text-zinc-900 dark:text-zinc-100">{opt.label}</span>
                        <span className="text-[11px] text-zinc-500">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                    Card Density Layout
                  </label>
                  <div className="grid grid-cols-2 gap-3 max-w-md">
                    <button
                      type="button"
                      onClick={() => setCardLayout('comfortable')}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        cardLayout === 'comfortable'
                          ? 'border-[#B94A50] bg-[#FCECEB] dark:bg-[rgba(217,140,145,0.15)] ring-1 ring-[#B94A50] dark:ring-[#D98C91] font-medium'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                      }`}
                    >
                      <span className="font-semibold block text-zinc-900 dark:text-zinc-100">Comfortable</span>
                      <span className="text-[11px] text-zinc-500">Spacious cards with full previews</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardLayout('compact')}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        cardLayout === 'compact'
                          ? 'border-[#B94A50] bg-[#FCECEB] dark:bg-[rgba(217,140,145,0.15)] ring-1 ring-[#B94A50] dark:ring-[#D98C91] font-medium'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                      }`}
                    >
                      <span className="font-semibold block text-zinc-900 dark:text-zinc-100">Compact</span>
                      <span className="text-[11px] text-zinc-500">Condensed rows for fast scanning</span>
                    </button>
                  </div>
                </div>

                <Button disabled={savingPrefs}>
                  {savingPrefs ? 'Saving Preferences…' : 'Save Appearance Preferences'}
                </Button>

                {prefMessage && (
                  <p
                    role={prefMessage.type === 'error' ? 'alert' : 'status'}
                    className={`rounded-lg p-3 text-xs ${
                      prefMessage.type === 'error'
                        ? 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200'
                        : 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200'
                    }`}
                  >
                    {prefMessage.text}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Activity & Privacy */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Saved Bookmarks</CardDescription>
                <CardTitle className="text-2xl font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Bookmark className="h-5 w-5 text-[#B94A50] dark:text-[#D98C91]" />
                    {favoritesCount} Favorites
                  </span>
                  <Link href="/favorites">
                    <Button variant="outline" size="sm" className="text-xs">
                      View
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFavorites}
                  disabled={clearingFavorites || favoritesCount === 0}
                  className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Clear All Favorites
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Browsing History</CardDescription>
                <CardTitle className="text-2xl font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    {recentCount} Viewed
                  </span>
                  <Link href="/recent">
                    <Button variant="outline" size="sm" className="text-xs">
                      View
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearRecent}
                  disabled={clearingRecent || recentCount === 0}
                  className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Clear Recently Viewed History
                </Button>
              </CardContent>
            </Card>
          </div>

          {activityNotice && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              {activityNotice}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Security & Account */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Change Password Card */}
          <Card className="shadow-xs">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(185,74,80,0.12)] dark:bg-[rgba(217,140,145,0.15)] text-[#B94A50] dark:text-[#D98C91]">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Change Password / PIN</CardTitle>
                  <CardDescription className="text-xs">
                    Update your access password with complex entropy requirements.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="new-pwd-settings" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      New Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <Input
                    id="new-pwd-settings"
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={updatingPassword}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                  />
                  {newPassword.length > 0 && (
                    <div className="space-y-1.5 pt-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Strength:</span>
                        <span className={`font-semibold ${pwdStrength.color.split(' ')[0]}`}>
                          {pwdStrength.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 h-1.5">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={`rounded-full transition-colors ${
                              pwdStrength.score >= step
                                ? pwdStrength.color.split(' ')[1]
                                : 'bg-zinc-200 dark:bg-zinc-800'
                            }`}
                          />
                        ))}
                      </div>
                      {pwdStrength.errors.length > 0 && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          • {pwdStrength.errors[0]}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm-pwd-settings" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Confirm New Password
                  </label>
                  <Input
                    id="confirm-pwd-settings"
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={updatingPassword}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                  />
                </div>

                <Button
                  disabled={updatingPassword || pwdStrength.errors.length > 0 || !passwordsMatch}
                >
                  {updatingPassword ? 'Updating Password…' : 'Update Password'}
                </Button>

                {passwordStatus && (
                  <p
                    role={passwordStatus.type === 'error' ? 'alert' : 'status'}
                    className={`rounded-lg p-3 text-xs ${
                      passwordStatus.type === 'error'
                        ? 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200'
                        : 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200'
                    }`}
                  >
                    {passwordStatus.text}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Security Recovery Questions Card */}
          <Card className="shadow-xs">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Security Recovery Question</CardTitle>
                  <CardDescription className="text-xs">
                    Cryptographically salted with bcrypt for self-service password recovery without email dependencies.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSecurityQuestionChange} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="sec-question" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Select Predefined Question
                  </label>
                  <select
                    id="sec-question"
                    value={secQuestionId}
                    onChange={(e) => setSecQuestionId(e.target.value)}
                    disabled={updatingQuestion}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
                  >
                    {PREDEFINED_SECURITY_QUESTIONS.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="sec-answer" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Your Recovery Answer
                  </label>
                  <Input
                    id="sec-answer"
                    type="text"
                    value={secAnswer}
                    onChange={(e) => setSecAnswer(e.target.value)}
                    placeholder="Enter your confidential answer"
                    disabled={updatingQuestion}
                    required
                  />
                  <p className="text-[11px] text-zinc-400">
                    Answers are normalized (case-insensitive) and hashed using 12 bcrypt rounds.
                  </p>
                </div>

                <Button disabled={updatingQuestion || secAnswer.trim().length < 2}>
                  {updatingQuestion ? 'Saving…' : 'Update Security Question'}
                </Button>

                {questionStatus && (
                  <p
                    role={questionStatus.type === 'error' ? 'alert' : 'status'}
                    className={`rounded-lg p-3 text-xs ${
                      questionStatus.type === 'error'
                        ? 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200'
                        : 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200'
                    }`}
                  >
                    {questionStatus.text}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone: Delete Account */}
          <Card className="border-red-200 dark:border-red-950/60 shadow-xs">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base text-red-600 dark:text-red-400">
                    Danger Zone: Delete Account
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Permanently delete your KofyOne account, favorites, and profile data.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-4 mb-4 text-xs text-red-800 dark:text-red-200 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-red-900 dark:text-red-100">
                  <AlertTriangle className="h-4 w-4" />
                  This action is permanent and cannot be undone.
                </div>
                <p>
                  Deleting your account will remove your saved bookmarks, history, and profile data from our servers.
                </p>
              </div>

              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="delete-pwd-settings" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Current Password (Optional Verification)
                  </label>
                  <Input
                    id="delete-pwd-settings"
                    type="password"
                    disabled={deleting}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter current password if set"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm-delete-input" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Type <span className="font-bold text-red-600 dark:text-red-400">DELETE</span> to confirm
                  </label>
                  <Input
                    id="confirm-delete-input"
                    type="text"
                    required
                    disabled={deleting}
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE"
                  />
                </div>

                <Button
                  variant="destructive"
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  disabled={deleting || deleteConfirmation !== 'DELETE'}
                >
                  {deleting ? 'Deleting account…' : 'Permanently Delete Account'}
                </Button>

                {deleteError && (
                  <p
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                  >
                    {deleteError}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-20 text-center text-sm text-zinc-500">Loading settings…</div>}>
      <SettingsContent />
    </Suspense>
  );
}
