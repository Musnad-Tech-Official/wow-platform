import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  RotateCw,
  ShieldAlert,
} from 'lucide-react-native';
import { useAuth } from '@wow/auth';
import { useTheme, useWowColors } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';
import {
  useMyComplaint,
  ComplaintLookupCeilingError,
  type CustomerComplaint,
} from '@wow/api';
import { wowIllustrations } from '@wow/assets';
import { ComplaintSummaryCard } from './ComplaintSummaryCard';
import { ComplaintDescriptionCard } from './ComplaintDescriptionCard';
import { ComplaintTimeline } from './ComplaintTimeline';
import { ComplaintOutcomeCard } from './ComplaintOutcomeCard';
import { ComplaintPrivacyNotice } from './ComplaintPrivacyNotice';
import { ComplaintEvidenceUpload } from './ComplaintEvidenceUpload';
import {
  FIXTURE_COMPLAINT_CLOSED_NO_OUTCOME,
  FIXTURE_COMPLAINT_CLOSED_WITH_OUTCOME,
  FIXTURE_COMPLAINT_INVESTIGATING,
  FIXTURE_COMPLAINT_LONG_DESCRIPTION,
  FIXTURE_COMPLAINT_NEW,
  FIXTURE_COMPLAINT_NO_UPDATES,
  FIXTURE_COMPLAINT_WAITING,
  FIXTURE_COMPLAINT_WITH_UPDATES,
  isValidComplaintUuid,
  resolveComplaintFixture,
} from './complaints-list-display';

export type ComplaintDetailsPreviewMode =
  | 'live'
  | 'new'
  | 'investigating'
  | 'waiting'
  | 'closed'
  | 'closed_no_outcome'
  | 'with_updates'
  | 'no_updates'
  | 'guest'
  | 'auth_loading'
  | 'loading'
  | 'error'
  | 'not_found'
  | 'lookup_limit'
  | 'invalid_id'
  | 'long_description';

export interface CustomerComplaintDetailsScreenProps {
  complaintId?: string | null;
  previewMode?: ComplaintDetailsPreviewMode;
  initialComplaintOverride?: CustomerComplaint | null;
}

export function CustomerComplaintDetailsScreen({
  complaintId,
  previewMode = 'live',
  initialComplaintOverride,
}: CustomerComplaintDetailsScreenProps) {
  const router = useRouter();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Development-only preview isolation
  const isPreview = __DEV__ && (previewMode !== 'live' || Boolean(initialComplaintOverride));

  // UUID Validation
  const isValidUuid = Boolean(complaintId && isValidComplaintUuid(complaintId));

  // Authorized Query via TanStack Query and Clerk session
  const realQuery = useMyComplaint(complaintId);

  // Safe Back Navigation
  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/complaints');
    }
  }, [router]);

  // Navigate to Sign In
  const handleSignIn = useCallback(() => {
    router.push('/sign-in');
  }, [router]);

  // Safe Refresh Handler
  const handleRefresh = useCallback(async () => {
    if (isPreview) {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 500);
      return;
    }
    setIsRefreshing(true);
    try {
      await realQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [isPreview, realQuery]);

  // ---------------------------------------------------------------------------
  // 1. Resolve Active Complaint Data
  // ---------------------------------------------------------------------------
  let activeComplaint: CustomerComplaint | null = null;

  if (isPreview) {
    if (initialComplaintOverride) {
      activeComplaint = initialComplaintOverride;
    } else {
      switch (previewMode) {
        case 'new':
          activeComplaint = FIXTURE_COMPLAINT_NEW;
          break;
        case 'no_updates':
          activeComplaint = FIXTURE_COMPLAINT_NO_UPDATES;
          break;
        case 'investigating':
          activeComplaint = FIXTURE_COMPLAINT_INVESTIGATING;
          break;
        case 'waiting':
          activeComplaint = FIXTURE_COMPLAINT_WAITING;
          break;
        case 'closed':
          activeComplaint = FIXTURE_COMPLAINT_CLOSED_WITH_OUTCOME;
          break;
        case 'closed_no_outcome':
          activeComplaint = FIXTURE_COMPLAINT_CLOSED_NO_OUTCOME;
          break;
        case 'with_updates':
          activeComplaint = FIXTURE_COMPLAINT_WITH_UPDATES;
          break;
        case 'long_description':
          activeComplaint = FIXTURE_COMPLAINT_LONG_DESCRIPTION;
          break;
        default:
          activeComplaint = complaintId ? resolveComplaintFixture(complaintId) : null;
          break;
      }
    }
  } else {
    activeComplaint = (realQuery.data as CustomerComplaint) ?? null;
  }

  // ---------------------------------------------------------------------------
  // Top Header Bar
  // ---------------------------------------------------------------------------
  const renderHeader = () => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 48,
        width: '100%',
        paddingVertical: 6,
      }}
    >
      {/* Back button (RTL arrow pointing right in Arabic) */}
      <Pressable
        onPress={handleBack}
        accessibilityRole="button"
        accessibilityLabel="العودة إلى شكاواي"
        accessibilityHint="يرجع إلى قائمة الشكاوى"
        style={({ pressed }) => ({
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: pressed
            ? isDark
              ? '#2C2C2E'
              : '#E2E8F0'
            : isDark
              ? '#1C1C1E'
              : '#F1F5F9',
          alignItems: 'center',
          justifyContent: 'center',
          borderColor: colors.border,
          borderWidth: 1,
        })}
      >
        <ArrowRight
          size={20}
          color={colors.foreground}
          strokeWidth={2.2}
          style={{ transform: [{ scaleX: Platform.OS === 'web' ? 1 : -1 }] }}
        />
      </Pressable>

      {/* Screen Title */}
      <AppText
        variant="heading"
        style={{
          fontSize: 18,
          fontWeight: '800',
          color: colors.foreground,
          textAlign: 'center',
        }}
      >
        تفاصيل الشكوى
      </AppText>

      {/* Refresh Button */}
      <Pressable
        onPress={handleRefresh}
        disabled={isRefreshing}
        accessibilityRole="button"
        accessibilityLabel="تحديث تفاصيل الشكوى"
        accessibilityHint="يعيد تحميل أحدث بيانات الشكوى من الخادم"
        style={({ pressed }) => ({
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: pressed
            ? isDark
              ? '#2C2C2E'
              : '#E2E8F0'
            : isDark
              ? '#1C1C1E'
              : '#F1F5F9',
          alignItems: 'center',
          justifyContent: 'center',
          borderColor: colors.border,
          borderWidth: 1,
          opacity: isRefreshing ? 0.6 : 1,
        })}
      >
        <RotateCw
          size={18}
          color={colors.foreground}
          strokeWidth={2.2}
        />
      </Pressable>
    </View>
  );

  // ---------------------------------------------------------------------------
  // State 1: Authentication Initialization
  // ---------------------------------------------------------------------------
  if ((!isAuthLoaded && !isPreview) || previewMode === 'auth_loading') {
    return (
      <View
        {...rtlWebProps}
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <ActivityIndicator size="large" color="#FACC15" />
        <AppText
          style={{
            marginTop: 16,
            fontSize: 14,
            fontWeight: '600',
            color: colors.mutedForeground,
          }}
        >
          جاري التحقق من جلسة الحساب...
        </AppText>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // State 2: Guest / Sign-In Required
  // ---------------------------------------------------------------------------
  if ((!isSignedIn && !isPreview) || previewMode === 'guest') {
    return (
      <View
        {...rtlWebProps}
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            alignItems: 'center',
            paddingBottom: 48,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 640,
              paddingHorizontal: 16,
              paddingTop: Platform.OS === 'web' ? 24 : 16,
              gap: 20,
            }}
          >
            {renderHeader()}

            <View
              style={{
                alignItems: 'center',
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 20,
                padding: 28,
                gap: 16,
                marginTop: 20,
              }}
            >
              <Image
                source={wowIllustrations.customer.secureAccess}
                style={{
                  width: 140,
                  height: 140,
                  resizeMode: 'contain',
                }}
                accessibilityLabel="رسم توضيحي لتسجيل الدخول الآمن"
              />

              <AppText
                variant="heading"
                style={{
                  fontSize: 19,
                  fontWeight: '800',
                  color: colors.foreground,
                  textAlign: 'center',
                }}
              >
                تسجيل الدخول مطلوب
              </AppText>

              <AppText
                variant="body"
                style={{
                  fontSize: 14,
                  lineHeight: 22,
                  color: colors.mutedForeground,
                  textAlign: 'center',
                  maxWidth: 400,
                }}
              >
                بيانات ومسار متابعة الشكاوى خاصة بحساب صاحب الشكوى فقط. يرجى تسجيل الدخول لعرض تفاصيل هذا البلاغ.
              </AppText>

              <View style={{ width: '100%', maxWidth: 320, gap: 12, marginTop: 8 }}>
                <AppButton
                  title="تسجيل الدخول"
                  variant="primary"
                  onPress={handleSignIn}
                  style={{ minHeight: 48, borderRadius: 12 }}
                />
                <AppButton
                  title="العودة إلى الاستكشاف"
                  variant="secondary"
                  onPress={() => router.replace('/discover')}
                  style={{ minHeight: 48, borderRadius: 12 }}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // State 3: Invalid Complaint UUID
  // ---------------------------------------------------------------------------
  if ((!isValidUuid && !isPreview) || previewMode === 'invalid_id') {
    return (
      <View
        {...rtlWebProps}
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            alignItems: 'center',
            paddingBottom: 48,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 640,
              paddingHorizontal: 16,
              paddingTop: Platform.OS === 'web' ? 24 : 16,
              gap: 20,
            }}
          >
            {renderHeader()}

            <View
              style={{
                alignItems: 'center',
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
                borderWidth: 1,
                borderRadius: 20,
                padding: 28,
                gap: 16,
                marginTop: 20,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldAlert size={28} color="#EF4444" strokeWidth={2.2} />
              </View>

              <AppText
                variant="heading"
                style={{
                  fontSize: 18,
                  fontWeight: '800',
                  color: colors.foreground,
                  textAlign: 'center',
                }}
              >
                معرّف الشكوى غير صالح
              </AppText>

              <AppText
                variant="body"
                style={{
                  fontSize: 14,
                  lineHeight: 22,
                  color: colors.mutedForeground,
                  textAlign: 'center',
                  maxWidth: 420,
                }}
              >
                الرابط المطلوب لا يحتوي على معرّف شكوى بتنسيق UUID سليم. يرجى التأكد من الرابط أو فتح الشكوى من قائمة شكاواك.
              </AppText>

              <AppButton
                title="العودة إلى شكاواي"
                variant="primary"
                onPress={handleBack}
                style={{ minHeight: 48, borderRadius: 12, minWidth: 200, marginTop: 8 }}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // State 4: Loading Skeleton
  // ---------------------------------------------------------------------------
  const isLoading =
    previewMode === 'loading' ||
    (!isPreview && realQuery.isLoading && !activeComplaint);

  if (isLoading) {
    return (
      <View
        {...rtlWebProps}
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            alignItems: 'center',
            paddingBottom: 48,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 640,
              paddingHorizontal: 16,
              paddingTop: Platform.OS === 'web' ? 24 : 16,
              gap: 16,
            }}
          >
            {renderHeader()}

            {/* Skeleton Card 1: Summary */}
            <View
              style={{
                width: '100%',
                height: 220,
                borderRadius: 18,
                backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9',
                borderColor: colors.border,
                borderWidth: 1,
                padding: 20,
                gap: 14,
                justifyContent: 'center',
              }}
            >
              <ActivityIndicator size="small" color="#FACC15" />
              <AppText
                style={{
                  fontSize: 13,
                  color: colors.mutedForeground,
                  textAlign: 'center',
                }}
              >
                جاري تحميل تفاصيل الشكوى ومسار المتابعة...
              </AppText>
            </View>

            {/* Skeleton Card 2: Description */}
            <View
              style={{
                width: '100%',
                height: 120,
                borderRadius: 18,
                backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9',
                borderColor: colors.border,
                borderWidth: 1,
              }}
            />

            {/* Skeleton Card 3: Timeline */}
            <View
              style={{
                width: '100%',
                height: 160,
                borderRadius: 18,
                backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9',
                borderColor: colors.border,
                borderWidth: 1,
              }}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // State 5: Lookup Ceiling / Indeterminate Search State
  // ---------------------------------------------------------------------------
  const isLookupCeiling =
    previewMode === 'lookup_limit' ||
    (!isPreview && realQuery.error instanceof ComplaintLookupCeilingError);

  if (isLookupCeiling) {
    return (
      <View
        {...rtlWebProps}
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            alignItems: 'center',
            paddingBottom: 48,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 640,
              paddingHorizontal: 16,
              paddingTop: Platform.OS === 'web' ? 24 : 16,
              gap: 20,
            }}
          >
            {renderHeader()}

            <View
              style={{
                alignItems: 'center',
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 20,
                padding: 28,
                gap: 16,
                marginTop: 20,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: isDark ? '#3F2D18' : '#FEF3C7',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <HelpCircle size={28} color="#D97706" strokeWidth={2.2} />
              </View>

              <AppText
                variant="heading"
                style={{
                  fontSize: 18,
                  fontWeight: '800',
                  color: colors.foreground,
                  textAlign: 'center',
                }}
              >
                تعذّر استكمال البحث في السجل
              </AppText>

              <AppText
                variant="body"
                style={{
                  fontSize: 14,
                  lineHeight: 22,
                  color: colors.mutedForeground,
                  textAlign: 'center',
                  maxWidth: 420,
                }}
              >
                تم بلوغ السقف الأقصى لصفحات البحث المصرح بها دون إمكانية تأكيد حالة الشكوى بشكل قاطع. يمكنك مراجعة الشكاوى النشطة في قائمتك أو التواصل مع الدعم الفني.
              </AppText>

              <View style={{ width: '100%', maxWidth: 320, gap: 12, marginTop: 8 }}>
                <AppButton
                  title="العودة إلى شكاواي"
                  variant="primary"
                  onPress={handleBack}
                  style={{ minHeight: 48, borderRadius: 12 }}
                />
                <AppButton
                  title="إعادة المحاولة"
                  variant="secondary"
                  onPress={handleRefresh}
                  style={{ minHeight: 48, borderRadius: 12 }}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // State 6: Network Error State
  // ---------------------------------------------------------------------------
  const hasError =
    previewMode === 'error' ||
    (!isPreview && realQuery.isError && !activeComplaint);

  if (hasError) {
    return (
      <View
        {...rtlWebProps}
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            alignItems: 'center',
            paddingBottom: 48,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 640,
              paddingHorizontal: 16,
              paddingTop: Platform.OS === 'web' ? 24 : 16,
              gap: 20,
            }}
          >
            {renderHeader()}

            <View
              style={{
                alignItems: 'center',
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
                borderWidth: 1,
                borderRadius: 20,
                padding: 28,
                gap: 16,
                marginTop: 20,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={28} color="#EF4444" strokeWidth={2.2} />
              </View>

              <AppText
                variant="heading"
                style={{
                  fontSize: 18,
                  fontWeight: '800',
                  color: colors.foreground,
                  textAlign: 'center',
                }}
              >
                تعذّر تحميل تفاصيل الشكوى
              </AppText>

              <AppText
                variant="body"
                style={{
                  fontSize: 14,
                  lineHeight: 22,
                  color: colors.mutedForeground,
                  textAlign: 'center',
                  maxWidth: 400,
                }}
              >
                حدث خطأ في الاتصال أثناء جلب بيانات الشكوى من الخادم. يرجى التحقق من اتصالك بالإنترنت وإعادة المحاولة.
              </AppText>

              <AppButton
                title="إعادة المحاولة"
                variant="primary"
                onPress={handleRefresh}
                style={{ minHeight: 48, borderRadius: 12, minWidth: 180, marginTop: 8 }}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // State 7: Not Found or Inaccessible State
  // ---------------------------------------------------------------------------
  if (!activeComplaint || previewMode === 'not_found') {
    return (
      <View
        {...rtlWebProps}
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            alignItems: 'center',
            paddingBottom: 48,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 640,
              paddingHorizontal: 16,
              paddingTop: Platform.OS === 'web' ? 24 : 16,
              gap: 20,
            }}
          >
            {renderHeader()}

            <View
              style={{
                alignItems: 'center',
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 20,
                padding: 28,
                gap: 16,
                marginTop: 20,
              }}
            >
              <Image
                source={wowIllustrations.customer.complaintsEmpty}
                style={{
                  width: 140,
                  height: 140,
                  resizeMode: 'contain',
                }}
                accessibilityLabel="رسم توضيحي لعدم العثور على الشكوى"
              />

              <AppText
                variant="heading"
                style={{
                  fontSize: 19,
                  fontWeight: '800',
                  color: colors.foreground,
                  textAlign: 'center',
                }}
              >
                الشكوى غير موجودة
              </AppText>

              <AppText
                variant="body"
                style={{
                  fontSize: 14,
                  lineHeight: 22,
                  color: colors.mutedForeground,
                  textAlign: 'center',
                  maxWidth: 420,
                }}
              >
                تعذّر العثور على الشكوى المطلوبة في سجلك. قد تكون الشكوى غير مسجلة بهذا الحساب أو تم حذفها.
              </AppText>

              <AppButton
                title="العودة إلى شكاواي"
                variant="primary"
                onPress={handleBack}
                style={{ minHeight: 48, borderRadius: 12, minWidth: 200, marginTop: 8 }}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // State 7: Main Loaded Complaint View
  // ---------------------------------------------------------------------------
  return (
    <View
      {...rtlWebProps}
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          paddingBottom: 48,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#FACC15"
            colors={['#FACC15']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 640,
            paddingHorizontal: 16,
            paddingTop: Platform.OS === 'web' ? 24 : 16,
            gap: 16,
          }}
        >
          {/* 1. Header Bar */}
          {renderHeader()}

          {/* 2. Case Summary Card */}
          <ComplaintSummaryCard complaint={activeComplaint} />

          {/* 3. Description Card */}
          <ComplaintDescriptionCard description={activeComplaint.description} />

          {!isPreview && isSignedIn && activeComplaint.status !== 'closed' &&
            <ComplaintEvidenceUpload key={activeComplaint.id} complaintId={activeComplaint.id} />}

          {/* 4. Timeline & Updates Card */}
          <ComplaintTimeline complaint={activeComplaint} />

          {/* 5. Outcome Card (Rendered if closed or public outcome exists) */}
          <ComplaintOutcomeCard
            status={activeComplaint.status}
            publicOutcome={activeComplaint.public_outcome}
          />

          {/* 6. Case Actions */}
          <View style={{ width: '100%', gap: 10, marginTop: 4 }}>
            <AppButton
              title="العودة إلى جميع الشكاوى"
              variant="secondary"
              onPress={handleBack}
              style={{ minHeight: 48, borderRadius: 14 }}
            />
          </View>

          {/* 7. Privacy Notice */}
          <ComplaintPrivacyNotice />
        </View>
      </ScrollView>
    </View>
  );
}
