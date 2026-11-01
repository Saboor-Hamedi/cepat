import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
        <View
          style={[
            styles.menu,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          {actions.map((action) => (
            <Pressable
              key={action.testID}
              accessibilityRole="button"
              onPress={() => {
                close();
                action.onPress();
              }}
              style={styles.menuItem}
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
          ))}
        </View>
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
    elevation: 12,
    zIndex: 20,
  },
  trigger: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 40,
  },
  triggerText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  menu: {
    borderRadius: 5,
    borderWidth: 1,
    elevation: 12,
    minWidth: 160,
    overflow: 'hidden',
    position: 'absolute',
    right: -8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    top: -6,
    zIndex: 30,
  },
  menuItem: {
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  menuText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
