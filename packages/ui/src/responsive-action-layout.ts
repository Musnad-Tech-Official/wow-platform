/** Measure the parent, not the full window: dialogs and split panes also work. */
export function resolveActionLayout(
  containerWidth: number,
  minItemWidth = 156,
  gap = 12,
  maxColumns = 4,
) {
  const safeWidth = Math.max(0, containerWidth);
  const columns = Math.max(1, Math.min(maxColumns,
    Math.floor((safeWidth + gap) / (minItemWidth + gap))));
  return {
    columns,
    itemWidth: safeWidth ? Math.max(0, (safeWidth - (columns - 1) * gap) / columns) : 0,
  };
}
