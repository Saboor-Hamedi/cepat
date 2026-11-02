import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";

import { useAppearance } from "../../context/AppearanceContext";

export type ToggleSize = "sm" | "md" | "lg";

export interface ToggleProps {
  checked?: boolean;
  value?: boolean;
  active?: boolean;
  onChange?: (checked: boolean) => void;
  onToggle?: () => void;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  size?: ToggleSize;
  style?: StyleProp<ViewStyle>;
  label?: string;
  description?: string;
}

export function Toggle({
  checked,
  active,
  value,
  onChange,
  onToggle,
  onPress,
  disabled = false,
  testID,
  accessibilityLabel,
  size = "md",
  style,
}: ToggleProps) {
  const { palette } = useAppearance();

  const isChecked = Boolean(checked ?? active ?? value ?? false);

  const dimensions = {
    sm: { trackWidth: 36, trackHeight: 20, knobSize: 14, travel: 16, padding: 2 },
    md: { trackWidth: 44, trackHeight: 24, knobSize: 18, travel: 20, padding: 2 },
    lg: { trackWidth: 52, trackHeight: 28, knobSize: 22, travel: 24, padding: 2 },
  }[size];

  const animatedValue = useRef(new Animated.Value(isChecked ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isChecked ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [isChecked, animatedValue]);

  const handlePress = (_e?: GestureResponderEvent) => {
    if (disabled) return;
    if (onChange) {
      onChange(!isChecked);
    } else if (onToggle) {
      onToggle();
    } else if (onPress) {
      onPress();
    }
  };

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dimensions.travel],
  });

  const trackBg = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [palette.border || "#CBD5E1", palette.primary || "#0F766E"],
  });

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: isChecked, disabled }}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={handlePress}
      style={[styles.container, disabled && styles.disabled, style]}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: trackBg,
            borderColor: isChecked ? palette.primary : palette.border,
            borderRadius: dimensions.trackHeight / 2,
            height: dimensions.trackHeight,
            padding: dimensions.padding,
            width: dimensions.trackWidth,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.knob,
            {
              borderRadius: dimensions.knobSize / 2,
              height: dimensions.knobSize,
              transform: [{ translateX }],
              width: dimensions.knobSize,
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.5,
  },
  knob: {
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      web: {
        boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
      },
    }),
  },
  track: {
    borderWidth: 1,
    justifyContent: "center",
  },
});

export default Toggle;
