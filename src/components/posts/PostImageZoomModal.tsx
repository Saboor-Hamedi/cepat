import { type ComponentRef, useCallback, useRef, useState } from 'react';
import {
  Animated,
  type GestureResponderEvent,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_DELAY_MS = 280;

interface TouchPoint {
  pageX?: number;
  pageY?: number;
  locationX?: number;
  locationY?: number;
}

function getCoords(touch: TouchPoint): { x: number; y: number } {
  return {
    x: typeof touch.pageX === 'number' ? touch.pageX : (touch.locationX ?? 0),
    y: typeof touch.pageY === 'number' ? touch.pageY : (touch.locationY ?? 0),
  };
}

function getTouchMetrics(t0: TouchPoint, t1: TouchPoint): {
  distance: number;
  midX: number;
  midY: number;
} {
  const p0 = getCoords(t0);
  const p1 = getCoords(t1);
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  return {
    distance: Math.max(1, Math.hypot(dx, dy)),
    midX: (p0.x + p1.x) / 2,
    midY: (p0.y + p1.y) / 2,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface ZoomablePhotoSlideProps {
  uri: string;
  width: number;
  height: number;
  onZoomChange: (zoomed: boolean) => void;
  onDismiss: () => void;
  testID?: string;
}

function ZoomablePhotoSlide({
  uri,
  width,
  height,
  onZoomChange,
  onDismiss,
  testID,
}: ZoomablePhotoSlideProps) {
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [panXAnim] = useState(() => new Animated.Value(0));
  const [panYAnim] = useState(() => new Animated.Value(0));

  const stateRef = useRef({
    scale: 1,
    panX: 0,
    panY: 0,
    baseScale: 1,
    basePanX: 0,
    basePanY: 0,
    pinchDist: 1,
    pinchMidX: 0,
    pinchMidY: 0,
    singleStartX: 0,
    singleStartY: 0,
    mode: 'idle' as 'idle' | 'pinch' | 'pan' | 'pull_down',
    lastTapAt: 0,
    movedFar: false,
  });

  const resetZoom = useCallback(
    (animate = true) => {
      const s = stateRef.current;
      s.scale = 1;
      s.panX = 0;
      s.panY = 0;
      s.baseScale = 1;
      s.basePanX = 0;
      s.basePanY = 0;
      s.mode = 'idle';
      onZoomChange(false);

      if (animate) {
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 2 }),
          Animated.spring(panXAnim, { toValue: 0, useNativeDriver: true, speed: 22, bounciness: 2 }),
          Animated.spring(panYAnim, { toValue: 0, useNativeDriver: true, speed: 22, bounciness: 2 }),
        ]).start();
      } else {
        scaleAnim.setValue(1);
        panXAnim.setValue(0);
        panYAnim.setValue(0);
      }
    },
    [onZoomChange, panXAnim, panYAnim, scaleAnim],
  );

  const shouldCapture = (e: GestureResponderEvent): boolean => {
    if (e.nativeEvent.touches.length >= 2) return true;
    return stateRef.current.scale > 1.05;
  };

  const handleGrant = (e: GestureResponderEvent) => {
    const touches = e.nativeEvent.touches;
    const s = stateRef.current;

    if (touches.length >= 2) {
      const m = getTouchMetrics(touches[0], touches[1]);
      s.mode = 'pinch';
      s.baseScale = s.scale;
      s.basePanX = s.panX;
      s.basePanY = s.panY;
      s.pinchDist = m.distance;
      s.pinchMidX = m.midX;
      s.pinchMidY = m.midY;
      s.movedFar = true;
      onZoomChange(true);
    } else if (touches.length === 1) {
      const pt = getCoords(touches[0]);
      s.mode = s.scale > 1.05 ? 'pan' : 'idle';
      s.basePanX = s.panX;
      s.basePanY = s.panY;
      s.singleStartX = pt.x;
      s.singleStartY = pt.y;
      s.movedFar = false;
    }
  };

  const handleMove = (e: GestureResponderEvent) => {
    const touches = e.nativeEvent.touches;
    const s = stateRef.current;

    if (touches.length >= 2) {
      if (s.mode !== 'pinch') {
        const m = getTouchMetrics(touches[0], touches[1]);
        s.mode = 'pinch';
        s.baseScale = s.scale;
        s.basePanX = s.panX;
        s.basePanY = s.panY;
        s.pinchDist = m.distance;
        s.pinchMidX = m.midX;
        s.pinchMidY = m.midY;
        s.movedFar = true;
        onZoomChange(true);
        return;
      }
      const m = getTouchMetrics(touches[0], touches[1]);
      const ratio = m.distance / Math.max(1, s.pinchDist);
      const nextScale = clamp(s.baseScale * ratio, MIN_SCALE, MAX_SCALE);
      const maxOffX = ((nextScale - 1) * width) / 2;
      const maxOffY = ((nextScale - 1) * height) / 2;
      const dMidX = m.midX - s.pinchMidX;
      const dMidY = m.midY - s.pinchMidY;
      const nextPanX = clamp(s.basePanX + dMidX, -maxOffX, maxOffX);
      const nextPanY = clamp(s.basePanY + dMidY, -maxOffY, maxOffY);

      s.scale = nextScale;
      s.panX = nextPanX;
      s.panY = nextPanY;
      scaleAnim.setValue(nextScale);
      panXAnim.setValue(nextPanX);
      panYAnim.setValue(nextPanY);
      return;
    }

    if (touches.length === 1 && s.scale > 1.05) {
      const pt = getCoords(touches[0]);
      const dx = pt.x - s.singleStartX;
      const dy = pt.y - s.singleStartY;
      if (Math.hypot(dx, dy) > 8) {
        s.movedFar = true;
      }
      const maxOffX = ((s.scale - 1) * width) / 2;
      const maxOffY = ((s.scale - 1) * height) / 2;
      const nextPanX = clamp(s.basePanX + dx, -maxOffX, maxOffX);
      const nextPanY = clamp(s.basePanY + dy, -maxOffY, maxOffY);

      s.panX = nextPanX;
      s.panY = nextPanY;
      panXAnim.setValue(nextPanX);
      panYAnim.setValue(nextPanY);
    }
  };

  const handleRelease = (e: GestureResponderEvent) => {
    const s = stateRef.current;
    if (e.nativeEvent.touches.length >= 2) return;

    if (s.scale > 1.05) {
      if (!s.movedFar) {
        const now = Date.now();
        if (now - s.lastTapAt < DOUBLE_TAP_DELAY_MS) {
          s.lastTapAt = 0;
          resetZoom(true);
          return;
        }
        s.lastTapAt = now;
      }
      s.baseScale = s.scale;
      s.basePanX = s.panX;
      s.basePanY = s.panY;
      s.mode = 'idle';
      return;
    }

    // At 1x scale
    if (!s.movedFar) {
      const now = Date.now();
      if (now - s.lastTapAt < DOUBLE_TAP_DELAY_MS) {
        // Double tap: zoom to 2.5x smoothly
        s.lastTapAt = 0;
        s.scale = 2.5;
        s.baseScale = 2.5;
        s.panX = 0;
        s.panY = 0;
        s.basePanX = 0;
        s.basePanY = 0;
        s.mode = 'idle';
        onZoomChange(true);
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 2.5, useNativeDriver: true, speed: 22, bounciness: 2 }),
          Animated.spring(panXAnim, { toValue: 0, useNativeDriver: true, speed: 22, bounciness: 2 }),
          Animated.spring(panYAnim, { toValue: 0, useNativeDriver: true, speed: 22, bounciness: 2 }),
        ]).start();
        return;
      }
      s.lastTapAt = now;
    }
  };

  return (
    <View
      collapsable={false}
      onMoveShouldSetResponder={shouldCapture}
      onMoveShouldSetResponderCapture={shouldCapture}
      onResponderGrant={handleGrant}
      onResponderMove={handleMove}
      onResponderRelease={handleRelease}
      onResponderTerminate={handleRelease}
      onResponderTerminationRequest={() => stateRef.current.scale <= 1.05}
      onStartShouldSetResponder={shouldCapture}
      onStartShouldSetResponderCapture={shouldCapture}
      style={[styles.slideHolder, { width, height }]}
      testID={testID}
    >
      <Animated.View
        collapsable={false}
        style={[
          styles.imageWrap,
          {
            width,
            height,
            transform: [
              { translateX: panXAnim },
              { translateY: panYAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <Image
          accessibilityLabel="Zoomed photo"
          resizeMode="contain"
          source={{ uri }}
          style={styles.fullImage}
        />
      </Animated.View>
    </View>
  );
}

export interface PostImageZoomModalProps {
  visible: boolean;
  images: readonly string[];
  initialIndex: number;
  postId: string;
  onClose: () => void;
}

export function PostImageZoomModal({
  visible,
  images,
  initialIndex,
  postId,
  onClose,
}: PostImageZoomModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [internalActive, setInternalActive] = useState<{ base: number; value: number }>({
    base: initialIndex,
    value: clamp(initialIndex, 0, Math.max(0, images.length - 1)),
  });

  const activeIndex =
    internalActive.base === initialIndex
      ? internalActive.value
      : clamp(initialIndex, 0, Math.max(0, images.length - 1));

  const [anySlideZoomed, setAnySlideZoomed] = useState(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);

  const handleMomentumScrollEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    if (windowWidth <= 0) return;
    const nextIdx = clamp(
      Math.round(e.nativeEvent.contentOffset.x / windowWidth),
      0,
      images.length - 1,
    );
    setInternalActive({ base: initialIndex, value: nextIdx });
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      onRequestClose={onClose}
      statusBarTranslucent
      testID={`post-zoom-modal-${postId}`}
      transparent
      visible={visible}
    >
      <View style={styles.modalBackdrop}>
        {/* Top bar with counter & close button */}
        <View style={styles.topBar}>
          {images.length > 1 ? (
            <View style={styles.counterWrap}>
              <Text style={styles.counterText}>
                {activeIndex + 1} / {images.length}
              </Text>
            </View>
          ) : (
            <View style={{ width: 44 }} />
          )}

          <Pressable
            accessibilityHint="Close full screen photo zoom"
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={16}
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            testID={`close-post-zoom-modal-${postId}`}
          >
            <X color="#FFFFFF" size={22} strokeWidth={2.4} />
          </Pressable>
        </View>

        {/* Silky-smooth horizontal paging carousel across the photos */}
        <ScrollView
          bounces={false}
          contentOffset={{ x: initialIndex * windowWidth, y: 0 }}
          decelerationRate="fast"
          disableIntervalMomentum
          horizontal
          onMomentumScrollEnd={handleMomentumScrollEnd}
          pagingEnabled={Platform.OS === 'ios'}
          ref={scrollRef}
          scrollEnabled={!anySlideZoomed}
          showsHorizontalScrollIndicator={false}
          snapToAlignment="center"
          snapToInterval={windowWidth}
          style={{ width: windowWidth, height: windowHeight }}
        >
          {images.map((imgUri, idx) => (
            <ZoomablePhotoSlide
              height={windowHeight}
              key={`${imgUri}-${idx}`}
              onDismiss={onClose}
              onZoomChange={setAnySlideZoomed}
              testID={`zoom-slide-${postId}-${idx}`}
              uri={imgUri}
              width={windowWidth}
            />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    backgroundColor: 'rgba(5, 7, 10, 0.96)',
    flex: 1,
    position: 'relative',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 16,
    paddingTop: 48,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 50,
  },
  counterWrap: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  counterText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  closeBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },
  slideHolder: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    height: '100%',
    width: '100%',
  },
});
