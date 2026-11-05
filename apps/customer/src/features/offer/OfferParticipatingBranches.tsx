import { useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import {
  Check,
  ChevronDown,
  MapPin,
  X,
} from 'lucide-react-native';
import { type PublicBranch } from '@wow/api';
import { wowIllustrations } from '@wow/assets';
import { AppButton, AppText } from '@wow/ui';
import { getDirectionsUrl, hasValidCoordinates } from './offer-display';

export interface OfferParticipatingBranchesProps {
  branches: PublicBranch[];
  isDark: boolean;
}

export function OfferParticipatingBranches({
  branches,
  isDark,
}: OfferParticipatingBranchesProps) {
  // Select initial branch: prefer primary branch, otherwise first branch
  const initialBranch = branches.find((b) => b.is_primary) ?? branches[0] ?? null;
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(
    initialBranch ? initialBranch.id : null,
  );
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const selectedBranch =
    branches.find((b) => b.id === selectedBranchId) ?? initialBranch;

  function handleOpenDirections() {
    if (selectedBranch && hasValidCoordinates(selectedBranch.latitude, selectedBranch.longitude)) {
      const url = getDirectionsUrl(selectedBranch.latitude!, selectedBranch.longitude!);
      Linking.openURL(url).catch(() => {});
    }
  }

  // 1. Empty branches state
  if (!branches || branches.length === 0) {
    return (
      <View style={{ gap: 12 }}>
        <AppText
          variant="heading"
          style={{
            fontSize: 18,
            fontWeight: '800',
            color: isDark ? '#F8FAFC' : '#0F172A',
            textAlign: 'right',
          }}
        >
          الفرع المشارك
        </AppText>
        <View
          style={{
            padding: 20,
            borderRadius: 18,
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            borderWidth: 1,
            borderColor: isDark ? '#1F2937' : '#E2E8F0',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText
            variant="caption"
            style={{
              fontSize: 14,
              color: isDark ? '#94A3B8' : '#64748B',
              textAlign: 'center',
            }}
          >
            لا توجد فروع مشاركة مسجلة لهذا العرض حالياً.
          </AppText>
        </View>
      </View>
    );
  }

  const hasMultipleBranches = branches.length > 1;
  const canNavigate =
    selectedBranch &&
    hasValidCoordinates(selectedBranch.latitude, selectedBranch.longitude);

  const fullAddress = selectedBranch
    ? [selectedBranch.address_line, selectedBranch.district, selectedBranch.city]
        .filter(Boolean)
        .join(' - ')
    : '';

  return (
    <View style={{ gap: 14 }}>
      {/* 1. Section Title */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <AppText
          variant="heading"
          style={{
            fontSize: 18,
            fontWeight: '800',
            color: isDark ? '#F8FAFC' : '#0F172A',
            textAlign: 'right',
          }}
        >
          {hasMultipleBranches ? 'الفروع المشاركة' : 'الفرع المشارك'}
        </AppText>

        {hasMultipleBranches && (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 10,
              backgroundColor: isDark ? 'rgba(250, 204, 21, 0.15)' : '#FEF9C3',
            }}
          >
            <AppText
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: isDark ? '#FACC15' : '#854D0E',
              }}
            >
              {branches.length} فروع
            </AppText>
          </View>
        )}
      </View>

      {/* 2. Branch Selector / Details Container */}
      <View
        style={{
          padding: 16,
          borderRadius: 18,
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderWidth: 1,
          borderColor: isDark ? '#1F2937' : '#E2E8F0',
          gap: 12,
        }}
      >
        {/* Branch Selector (or single branch title) */}
        {hasMultipleBranches ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`اختيار الفرع المشارك، الفرع الحالي ${selectedBranch?.name}`}
            accessibilityHint="يفتح قائمة لاختيار الفرع المشارك"
            onPress={() => setIsPickerOpen(true)}
            style={({ pressed }) => ({
              minHeight: 48,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
              borderWidth: 1,
              borderColor: isDark ? '#334155' : '#E2E8F0',
              opacity: pressed ? 0.85 : 1,
            })}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                flex: 1,
                minWidth: 0,
              }}
            >
              <MapPin size={18} color="#FACC15" />
              <AppText
                numberOfLines={1}
                style={{
                  fontSize: 15,
                  fontWeight: '800',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                  textAlign: 'right',
                }}
              >
                {selectedBranch?.name}
              </AppText>
              {selectedBranch?.is_primary && (
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 6,
                    backgroundColor: isDark ? 'rgba(250, 204, 21, 0.12)' : '#FEF3C7',
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: isDark ? '#FACC15' : '#92400E',
                    }}
                  >
                    رئيسي
                  </AppText>
                </View>
              )}
            </View>
            <ChevronDown size={18} color={isDark ? '#94A3B8' : '#64748B'} />
          </Pressable>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} color="#FACC15" />
            <AppText
              style={{
                fontSize: 15,
                fontWeight: '800',
                color: isDark ? '#F8FAFC' : '#0F172A',
              }}
            >
              {selectedBranch?.name}
            </AppText>
            {selectedBranch?.is_primary && (
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: isDark ? 'rgba(250, 204, 21, 0.12)' : '#FEF3C7',
                }}
              >
                <AppText
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: isDark ? '#FACC15' : '#92400E',
                  }}
                >
                  الفرع الرئيسي
                </AppText>
              </View>
            )}
          </View>
        )}

        {/* Address text line */}
        {fullAddress ? (
          <AppText
            variant="caption"
            style={{
              fontSize: 13,
              color: isDark ? '#94A3B8' : '#64748B',
              textAlign: 'right',
              lineHeight: 20,
            }}
          >
            {fullAddress}
          </AppText>
        ) : null}

        {/* 3. Directions / Location State */}
        {canNavigate ? (
          <View style={{ marginTop: 4 }}>
            <AppButton
              title="الاتجاهات إلى الفرع"
              variant="outline"
              size="sm"
              onPress={handleOpenDirections}
            />
          </View>
        ) : (
          /* Branded Empty Map State with WOW Mascot */
          <View
            style={{
              marginTop: 6,
              padding: 16,
              borderRadius: 16,
              backgroundColor: isDark ? '#0A0F1D' : '#F8FAFC',
              borderWidth: 1,
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            {/* Text description on right */}
            <View style={{ flex: 1, gap: 4 }}>
              <AppText
                variant="heading"
                style={{
                  fontSize: 14,
                  fontWeight: '800',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                  textAlign: 'right',
                }}
              >
                تعذّر عرض موقع الفرع
              </AppText>
              <AppText
                variant="caption"
                style={{
                  fontSize: 12,
                  color: isDark ? '#94A3B8' : '#64748B',
                  lineHeight: 18,
                  textAlign: 'right',
                }}
              >
                {`لا تتوفر إحداثيات معتمدة لـ ${selectedBranch?.name ?? 'الفرع'} في المعاينة.`}
              </AppText>
            </View>

            {/* WOW Mascot holding map illustration */}
            <View
              style={{
                width: 90,
                height: 80,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Image
                source={wowIllustrations.customer.mapUnavailable}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
                accessibilityLabel="رسم توضيحي لتعذر عرض الموقع"
              />
            </View>
          </View>
        )}
      </View>

      {/* 4. Branch Selection Modal for multiple branches */}
      {hasMultipleBranches && (
        <Modal
          visible={isPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsPickerOpen(false)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              justifyContent: 'flex-end',
            }}
            onPress={() => setIsPickerOpen(false)}
          >
            <Pressable
              style={{
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 20,
                maxHeight: '75%',
                width: '100%',
                maxWidth: 600,
                alignSelf: 'center',
                gap: 16,
              }}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? '#1F2937' : '#E2E8F0',
                  paddingBottom: 12,
                }}
              >
                <AppText
                  variant="heading"
                  style={{
                    fontSize: 17,
                    fontWeight: '800',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                  }}
                >
                  اختر الفرع المشارك
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="إغلاق قائمة الفروع"
                  onPress={() => setIsPickerOpen(false)}
                  style={{
                    width: 48,
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                </Pressable>
              </View>

              {/* Branch Items List */}
              <ScrollView style={{ maxHeight: 350 }} contentContainerStyle={{ gap: 10 }}>
                {branches.map((b) => {
                  const isSelected = b.id === selectedBranch?.id;
                  const itemAddress = [b.address_line, b.district, b.city]
                    .filter(Boolean)
                    .join(' - ');

                  return (
                    <Pressable
                      key={b.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${b.name} ${isSelected ? 'محدد' : ''}`}
                      onPress={() => {
                        setSelectedBranchId(b.id);
                        setIsPickerOpen(false);
                      }}
                      style={({ pressed }) => ({
                        minHeight: 56,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 14,
                        borderRadius: 14,
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(250, 204, 21, 0.12)'
                            : '#FEF9C3'
                          : isDark
                            ? '#1E293B'
                            : '#F8FAFC',
                        borderWidth: 1,
                        borderColor: isSelected
                          ? '#FACC15'
                          : isDark
                            ? '#334155'
                            : '#E2E8F0',
                        opacity: pressed ? 0.8 : 1,
                      })}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <AppText
                            style={{
                              fontSize: 15,
                              fontWeight: isSelected ? '800' : '700',
                              color: isDark ? '#F8FAFC' : '#0F172A',
                              textAlign: 'right',
                            }}
                          >
                            {b.name}
                          </AppText>
                          {b.is_primary && (
                            <View
                              style={{
                                paddingHorizontal: 6,
                                paddingVertical: 1,
                                borderRadius: 6,
                                backgroundColor: isDark ? 'rgba(250, 204, 21, 0.2)' : '#FEF3C7',
                              }}
                            >
                              <AppText
                                style={{
                                  fontSize: 10,
                                  fontWeight: '700',
                                  color: isDark ? '#FACC15' : '#92400E',
                                }}
                              >
                                رئيسي
                              </AppText>
                            </View>
                          )}
                        </View>
                        {itemAddress ? (
                          <AppText
                            variant="caption"
                            numberOfLines={1}
                            style={{
                              fontSize: 12,
                              color: isDark ? '#94A3B8' : '#64748B',
                              textAlign: 'right',
                            }}
                          >
                            {itemAddress}
                          </AppText>
                        ) : null}
                      </View>

                      {isSelected && (
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: '#FACC15',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: 10,
                          }}
                        >
                          <Check size={14} color="#0F172A" strokeWidth={3} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
