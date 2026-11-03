import { Children, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { resolveActionLayout } from './responsive-action-layout';
import { rtlProps } from './rtl';

export interface ResponsiveActionGroupProps {
  children: ReactNode;
  minItemWidth?: number;
  maxColumns?: number;
  gap?: number;
  testID?: string;
}

/** Every child gets a usable width on mobile, tablet, and web. Parent-width based. */
export function ResponsiveActionGroup({
  children, minItemWidth = 156, maxColumns = 4, gap = 12, testID,
}: ResponsiveActionGroupProps) {
  const [width, setWidth] = useState(0);
  const items = Children.toArray(children);
  const { itemWidth } = resolveActionLayout(width, minItemWidth, gap, maxColumns);
  return (
    <View
      {...rtlProps}
      testID={testID}
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        setWidth((previous) => Math.abs(previous - nextWidth) > 0.5 ? nextWidth : previous);
      }}
      style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap, alignItems: 'stretch' }}
    >
      {items.map((child, index) => (
        <View key={index} style={{ width: itemWidth || '100%', minWidth: 0 }}>
          {child}
        </View>
      ))}
    </View>
  );
}
