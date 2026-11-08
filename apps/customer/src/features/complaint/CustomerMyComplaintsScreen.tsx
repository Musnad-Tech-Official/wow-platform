import { useCallback, useMemo, useRef, useState } from 'react';
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
  AlertCircle,
  ArrowRight,
  FileSpreadsheet,
  FileText,
  RotateCw,
} from 'lucide-react-native';
import { useAuth } from '@wow/auth';
import {
  getMyComplaints,
  requireWowApiSession,
  useMyComplaints,
  useWowApiContext,
  type CustomerComplaint,
} from '@wow/api';
import { useTheme, useWowColors } from '@wow/theme';
import { wowIllustrations } from '@wow/assets';
import { AppButton, AppText, Skeleton } from '@wow/ui';

import { ComplaintCard } from './ComplaintCard';
import { ComplaintFilterTabs } from './ComplaintFilterTabs';
import { ComplaintDetailsBoundaryModal } from './ComplaintDetailsBoundaryModal';
import {
  FIXTURE_COMPLAINTS,
  deduplicateComplaints,
  filterComplaints,
  sortComplaintsNewestFirst,
  type ComplaintFilter,
} from './complaints-list-display';

const PAGE_SIZE = 10;

export interface CustomerMyComplaintsScreenProps {
  initialAuthOverride?: {
    isLoaded: boolean;
    isSignedIn: boolean;
    userId?: string;
  };
  initialComplaintsOverride?: CustomerComplaint[];
  previewMode?: 'live' | 'populated' | 'empty' | 'guest' | 'loading' | 'auth_loading' | 'error' | 'filtered_empty';
}

export function CustomerMyComplaintsScreen({
  initialAuthOverride,
  initialComplaintsOverride,
  previewMode = 'live',
}: CustomerMyComplaintsScreenProps) {
  const router = useRouter();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  // Auth Context (real Clerk session or test/preview override)
  const realAuth = useAuth();
  const effectiveAuth = initialAuthOverride ?? realAuth;
  const isAuthLoaded = previewMode === 'auth_loading' ? false : effectiveAuth.isLoaded;
  const isSignedIn =
    previewMode === 'guest'
      ? false
      : previewMode !== 'live'
        ? true
        : Boolean(effectiveAuth.isSignedIn);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<ComplaintFilter>(
    previewMode === 'filtered_empty' ? 'closed' : 'all',
  );

  // Modal inspection state
  const [selectedComplaint, setSelectedComplaint] = useState<CustomerComplaint | null>(null);

  // Pagination state
  const [offset, setOffset] = useState<number>(0);
  const [accumulatedComplaints, setAccumulatedComplaints] = useState<CustomerComplaint[]>([]);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [hasMorePages, setHasMorePages] = useState<boolean>(true);
  const isFetchingMoreRef = useRef<boolean>(false);

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Real query via @wow/api session
  const realComplaintsQuery = useMyComplaints({
    limit: PAGE_SIZE,
    offset: 0,
  });

  const apiContext = useWowApiContext();

  // Synthetic / Preview Data Resolution
  const isPreview = previewMode !== 'live' || Boolean(initialComplaintsOverride);

  const initialServerComplaints: CustomerComplaint[] = useMemo(() => {
    if (previewMode === 'empty') return [];
    if (previewMode === 'filtered_empty') {
      // Return only in-progress complaints so 'closed' filter results in 0 items
      return FIXTURE_COMPLAINTS.filter((c) => c.status !== 'closed');
    }
    if (previewMode === 'populated') {
      return [...FIXTURE_COMPLAINTS];
    }
    if (initialComplaintsOverride) {
      return [...initialComplaintsOverride];
    }
    return (realComplaintsQuery.data as CustomerComplaint[]) ?? [];
  }, [previewMode, initialComplaintsOverride, realComplaintsQuery.data]);

  // Combined complaints list (initial page or accumulated pages)
  const allLoadedComplaints = useMemo(() => {
    if (offset === 0) {
      return sortComplaintsNewestFirst(initialServerComplaints);
    }
    return deduplicateComplaints(initialServerComplaints, accumulatedComplaints);
  }, [offset, initialServerComplaints, accumulatedComplaints]);

  // The first page establishes whether more rows can exist; later pages update hasMorePages.
  const canLoadMore =
    hasMorePages &&
    (isPreview || offset > 0 || initialServerComplaints.length === PAGE_SIZE);

  // Filtered complaints based on active filter
  const displayedComplaints = useMemo(() => {
    return filterComplaints(allLoadedComplaints, activeFilter);
  }, [allLoadedComplaints, activeFilter]);

  // Derived loading & error states
  const isInitialLoading =
    previewMode === 'loading' ||
    (!isPreview && isSignedIn && realComplaintsQuery.isLoading && !realComplaintsQuery.data);

  const hasQueryError =
    previewMode === 'error' ||
    (!isPreview && isSignedIn && realComplaintsQuery.isError && !realComplaintsQuery.data);

  // Safe Back Navigation
  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/account');
    }
  }, [router]);

  // Browse Offers Navigation
  const handleBrowseOffers = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  // Sign In Navigation
  const handleSignIn = useCallback(() => {
    router.push('/sign-in');
  }, [router]);

  // Safe Refresh
  const handleRefresh = useCallback(async () => {
    if (isPreview) {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 500);
      return;
    }
    setIsRefreshing(true);
    setOffset(0);
    setAccumulatedComplaints([]);
    setHasMorePages(true);
    setLoadMoreError(false);
    try {
      await realComplaintsQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [isPreview, realComplaintsQuery]);

  // Safe Pagination: Fetch Next Page
  const handleLoadMore = useCallback(async () => {
    if (isFetchingMoreRef.current || !hasMorePages || isInitialLoading || isRefreshing) return;
    if (!isPreview && (!isSignedIn || !apiContext.userId)) return;

    if (isPreview) {
      // In preview, simulate honest end-of-list
      setHasMorePages(false);
      return;
    }

    try {
      const { client } = requireWowApiSession(apiContext);
      isFetchingMoreRef.current = true;
      setIsFetchingMore(true);
      setLoadMoreError(false);

      const nextOffset = offset + PAGE_SIZE;
      const nextBatch = await getMyComplaints(client, {
        limit: PAGE_SIZE,
        offset: nextOffset,
      });

      if (!nextBatch || nextBatch.length === 0) {
        setHasMorePages(false);
      } else {
        setAccumulatedComplaints((prev) => deduplicateComplaints(prev, nextBatch));
        setOffset(nextOffset);
        if (nextBatch.length < PAGE_SIZE) {
          setHasMorePages(false);
        }
      }
    } catch {
      // Preserve loaded pages and show a recoverable load-more error.
      setLoadMoreError(true);
    } finally {
      isFetchingMoreRef.current = false;
      setIsFetchingMore(false);
    }
  }, [apiContext, hasMorePages, isInitialLoading, isPreview, isRefreshing, isSignedIn, offset]);

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
          isSignedIn && !isInitialLoading ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#FACC15"
              colors={['#FACC15']}
            />
          ) : undefined
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
          {/* ==============================================================
              1. Top Navigation Bar: Back Button (right) & Centered Title
              ============================================================== */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 48,
              width: '100%',
            }}
          >
            {/* Right side in RTL: Back to Account Arrow Button */}
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="العودة إلى حسابي"
              accessibilityHint="يرجع إلى شاشة الحساب الرئيسية"
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: pressed
                  ? isDark
                    ? '#2D2D32'
                    : '#E2E8F0'
                  : isDark
                    ? '#1C1C1E'
                    : '#F1F5F9',
                borderColor: colors.border,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <ArrowRight
                size={22}
                color={colors.foreground}
                strokeWidth={2.2}
              />
            </Pressable>

            {/* Screen Title */}
            <AppText
              variant="heading"
              style={{
                fontSize: 20,
                fontWeight: '800',
                color: colors.foreground,
                textAlign: 'center',
              }}
            >
              شكاواي
            </AppText>

            {/* Spacer for symmetry */}
            <View style={{ width: 48, height: 48 }} />
          </View>

          {/* ==============================================================
              2. Authentication Gate: Guest State
              ============================================================== */}
          {!isAuthLoaded ? (
            <View style={{ alignItems: 'center', paddingVertical: 64, gap: 16 }}>
              <ActivityIndicator size="large" color="#FACC15" />
              <AppText variant="caption" muted style={{ fontSize: 14 }}>
                جاري التحقق من بيانات الحساب...
              </AppText>
            </View>
          ) : !isSignedIn ? (
            <View
              style={{
                alignItems: 'center',
                paddingVertical: 48,
                paddingHorizontal: 20,
                gap: 20,
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 20,
              }}
            >
              <Image
                source={wowIllustrations.customer.secureAccess}
                accessibilityLabel="أيقونة تسجيل الدخول الآمن"
                style={{
                  width: 140,
                  height: 140,
                  resizeMode: 'contain',
                }}
              />

              <View style={{ alignItems: 'center', gap: 8, maxWidth: 360 }}>
                <AppText
                  variant="heading"
                  style={{
                    fontSize: 20,
                    fontWeight: '800',
                    color: colors.foreground,
                    textAlign: 'center',
                  }}
                >
                  تسجيل الدخول مطلوب
                </AppText>
                <AppText
                  variant="body"
                  muted
                  style={{
                    fontSize: 14,
                    lineHeight: 22,
                    textAlign: 'center',
                    color: colors.mutedForeground,
                  }}
                >
                  لمتابعة شكاواك وبلاغاتك المسجلة، يرجى تسجيل الدخول إلى حسابك المعتمد أولاً.
                </AppText>
              </View>

              <AppButton
                title="تسجيل الدخول"
                variant="primary"
                onPress={handleSignIn}
                accessibilityLabel="تسجيل الدخول"
                style={{ width: '100%', maxWidth: 280, minHeight: 48 }}
              />

              <Pressable
                onPress={handleBack}
                accessibilityRole="button"
                accessibilityLabel="العودة إلى حسابي"
                style={({ pressed }) => ({
                  minHeight: 48,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 16,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <ArrowRight size={18} color={colors.mutedForeground} strokeWidth={2} />
                <AppText
                  variant="caption"
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: colors.mutedForeground,
                  }}
                >
                  العودة إلى حسابي
                </AppText>
              </Pressable>
            </View>
          ) : (
            /* ==============================================================
                3. Authenticated Content
                ============================================================== */
            <>
              {/* Feature Intro Card: "بلاغاتك، في مكان واحد" */}
              <View
                style={{
                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  borderColor: isDark ? '#2C2C2E' : '#FDE047',
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  // Responsive subtle elevation
                  ...(isDark
                    ? {}
                    : {
                        shadowColor: '#000000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.04,
                        shadowRadius: 3,
                        elevation: 1,
                      }),
                }}
              >
                {/* Yellow Icon Box */}
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: '#FACC15',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={22} color="#0F172A" strokeWidth={2.2} />
                </View>

                {/* Banner Text */}
                <View style={{ flex: 1, gap: 3 }}>
                  <AppText
                    variant="heading"
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: colors.foreground,
                      textAlign: 'right',
                    }}
                  >
                    بلاغاتك، في مكان واحد
                  </AppText>
                  <AppText
                    variant="caption"
                    style={{
                      fontSize: 12.5,
                      color: colors.mutedForeground,
                      textAlign: 'right',
                    }}
                  >
                    تابع حالة الشكاوى التي قدمتها للمنصة.
                  </AppText>
                </View>
              </View>

              {/* Section Header Row & Filter Chips */}
              <View style={{ gap: 12, marginTop: 4 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 2,
                  }}
                >
                  <AppText
                    variant="heading"
                    style={{
                      fontSize: 16,
                      fontWeight: '800',
                      color: colors.foreground,
                      textAlign: 'right',
                    }}
                  >
                    الشكاوى المقدمة
                  </AppText>

                  <AppText
                    variant="caption"
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: colors.mutedForeground,
                    }}
                  >
                    الأحدث أولاً
                  </AppText>
                </View>

                {/* Filter Chips */}
                <ComplaintFilterTabs
                  activeFilter={activeFilter}
                  onSelectFilter={setActiveFilter}
                  disabled={isInitialLoading}
                />
              </View>

              {/* ==========================================================
                  4. List States: Loading, Error, Empty, or Populated Cards
                  ========================================================== */}
              {isInitialLoading ? (
                /* Initial Loading Skeleton */
                <View
                  accessibilityLabel="جاري تحميل الشكاوى..."
                  style={{ gap: 12, marginTop: 8 }}
                >
                  {[1, 2, 3].map((key) => (
                    <View
                      key={key}
                      style={{
                        height: 120,
                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 16,
                        padding: 16,
                        gap: 12,
                        justifyContent: 'space-between',
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Skeleton style={{ width: 140, height: 20, borderRadius: 6 }} />
                        <Skeleton style={{ width: 80, height: 24, borderRadius: 8 }} />
                      </View>
                      <Skeleton style={{ width: '90%', height: 16, borderRadius: 4 }} />
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          paddingTop: 8,
                        }}
                      >
                        <Skeleton style={{ width: 100, height: 14, borderRadius: 4 }} />
                        <Skeleton style={{ width: 80, height: 14, borderRadius: 4 }} />
                      </View>
                    </View>
                  ))}
                </View>
              ) : hasQueryError ? (
                /* Network or Service Error State */
                <View
                  style={{
                    alignItems: 'center',
                    paddingVertical: 40,
                    paddingHorizontal: 20,
                    gap: 16,
                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 20,
                  }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: isDark ? '#451A1A' : '#FEE2E2',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AlertCircle size={28} color="#EF4444" strokeWidth={2.2} />
                  </View>

                  <View style={{ alignItems: 'center', gap: 6 }}>
                    <AppText
                      variant="heading"
                      style={{
                        fontSize: 18,
                        fontWeight: '800',
                        color: colors.foreground,
                        textAlign: 'center',
                      }}
                    >
                      تعذّر تحميل الشكاوى
                    </AppText>
                    <AppText
                      variant="body"
                      muted
                      style={{
                        fontSize: 13.5,
                        lineHeight: 22,
                        textAlign: 'center',
                        color: colors.mutedForeground,
                        maxWidth: 320,
                      }}
                    >
                      حدث خطأ أثناء جلب سجل الشكاوى. لم تفقد بياناتك ويمكنك إعادة المحاولة.
                    </AppText>
                  </View>

                  <AppButton
                    title="إعادة المحاولة"
                    variant="primary"
                    onPress={handleRefresh}
                    accessibilityLabel="إعادة المحاولة"
                    style={{ minHeight: 48, minWidth: 160 }}
                  />
                </View>
              ) : allLoadedComplaints.length === 0 ? (
                /* No Complaints History State */
                <View
                  style={{
                    alignItems: 'center',
                    paddingVertical: 40,
                    paddingHorizontal: 20,
                    gap: 18,
                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 20,
                  }}
                >
                  <Image
                    source={wowIllustrations.customer.complaintsEmpty}
                    accessibilityLabel="رسم توضيحي لعدم وجود شكاوى"
                    style={{
                      width: 140,
                      height: 140,
                      resizeMode: 'contain',
                    }}
                  />

                  <View style={{ alignItems: 'center', gap: 8, maxWidth: 360 }}>
                    <AppText
                      variant="heading"
                      style={{
                        fontSize: 20,
                        fontWeight: '800',
                        color: colors.foreground,
                        textAlign: 'center',
                      }}
                    >
                      لا توجد شكاوى بعد
                    </AppText>
                    <AppText
                      variant="body"
                      muted
                      style={{
                        fontSize: 14,
                        lineHeight: 22,
                        textAlign: 'center',
                        color: colors.mutedForeground,
                      }}
                    >
                      لم تقدم أي شكوى حتى الآن. يمكنك الإبلاغ عن مشكلة من صفحة العرض المعني.
                    </AppText>
                  </View>

                  <AppButton
                    title="استكشاف العروض"
                    variant="primary"
                    onPress={handleBrowseOffers}
                    accessibilityLabel="استكشاف العروض"
                    style={{
                      minHeight: 48,
                      minWidth: 200,
                      backgroundColor: '#FACC15',
                    }}
                  />

                  <AppText
                    variant="caption"
                    muted
                    style={{
                      fontSize: 12,
                      color: colors.mutedForeground,
                      textAlign: 'center',
                    }}
                  >
                    تظهر الشكاوى هنا فور تسجيلها
                  </AppText>
                </View>
              ) : displayedComplaints.length === 0 ? (
                /* Filtered Empty State */
                <View
                  style={{
                    alignItems: 'center',
                    paddingVertical: 36,
                    paddingHorizontal: 20,
                    gap: 14,
                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 20,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: isDark ? '#2D2D32' : '#F1F5F9',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileSpreadsheet
                      size={24}
                      color={colors.mutedForeground}
                      strokeWidth={2}
                    />
                  </View>

                  <View style={{ alignItems: 'center', gap: 6 }}>
                    <AppText
                      variant="heading"
                      style={{
                        fontSize: 17,
                        fontWeight: '800',
                        color: colors.foreground,
                        textAlign: 'center',
                      }}
                    >
                      لا توجد شكاوى في هذه التصفية
                    </AppText>
                    <AppText
                      variant="body"
                      muted
                      style={{
                        fontSize: 13,
                        lineHeight: 20,
                        textAlign: 'center',
                        color: colors.mutedForeground,
                      }}
                    >
                      لا توجد شكاوى مطابقة بين السجلات المحمّلة حالياً. قد تظهر شكاوى أخرى عند تحميل المزيد.
                    </AppText>
                  </View>

                  <AppButton
                    title="عرض كل الشكاوى"
                    variant="secondary"
                    onPress={() => setActiveFilter('all')}
                    accessibilityLabel="عرض كل الشكاوى"
                    style={{ minHeight: 48, minWidth: 160 }}
                  />
                  {canLoadMore && (
                    <AppButton
                      title={isFetchingMore ? 'جاري تحميل المزيد...' : 'تحميل المزيد من الشكاوى'}
                      variant="secondary"
                      disabled={isFetchingMore}
                      onPress={handleLoadMore}
                      accessibilityLabel="تحميل المزيد للبحث عن شكاوى مطابقة"
                      style={{ minHeight: 48, minWidth: 200 }}
                    />
                  )}
                </View>
              ) : (
                /* Populated Complaint Cards List */
                <View style={{ gap: 12 }}>
                  {displayedComplaints.map((item) => (
                    <ComplaintCard
                      key={item.id}
                      complaint={item}
                      onPress={setSelectedComplaint}
                    />
                  ))}

                  {/* Pagination Footer */}
                  {canLoadMore && (
                    <View style={{ alignItems: 'center', paddingTop: 8 }}>
                      <Pressable
                        onPress={handleLoadMore}
                        disabled={isFetchingMore}
                        accessibilityRole="button"
                        accessibilityLabel="تحميل المزيد من الشكاوى"
                        style={({ pressed }) => ({
                          minHeight: 48,
                          paddingHorizontal: 24,
                          paddingVertical: 12,
                          borderRadius: 12,
                          backgroundColor: pressed
                            ? isDark
                              ? '#2D2D32'
                              : '#E2E8F0'
                            : isDark
                              ? '#1C1C1E'
                              : '#F1F5F9',
                          borderColor: colors.border,
                          borderWidth: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          opacity: isFetchingMore ? 0.6 : 1,
                        })}
                      >
                        {isFetchingMore ? (
                          <ActivityIndicator size="small" color="#FACC15" />
                        ) : (
                          <RotateCw
                            size={16}
                            color={isDark ? '#E2E8F0' : '#334155'}
                            strokeWidth={2}
                          />
                        )}
                        <AppText
                          style={{
                            fontSize: 14,
                            fontWeight: '700',
                            color: isDark ? '#E2E8F0' : '#334155',
                          }}
                        >
                          {isFetchingMore ? 'جاري التحميل...' : 'تحميل المزيد من الشكاوى'}
                        </AppText>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              {loadMoreError && !isPreview && (
                <View style={{ alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 }}>
                  <AppText
                    variant="caption"
                    style={{ color: colors.mutedForeground, textAlign: 'center', fontSize: 13 }}
                  >
                    تعذّر تحميل المزيد من الشكاوى. يمكنك إعادة المحاولة.
                  </AppText>
                </View>
              )}

              {/* Bottom Navigation Link: "العودة إلى حسابي ->" */}
              <View style={{ alignItems: 'center', paddingTop: 16 }}>
                <Pressable
                  onPress={handleBack}
                  accessibilityRole="button"
                  accessibilityLabel="العودة إلى حسابي"
                  style={({ pressed }) => ({
                    minHeight: 48,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 10,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <ArrowRight
                    size={18}
                    color={colors.mutedForeground}
                    strokeWidth={2.2}
                  />
                  <AppText
                    variant="caption"
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: colors.mutedForeground,
                    }}
                  >
                    العودة إلى حسابي
                  </AppText>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* CUS-09 Boundary Inspection Modal */}
      <ComplaintDetailsBoundaryModal
        visible={Boolean(selectedComplaint)}
        complaint={selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
      />
    </View>
  );
}
