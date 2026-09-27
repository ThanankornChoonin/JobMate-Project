/**
 * ============================================================================
 * JobMate Components - Hint Row (src/components/hint-row.tsx)
 * ============================================================================
 * คอมโพเนนต์แสดงแถวข้อความคำแนะนำคู่กับโค้ดตัวอย่างขนาดเล็ก
 */

import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';

type HintRowProps = {
  /** หัวข้อคำแนะนำ */
  title?: string;
  /** ข้อความหรือโค้ดที่ต้องการเน้นในกล่อง */
  hint?: ReactNode;
};

/**
 * HintRow Component
 * แสดงกล่องคำแนะนำแบบคู่ Key-Value แนวนอน
 */
export function HintRow({ title = 'Try editing', hint = 'app/index.tsx' }: HintRowProps) {
  return (
    <View style={styles.stepRow}>
      <ThemedText type="small">{title}</ThemedText>
      <ThemedView type="backgroundSelected" style={styles.codeSnippet}>
        <ThemedText themeColor="textSecondary">{hint}</ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeSnippet: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
});
