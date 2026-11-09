import { View } from 'react-native';
import {
  AlertCircle,
  CheckCircle,
  CircleDot,
  FileQuestion,
  History,
  MessageSquare,
  Send,
} from 'lucide-react-native';
import { useTheme, useWowColors } from '@wow/theme';
import { AppText } from '@wow/ui';
import type { CustomerComplaint } from '@wow/api';
import {
  formatComplaintDateTime,
  resolveComplaintStatusInfo,
  resolveUpdateKindMeta,
} from './complaints-list-display';

export interface ComplaintTimelineProps {
  complaint: CustomerComplaint;
}

export function ComplaintTimeline({ complaint }: ComplaintTimelineProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = useWowColors();

  const updates = complaint.updates ?? [];
  const hasUpdates = updates.length > 0;
  const statusInfo = resolveComplaintStatusInfo(complaint.status);

  // Check if any update explicitly requests information
  const requestedInfoUpdate = updates.find((u) => u.kind === 'request_info');

  return (
    <View
      accessibilityLabel="مسار المتابعة والتحديثات"
      style={{
        width: '100%',
        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
        borderColor: isDark ? '#2C2C2E' : '#E2E8F0',
        borderWidth: 1,
        borderRadius: 18,
        padding: 18,
        gap: 16,
        ...(isDark
          ? {}
          : {
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }),
      }}
    >
      {/* Timeline Card Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#262629' : '#F1F5F9',
          paddingBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <History
            size={18}
            color={isDark ? '#FACC15' : '#CA8A04'}
            strokeWidth={2.2}
          />
          <AppText
            variant="heading"
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.foreground,
              textAlign: 'right',
            }}
          >
            مسار المتابعة والتحديثات
          </AppText>
        </View>

        <AppText
          variant="caption"
          style={{
            fontSize: 12,
            color: colors.mutedForeground,
          }}
        >
          {hasUpdates ? `${updates.length} تحديث مسجل` : 'لا توجد تحديثات'}
        </AppText>
      </View>

      {/* Case 1: Modest Status Summary when NO historical updates exist */}
      {!hasUpdates ? (
        <View style={{ gap: 14 }}>
          {/* Real Recorded Submission Event */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: isDark ? '#362B00' : '#FEF9C3',
                borderColor: '#FACC15',
                borderWidth: 2,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
              }}
            >
              <Send size={13} color={isDark ? '#FEF08A' : '#854D0E'} strokeWidth={2.5} />
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: colors.foreground,
                    textAlign: 'right',
                  }}
                >
                  تم تقديم الشكوى بنجاح
                </AppText>
                <AppText
                  variant="caption"
                  style={{
                    fontSize: 12,
                    color: colors.mutedForeground,
                  }}
                >
                  {formatComplaintDateTime(complaint.created_at)}
                </AppText>
              </View>
              <AppText
                variant="body"
                style={{
                  fontSize: 13,
                  color: colors.mutedForeground,
                  textAlign: 'right',
                  lineHeight: 20,
                }}
              >
                تم استلام الشكوى وتوثيقها في سجلات المنصة بالمعرّف المعتمد.
              </AppText>
            </View>
          </View>

          {/* Current Status Box */}
          <View
            style={{
              backgroundColor: isDark ? '#262629' : '#F8FAFC',
              borderColor: isDark ? '#333338' : '#E2E8F0',
              borderWidth: 1,
              borderRadius: 12,
              padding: 14,
              gap: 6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CircleDot size={14} color="#FACC15" strokeWidth={2.5} />
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: colors.foreground,
                }}
              >
                الموقف الحالي: {statusInfo.label}
              </AppText>
            </View>
            <AppText
              variant="caption"
              style={{
                fontSize: 12.5,
                lineHeight: 19,
                color: colors.mutedForeground,
                textAlign: 'right',
              }}
            >
              {statusInfo.description}
            </AppText>
          </View>
        </View>
      ) : (
        /* Case 2: Real Authoritative Timeline with Authorized Updates */
        <View style={{ gap: 16 }}>
          {/* 1. Initial Submission Node */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: isDark ? '#362B00' : '#FEF9C3',
                borderColor: '#FACC15',
                borderWidth: 2,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
              }}
            >
              <Send size={13} color={isDark ? '#FEF08A' : '#854D0E'} strokeWidth={2.5} />
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: colors.foreground,
                    textAlign: 'right',
                  }}
                >
                  تم تقديم الشكوى
                </AppText>
                <AppText
                  variant="caption"
                  style={{
                    fontSize: 12,
                    color: colors.mutedForeground,
                  }}
                >
                  {formatComplaintDateTime(complaint.created_at)}
                </AppText>
              </View>
              <AppText
                variant="body"
                style={{
                  fontSize: 13,
                  color: colors.mutedForeground,
                  textAlign: 'right',
                }}
              >
                تم توثيق الشكوى بنجاح وبدء مسار التحقق.
              </AppText>
            </View>
          </View>

          {/* 2. Customer-Safe Updates */}
          {updates.map((update, index) => {
            const kindMeta = resolveUpdateKindMeta(update.kind);
            const isRequestInfo = update.kind === 'request_info';

            return (
              <View
                key={`${update.created_at}-${index}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                  borderTopWidth: 1,
                  borderTopColor: isDark ? '#262629' : '#F1F5F9',
                  paddingTop: 12,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: isRequestInfo
                      ? isDark
                        ? '#431407'
                        : '#FFF7ED'
                      : isDark
                        ? '#172554'
                        : '#EFF6FF',
                    borderColor: isRequestInfo
                      ? '#F97316'
                      : isDark
                        ? '#3B82F6'
                        : '#2563EB',
                    borderWidth: 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 2,
                  }}
                >
                  {isRequestInfo ? (
                    <FileQuestion
                      size={13}
                      color={isDark ? '#FDBA74' : '#C2410C'}
                      strokeWidth={2.5}
                    />
                  ) : (
                    <MessageSquare
                      size={13}
                      color={isDark ? '#93C5FD' : '#1D4ED8'}
                      strokeWidth={2.5}
                    />
                  )}
                </View>

                <View style={{ flex: 1, gap: 6 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: isRequestInfo
                          ? isDark
                            ? '#431407'
                            : '#FFEDD5'
                          : isDark
                            ? '#1E293B'
                            : '#F1F5F9',
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <AppText
                        style={{
                          fontSize: 11.5,
                          fontWeight: '700',
                          color: isRequestInfo
                            ? isDark
                              ? '#FDBA74'
                              : '#C2410C'
                            : colors.foreground,
                        }}
                      >
                        {kindMeta.label}
                      </AppText>
                    </View>

                    <AppText
                      variant="caption"
                      style={{
                        fontSize: 12,
                        color: colors.mutedForeground,
                      }}
                    >
                      {formatComplaintDateTime(update.created_at)}
                    </AppText>
                  </View>

                  <AppText
                    selectable
                    style={{
                      fontSize: 13.5,
                      lineHeight: 21,
                      color: colors.foreground,
                      textAlign: 'right',
                      writingDirection: 'rtl',
                    }}
                  >
                    {update.message}
                  </AppText>
                </View>
              </View>
            );
          })}

          {/* 3. Closed State Node if Closed */}
          {complaint.status === 'closed' && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
                borderTopWidth: 1,
                borderTopColor: isDark ? '#262629' : '#F1F5F9',
                paddingTop: 12,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  borderColor: isDark ? '#475569' : '#94A3B8',
                  borderWidth: 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 2,
                }}
              >
                <CheckCircle
                  size={13}
                  color={isDark ? '#CBD5E1' : '#475569'}
                  strokeWidth={2.5}
                />
              </View>

              <View style={{ flex: 1, gap: 4 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: colors.foreground,
                      textAlign: 'right',
                    }}
                  >
                    إغلاق ملف الشكوى
                  </AppText>
                  <AppText
                    variant="caption"
                    style={{
                      fontSize: 12,
                      color: colors.mutedForeground,
                    }}
                  >
                    {formatComplaintDateTime(complaint.closed_at || complaint.created_at)}
                  </AppText>
                </View>
                <AppText
                  variant="body"
                  style={{
                    fontSize: 13,
                    color: colors.mutedForeground,
                    textAlign: 'right',
                  }}
                >
                  تم إغلاق ملف الشكوى من قِبل إدارة المنصة.
                </AppText>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Requested Information Notice (Section 4.F) */}
      {requestedInfoUpdate && (
        <View
          style={{
            backgroundColor: isDark ? '#431407' : '#FFF7ED',
            borderColor: isDark ? '#9A3412' : '#FED7AA',
            borderWidth: 1,
            borderRadius: 12,
            padding: 14,
            gap: 8,
            marginTop: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={16} color={isDark ? '#FDBA74' : '#EA580C'} strokeWidth={2.2} />
            <AppText
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: isDark ? '#FFEDD5' : '#9A3412',
              }}
            >
              استيضاح مطلوب من العميل
            </AppText>
          </View>
          <AppText
            style={{
              fontSize: 13,
              lineHeight: 20,
              color: isDark ? '#FED7AA' : '#C2410C',
              textAlign: 'right',
            }}
          >
            {requestedInfoUpdate.message}
          </AppText>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: isDark ? '#7C2D12' : '#FFEDD5',
              paddingTop: 6,
            }}
          >
            <AppText
              variant="caption"
              style={{
                fontSize: 11.5,
                lineHeight: 18,
                color: isDark ? '#FDBA74' : '#9A3412',
                textAlign: 'right',
              }}
            >
              تنويه: إرسال الردود أو الوثائق التكميلية عبر التطبيق غير مدعوم في هذه المرحلة. سيقوم فريق المنصة بالتواصل معك عند الحاجة لاستكمال الإجراءات.
            </AppText>
          </View>
        </View>
      )}
    </View>
  );
}
