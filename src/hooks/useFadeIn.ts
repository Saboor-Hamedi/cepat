import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

import { useAppearance } from '../context/AppearanceContext';

export function useFadeIn(dependency: unknown) {
  const { reduceMotion } = useAppearance();
  const [opacity] = useState(() => new Animated.Value(1));
  const [translateY] = useState(() => new Animated.Value(0));
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (reduceMotion) return;
    opacity.setValue(0);
    translateY.setValue(8);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [dependency, opacity, reduceMotion, translateY]);

  return { opacity, translateY };
}
