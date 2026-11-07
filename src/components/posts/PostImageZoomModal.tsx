import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
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
import { RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react-native';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
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
  externalScaleCommand?: { id: number; targetScale: number } | null;
  onZoomChange: (zoomed: boolean, currentScale: number) => void;
  onDismiss: () => void;
  testID?: string;
}

function ZoomablePhotoSlide({
  uri,
  width,
  height,
  externalScaleCommand,
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
    multiTouchSeen: false,
  });

  const animateToScale = useCallback(
    (targetScale: number, targetPanX = 0, targetPanY = 0) => {
      const clampedScale = clamp(targetScale, MIN_SCALE, MAX_SCALE);
      const maxOffX = ((clampedScale - 1) * width) / 2;
      const maxOffY = ((clampedScale - 1) * height) / 2;
      const nextPanX = clampedScale <= 1.02 ? 0 : clamp(targetPanX, -maxOffX, maxOffX);
      const nextPanY = clampedScale <= 1.02 ? 0 : clamp(targetPanY, -maxOffY, maxOffY);

      const s = stateRef.current;
      s.scale = clampedScale;
      s.baseScale = clampedScale;
      s.panX = nextPanX;
      s.panY = nextPanY;
      s.basePanX = nextPanX;
      s.basePanY = nextPanY;
      s.mode = 'idle';

      onZoomChange(clampedScale > 1.05, clampedScale);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: clampedScale,
          useNativeDriver: true,
          speed: 22,
          bounciness: 2,
        }),
        Animated.spring(panXAnim, {
          toValue: nextPanX,
          useNativeDriver: true,
          speed: 22,
          bounciness: 2,
        }),
        Animated.spring(panYAnim, {
          toValue: nextPanY,
          useNativeDriver: true,
          speed: 22,
          bounciness: 2,
        }),
      ]).start();
    },
    [height, onZoomChange, panXAnim, panYAnim, scaleAnim, width],
  );

  useEffect(() => {
    if (!externalScaleCommand) return;
    animateToScale(externalScaleCommand.targetScale, 0, 0);
  }, [externalScaleCommand, animateToScale]);

  const shouldStartResponder = (e: GestureResponderEvent): boolean => {
    const touchCount = e.nativeEvent.touches.length;
    // Never intercept 3+ finger system gestures (e.g. 3-finger screenshot)
    if (touchCount >= 3) return false;
    return touchCount === 1 || touchCount === 2;
  };

  const shouldMoveResponder = (e: GestureResponderEvent): boolean => {
    const touchCount = e.nativeEvent.touches.length;
    if (touchCount >= 3) return false;
    if (touchCount === 2) return true;
    if (stateRef.current.scale > 1.05) return true;
    if (touchCount === 1) {
      const pt = getCoords(e.nativeEvent.touches[0]);
      const dx = pt.x - stateRef.current.singleStartX;
      const dy = pt.y - stateRef.current.singleStartY;
      // Capture vertical pull-down to dismiss when at 1x scale
      if (dy > 14 && Math.abs(dy) > Math.abs(dx) * 1.35) {
        return true;
      }
    }
    return false;
  };

  const handleGrant = (e: GestureResponderEvent) => {
    const touches = e.nativeEvent.touches;
    const s = stateRef.current;

    if (touches.length >= 3) {
      s.multiTouchSeen = true;
      s.mode = 'idle';
      return;
    }

    if (touches.length === 2) {
      const m = getTouchMetrics(touches[0], touches[1]);
      s.mode = 'pinch';
      s.baseScale = s.scale;
      s.basePanX = s.panX;
      s.basePanY = s.panY;
      s.pinchDist = m.distance;
      s.pinchMidX = m.midX;
      s.pinchMidY = m.midY;
      s.movedFar = true;
      s.multiTouchSeen = true;
      onZoomChange(true, s.scale);
    } else if (touches.length === 1) {
      const pt = getCoords(touches[0]);
      s.mode = s.scale > 1.05 ? 'pan' : 'idle';
      s.basePanX = s.panX;
      s.basePanY = s.panY;
      s.singleStartX = pt.x;
      s.singleStartY = pt.y;
      s.movedFar = false;
      s.multiTouchSeen = false;
    }
  };

  const handleMove = (e: GestureResponderEvent) => {
    const touches = e.nativeEvent.touches;
    const s = stateRef.current;

    // Never handle 3-finger screenshot gestures
    if (touches.length >= 3) {
      s.multiTouchSeen = true;
      return;
    }

    if (touches.length === 2) {
      s.multiTouchSeen = true;
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
        onZoomChange(true, s.scale);
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
      onZoomChange(nextScale > 1.05, nextScale);
      return;
    }

    if (touches.length === 1) {
      const pt = getCoords(touches[0]);
      const dx = pt.x - s.singleStartX;
      const dy = pt.y - s.singleStartY;
      if (Math.hypot(dx, dy) > 8) {
        s.movedFar = true;
      }

      if (s.scale > 1.05) {
        const maxOffX = ((s.scale - 1) * width) / 2;
        const maxOffY = ((s.scale - 1) * height) / 2;
        const nextPanX = clamp(s.basePanX + dx, -maxOffX, maxOffX);
        const nextPanY = clamp(s.basePanY + dy, -maxOffY, maxOffY);

        s.panX = nextPanX;
        s.panY = nextPanY;
        panXAnim.setValue(nextPanX);
        panYAnim.setValue(nextPanY);
      } else if (dy > 14 && Math.abs(dy) > Math.abs(dx) * 1.35) {
        s.mode = 'pull_down';
        s.panY = dy * 0.65;
        panYAnim.setValue(s.panY);
      }
    }
  };

  const handleRelease = (e: GestureResponderEvent) => {
    const s = stateRef.current;
    if (e.nativeEvent.touches.length >= 2) return;

    if (s.mode === 'pull_down') {
      if (s.panY > 75) {
        onDismiss();
        return;
      }
      animateToScale(1, 0, 0);
      return;
    }

    // Snap back cleanly to 1x if pinched down close to 1x
    if (s.scale <= 1.08 && s.scale !== 1) {
      animateToScale(1, 0, 0);
      return;
    }

    if (s.scale > 1.05) {
      if (!s.movedFar && !s.multiTouchSeen) {
        const now = Date.now();
        if (now - s.lastTapAt < DOUBLE_TAP_DELAY_MS) {
          s.lastTapAt = 0;
          animateToScale(1, 0, 0);
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

    // At 1x scale: double tap zooms smoothly to 2.5x centered near tap point
    if (!s.movedFar && !s.multiTouchSeen) {
      const now = Date.now();
      if (now - s.lastTapAt < DOUBLE_TAP_DELAY_MS) {
        s.lastTapAt = 0;
        const targetScale = 2.5;
        const focalOffsetX = (width / 2 - s.singleStartX) * 0.8;
        const focalOffsetY = (height / 2 - s.singleStartY) * 0.8;
        animateToScale(targetScale, focalOffsetX, focalOffsetY);
        return;
      }
      s.lastTapAt = now;
    }
  };

  return (
    <View
      collapsable={false}
      onMoveShouldSetResponder={shouldMoveResponder}
      onMoveShouldSetResponderCapture={(e) => e.nativeEvent.touches.length === 2}
      onResponderGrant={handleGrant}
      onResponderMove={handleMove}
      onResponderRelease={handleRelease}
      onResponderTerminate={handleRelease}
      onResponderTerminationRequest={() =>
        stateRef.current.scale <= 1.05 && stateRef.current.mode !== 'pinch'
      }
      onStartShouldSetResponder={shouldStartResponder}
      onStartShouldSetResponderCapture={(e) => e.nativeEvent.touches.length === 2}
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
  const [currentScale, setCurrentScale] = useState(1);
  const [scaleCommand, setScaleCommand] = useState<{ id: number; targetScale: number } | null>(
    null,
  );
  const scrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);

  const handleMomentumScrollEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    if (windowWidth <= 0) return;
    const nextIdx = clamp(
      Math.round(e.nativeEvent.contentOffset.x / windowWidth),
      0,
      images.length - 1,
    );
    setInternalActive({ base: initialIndex, value: nextIdx });
    setAnySlideZoomed(false);
    setCurrentScale(1);
  };

  const handleZoomChange = useCallback((zoomed: boolean, scaleValue: number) => {
    setAnySlideZoomed(zoomed);
    setCurrentScale(scaleValue);
  }, []);

  const triggerScaleStep = (delta: number) => {
    const next = clamp(Math.round((currentScale + delta) * 2) / 2, MIN_SCALE, MAX_SCALE);
    setScaleCommand({ id: Date.now(), targetScale: next });
  };

  const triggerResetScale = () => {
    const next = currentScale > 1.05 ? 1 : 2.5;
    setScaleCommand({ id: Date.now(), targetScale: next });
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
            <View style={styles.counterWrap}>
              <Text style={styles.counterText}>{ `${Math.round(currentScale * 100)}%` }</Text>
            </View>
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
          scrollEnabled={!anySlideZoomed && images.length > 1}
          showsHorizontalScrollIndicator={false}
          snapToAlignment="center"
          snapToInterval={windowWidth}
          style={{ width: windowWidth, height: windowHeight }}
        >
          {images.map((imgUri, idx) => (
            <ZoomablePhotoSlide
              externalScaleCommand={idx === activeIndex ? scaleCommand : null}
              height={windowHeight}
              key={`${imgUri}-${idx}`}
              onDismiss={onClose}
              onZoomChange={handleZoomChange}
              testID={`zoom-slide-${postId}-${idx}`}
              uri={imgUri}
              width={windowWidth}
            />
          ))}
        </ScrollView>

        {/* Bottom floating zoom control bar */}
        <View style={styles.bottomControlsWrap}>
          <View style={styles.zoomControlsPill}>
            <Pressable
              accessibilityLabel="Zoom out"
              accessibilityRole="button"
              disabled={currentScale <= MIN_SCALE}
              hitSlop={10}
              onPress={() => triggerScaleStep(-0.75)}
              style={({ pressed }) => [
                styles.zoomControlBtn,
                currentScale <= MIN_SCALE && styles.zoomControlBtnDisabled,
                pressed && styles.closeBtnPressed,
              ]}
              testID={`zoom-out-btn-${postId}`}
            >
              <ZoomOut color="#FFFFFF" size={18} />
            </Pressable>

            <Pressable
              accessibilityLabel="Toggle zoom level"
              accessibilityRole="button"
              hitSlop={10}
              onPress={triggerResetScale}
              style={({ pressed }) => [styles.zoomResetBtn, pressed && styles.closeBtnPressed]}
              testID={`zoom-reset-btn-${postId}`}
            >
              {currentScale > 1.05 ? (
                <RotateCcw color="#FFFFFF" size={14} />
              ) : null}
              <Text style={styles.zoomPercentText}>
                {currentScale > 1.05 ? 'Reset 1x' : `${Math.round(currentScale * 100)}%`}
              </Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Zoom in"
              accessibilityRole="button"
              disabled={currentScale >= MAX_SCALE}
              hitSlop={10}
              onPress={() => triggerScaleStep(0.75)}
              style={({ pressed }) => [
                styles.zoomControlBtn,
                currentScale >= MAX_SCALE && styles.zoomControlBtnDisabled,
                pressed && styles.closeBtnPressed,
              ]}
              testID={`zoom-in-btn-${postId}`}
            >
              <ZoomIn color="#FFFFFF" size={18} />
            </Pressable>
          </View>
        </View>
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
  bottomControlsWrap: {
    alignItems: 'center',
    bottom: 36,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 50,
  },
  zoomControlsPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  zoomControlBtn: {
    alignItems: 'center',
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  zoomControlBtnDisabled: {
    opacity: 0.35,
  },
  zoomResetBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minWidth: 76,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  zoomPercentText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
});
