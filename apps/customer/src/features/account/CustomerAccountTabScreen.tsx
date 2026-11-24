import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Compass } from 'lucide-react-native';
import { useAuth, useClerk, useUser } from '@wow/auth';
import { useCurrentUser } from '@wow/api';
import { useTheme, useWowColors, useWowViewport } from '@wow/theme';
import {
  AppButton,
  AppText,
  ConfirmDialog,
  ToastBanner,
} from '@wow/ui';
import { useGuestStore } from '../../state/guest-store';
import { AccountSummaryCard } from './AccountSummaryCard';
import { AccountInformationModal } from './AccountInformationModal';
import { ComplaintsNoticeModal } from './ComplaintsNoticeModal';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { CustomerActivitySection } from './CustomerActivitySection';
import { AccountSettingsSection } from './AccountSettingsSection';
import { PrivacyClosureSection } from './PrivacyClosureSection';
import { GuestAccountView } from './GuestAccountView';
import { resolveAccountStatusSource, type CustomerUserLike } from './account-display';

export interface CustomerAccountTabScreenProps {
  previewMode?: 'live' | 'signed-in' | 'guest' | 'privacy' | 'profile' | 'sign-out';
  syntheticUser?: CustomerUserLike;
  initialNotice?: string | null;
  forcedTheme?: 'light' | 'dark';
}

export function CustomerAccountTabScreen({
  previewMode = 'live',
  syntheticUser,
  initialNotice = null,
  forcedTheme,
}: CustomerAccountTabScreenProps = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useWowColors();
  const { mode, setMode, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const viewport = useWowViewport();
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  useEffect(() => {
    if (forcedTheme && mode !== forcedTheme) {
      setMode(forcedTheme);
    }
  }, [forcedTheme, mode, setMode]);

  // Auth & Session
  const { isSignedIn: realIsSignedIn, userId: realUserId } = useAuth();
  const { user: realUser } = useUser();
  const clerk = useClerk();
  const enterGuest = useGuestStore((s) => s.enterGuest);
  const exitGuest = useGuestStore((s) => s.exitGuest);

  // Profile data from Supabase users table
  const currentUserQuery = useCurrentUser();

  // Determine state based on previewMode or live auth
  const isPreview = __DEV__ && previewMode !== 'live';
  const effectiveIsSignedIn = isPreview
    ? previewMode !== 'guest'
    : Boolean(realIsSignedIn);

  const effectiveUser: CustomerUserLike | null = isPreview
    ? (syntheticUser ?? {
        id: 'usr_preview_synthetic_123',
        fullName: 'عمر أحمد المحمدي',
        firstName: 'عمر',
        lastName: 'المحمدي',
        primaryEmailAddress: {
          emailAddress: 'omar.almohammadi@example.com',
          verification: { status: 'verified' },
        },
        primaryPhoneNumber: {
          phoneNumber: '+967 770 123 456',
        },
      })
    : (realUser as unknown as CustomerUserLike | null);

  // Authoritative account status backed by verified session/profile data
  const accountStatus = isPreview
    ? { status: null, source: 'preview' as const }
    : resolveAccountStatusSource({
        userId: realIsSignedIn ? realUserId : null,
        profile: currentUserQuery.data,
        isPending: currentUserQuery.isPending,
        isError: currentUserQuery.isError,
      });

  // UI state
  const [signingOut, setSigningOut] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(previewMode === 'sign-out');
  const [showProfileModal, setShowProfileModal] = useState(previewMode === 'profile');
  const [showComplaintsModal, setShowComplaintsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(previewMode === 'privacy');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(initialNotice);
  const [noticeTone, setNoticeTone] = useState<'info' | 'warning' | 'danger' | 'success'>('info');

  // Sign out confirmation handler: strictly awaits clerk.signOut() BEFORE enterGuest()
  async function handleConfirmSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      // 1. Perform Clerk signOut first. Do NOT transition to guest before signOut succeeds.
      await clerk.signOut();
      // 2. Only after signOut succeeds, transition into guest mode to preserve public browsing
      enterGuest();
      setShowSignOutConfirm(false);
      setNoticeTone('info');
      setNoticeMessage('تم تسجيل الخروج بنجاح. يمكنك مواصلة التصفح كضيف.');
    } catch (err) {
      console.error('Customer sign out error:', err);
      setShowSignOutConfirm(false);
      setNoticeTone('danger');
      setNoticeMessage('تعذر تسجيل الخروج في الوقت الحالي. يرجى إعادة المحاولة.');
    } finally {
      setSigningOut(false);
    }
  }

  function handleExitGuest() {
    exitGuest();
    router.replace('/access');
  }

  function handleExploreNavigation() {
    router.push('/');
  }

  function handleFavoritesNavigation() {
    router.push('/(tabs)/favorites');
  }

  function handleComplaintsNavigation() {
    router.push('/complaints');
  }

  function handleRatingsNavigation() {
    router.push('/ratings');
  }


  // Responsive container width: max 640px centered for desktop, 100% for mobile
  const contentMaxWidth = Math.min(viewport.width - 32, 640);

  return (
    <View
      {...rtlWebProps}
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Math.max(insets.top, 14),
      }}
    >
      {/* Top Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
          width: '100%',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: contentMaxWidth,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Title on the right in RTL */}
          <AppText
            variant="heading"
            style={{
              fontSize: 20,
              fontWeight: '900',
              color: colors.foreground,
              textAlign: 'right',
            }}
          >
            حسابي
          </AppText>

          {/* Explore shortcut link on the left in RTL */}
          <Pressable
            onPress={handleExploreNavigation}
            accessibilityRole="button"
            accessibilityLabel="الذهاب إلى صفحة الاستكشاف"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              minHeight: 48,
              minWidth: 48,
              paddingHorizontal: 8,
              borderRadius: 8,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Compass size={16} color={colors.mutedForeground} strokeWidth={2} />
            <AppText
              variant="caption"
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: colors.mutedForeground,
              }}
            >
              استكشف
            </AppText>
            <ChevronLeft size={14} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 20,
          paddingBottom: Math.max(insets.bottom + 24, 40),
        }}
      >
        <View style={{ width: '100%', maxWidth: contentMaxWidth, gap: 20 }}>
          {/* Notification banner if present */}
          <ToastBanner
            visible={Boolean(noticeMessage)}
            message={noticeMessage ?? ''}
            tone={noticeTone}
            onDismiss={() => setNoticeMessage(null)}
          />

          {effectiveIsSignedIn ? (
            /* ==========================================================
               AUTHENTICATED ACCOUNT VIEW (CUS-06)
               Information Hierarchy:
               1. Account Summary & Info (FIRST)
               2. Customer Activity
               3. Account Settings
               4. Privacy & Closure Information
               5. Session & Sign Out
               ========================================================== */
            <>
              {/* Section 1: Account Information & Summary (FIRST) */}
              <View style={{ gap: 10, width: '100%' }}>
                <AppText
                  variant="heading"
                  style={{
                    fontSize: 16,
                    fontWeight: '800',
                    color: colors.foreground,
                    textAlign: 'right',
                    paddingHorizontal: 4,
                  }}
                >
                  معلومات الحساب
                </AppText>

                <AccountSummaryCard
                  user={effectiveUser}
                  accountStatus={accountStatus.status}
                  accountStatusSource={accountStatus.source}
                  onPressViewProfile={() => setShowProfileModal(true)}
                />
              </View>

              {/* Section 2: Customer Activity ("نشاطي") */}
              <CustomerActivitySection
                onPressComplaints={handleComplaintsNavigation}
                onPressFavorites={handleFavoritesNavigation}
                onPressRatings={handleRatingsNavigation}
              />

              {/* Section 3: Account Settings ("إعدادات الحساب") */}
              <AccountSettingsSection />

              {/* Section 4: Privacy Requests & Account Closure near the end */}
              <PrivacyClosureSection
                onPressViewPolicy={() => setShowPrivacyModal(true)}
                requestsEnabled={!isPreview && accountStatus.source === 'verified' && accountStatus.status === 'active'}
              />

              {/* Section 5: Session & Sign Out */}
              <View style={{ gap: 10, width: '100%', marginTop: 8 }}>
                <AppText
                  variant="heading"
                  style={{
                    fontSize: 16,
                    fontWeight: '800',
                    color: colors.foreground,
                    textAlign: 'right',
                    paddingHorizontal: 4,
                  }}
                >
                  الجلسة
                </AppText>

                <AppButton
                  title="تسجيل الخروج"
                  variant="outline"
                  onPress={() => setShowSignOutConfirm(true)}
                  disabled={signingOut}
                  style={{
                    height: 50,
                    borderRadius: 25,
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FCA5A5',
                  }}
                />
              </View>
            </>
          ) : (
            /* ==========================================================
               GUEST ACCOUNT STATE (CUS-06-S02)
               ========================================================== */
            <GuestAccountView
              onPressSignIn={() => router.push('/sign-in')}
              onPressExplore={handleExploreNavigation}
              onPressExitGuest={handleExitGuest}
            />
          )}
        </View>
      </ScrollView>

      {/* Account Details Modal (View permitted fields) */}
      <AccountInformationModal
        visible={showProfileModal}
        user={effectiveUser}
        accountStatus={accountStatus.status}
                  accountStatusSource={accountStatus.source}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Complaints Notice Modal (CUS-08 Development state notice) */}
      <ComplaintsNoticeModal
        visible={showComplaintsModal}
        onClose={() => setShowComplaintsModal(false)}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />

      {/* Sign Out Confirmation Dialog */}
      <ConfirmDialog
        visible={showSignOutConfirm}
        title="تأكيد تسجيل الخروج"
        description="هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟ يمكنك مواصلة التصفح كضيف دون أن تفقد قدرتك على استكشاف العروض والمتاجر."
        confirmLabel="نعم، تسجيل الخروج"
        cancelLabel="إلغاء"
        destructive
        busy={signingOut}
        onConfirm={handleConfirmSignOut}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </View>
  );
}
