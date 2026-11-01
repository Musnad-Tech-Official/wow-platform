import { View, type ViewProps } from 'react-native';
import { useWowColors } from '@wow/theme';

export type SkeletonProps = ViewProps & {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
};

/** Stable placeholder by default: no perpetual shimmer or unnecessary GPU work. */
export function Skeleton({ height = 20, width = '100%', radius = 8, style, ...props }: SkeletonProps) {
  const colors = useWowColors();
  return <View {...props} accessible={false} style={[{
    height, width, borderRadius: radius, backgroundColor: colors.border, opacity: .75,
  }, style]} />;
}
