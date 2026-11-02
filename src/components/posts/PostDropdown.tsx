import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { font } from '../../theme/typography';

import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import { radii, spacing } from '../../theme/tokens';

interface PostDropdownContextValue {
  openPostId: string | null;
  togglePost: (postId: string) => void;
  close: () => void;
}

const PostDropdownContext = createContext<PostDropdownContextValue | null>(null);

export function PostDropdownProvider({ children }: PropsWithChildren) {
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const value = {
    openPostId,
    togglePost: (postId: string) =>
      setOpenPostId((current) => (current === postId ? null : postId)),
    close: () => setOpenPostId(null),
  };
  return (
    <PostDropdownContext.Provider value={value}>
      {children}
    </PostDropdownContext.Provider>
  );
}

export interface PostDropdownAction {
  label: string;
  onPress: () => void;
  testID: string;
  tone?: 'default' | 'danger';
}

export function PostDropdown({
  postId,
  actions,
}: {
  postId: string;
  actions: PostDropdownAction[];
}) {
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const context = useContext(PostDropdownContext);
  const [localOpen, setLocalOpen] = useState(false);
  const expanded = context ? context.openPostId === postId : localOpen;

  const toggle = () => {
    if (context) context.togglePost(postId);
    else setLocalOpen((current) => !current);
  };

  const close = () => {
    if (context) context.close();
    else setLocalOpen(false);
  };

  return (
    <View style={[styles.anchor, expanded && styles.anchorOpen]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={language === 'en' ? 'Post actions' : 'Aksi postingan'}
        accessibilityState={{ expanded }}
        onPress={toggle}
        style={styles.trigger}
        testID={`post-actions-${postId}`}
      >
        <Text style={[styles.triggerText, { color: palette.textMuted }]}>...</Text>
      </Pressable>
      {expanded ? (
        <>
          {/* Backdrop to close when tapping anywhere outside */}
          <Pressable
            accessibilityLabel="Close actions"
            onPress={close}
            style={styles.backdrop}
          />
          <View
            style={[
              styles.menu,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            {/* Little knob pointing up to the dots */}
            <View
              style={[
                styles.knob,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            />
            <View style={styles.menuInner}>
              {actions.map((action, idx) => (
                <View key={action.testID}>
                  {idx > 0 && (
                    <View style={[styles.divider, { backgroundColor: palette.border }]} />
                  )}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      close();
                      action.onPress();
                    }}
                    style={({ pressed }) => [
                      styles.menuItem,
                      pressed && { backgroundColor: palette.pillBg },
                    ]}
                    testID={action.testID}
                  >
                    <Text
                      style={[
                        styles.menuText,
                        { color: action.tone === 'danger' ? palette.danger : palette.text },
                      ]}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    alignSelf: 'flex-start',
    marginLeft: spacing.xs,
    position: 'relative',
    zIndex: 2,
  },
  anchorOpen: {
    elevation: 20,
    zIndex: 999,
  },
  backdrop: {
    bottom: -3000,
    left: -3000,
    position: 'absolute',
    right: -3000,
    top: -3000,
    zIndex: 990,
  },
  trigger: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 40,
  },
  triggerText: {
    fontSize: font.section,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: -4,
  },
  menu: {
    borderRadius: 5,
    borderWidth: 1,
    elevation: 20,
    minWidth: 170,
    overflow: 'visible',
    position: 'absolute',
    right: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    top: 40,
    zIndex: 1000,
  },
  knob: {
    borderLeftWidth: 1,
    borderTopWidth: 1,
    height: 12,
    position: 'absolute',
    right: 14,
    top: -7,
    transform: [{ rotate: '45deg' }],
    width: 12,
    zIndex: 1001,
  },
  menuInner: {
    borderRadius: 5,
    overflow: 'hidden',
  },
  menuItem: {
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  menuText: {
    fontSize: font.label,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
});
