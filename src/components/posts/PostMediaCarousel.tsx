import { type ComponentRef, useCallback, useRef, useState } from 'react';
import {
  Image,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import {
  isSafeMediaUri,
  layoutTokens,
  postRadii,
  postSpacing,
  postTypography,
  sanitizeMediaUris,
} from '../../theme/designSystem';
import { PostImageZoomModal } from './PostImageZoomModal';

export { isSafeMediaUri, sanitizeMediaUris };

interface CarouselSlideProps {
  uri: string;
  width: number;
  height: number;
  onPress: () => void;
  onImageError?: () => void;
  testID?: string;
}

function CarouselSlide({
  uri,
  width,
  height,
  onPress,
  onImageError,
  testID,
}: CarouselSlideProps) {
  return (
    <Pressable
      accessibilityHint="Tap to open full screen photo zoom"
      accessibilityLabel="Post photo"
      accessibilityRole="button"
      onPress={onPress}
      onTouchStart={(e) => {
        // If user touches with 2 fingers to zoom inline, pop up to real zoom immediately
        if (e.nativeEvent.touches.length >= 2) {
          onPress();
        }
      }}
      style={[styles.slideWrapper, { width, height }]}
      testID={testID}
    >
      <Image
        accessibilityLabel="Post attachment photo"
        onError={onImageError}
        resizeMode="cover"
        source={{ uri }}
        style={styles.fullImage}
      />
    </Pressable>
  );
}

export interface PostMediaCarouselProps {
  images: readonly string[];
  postId: string;
  onAllImagesError?: () => void;
}

export function PostMediaCarousel({
  images,
  postId,
  onAllImagesError,
}: PostMediaCarouselProps) {
  const { palette, scaleFont } = useAppearance();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const validImages = sanitizeMediaUris(images);
  const [failedIndices, setFailedIndices] = useState<Record<number, boolean>>({});
  const [measuredWidth, setMeasuredWidth] = useState<number>(0);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [zoomModalIndex, setZoomModalIndex] = useState<number | null>(null);

  const inlineScrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const isScrollingRef = useRef<boolean>(false);

  const displayImages = validImages.filter((_, idx) => !failedIndices[idx]);

  const safeActiveIndex = Math.min(activeIndex, Math.max(0, displayImages.length - 1));

  // Responsive dimensions across phones, foldables, tablets, landscape & desktop web
  const fallbackWidth = Math.max(240, Math.min(windowWidth - 82, 620));
  const slideWidth = measuredWidth > 40 ? Math.round(measuredWidth) : fallbackWidth;
  const isLandscape = windowWidth > windowHeight;
  const frameHeight = isLandscape
    ? Math.round(
        Math.min(
          slideWidth * layoutTokens.carouselLandscapeRatio,
          Math.max(layoutTokens.carouselMinHeight, windowHeight * 0.66),
        ),
      )
    : Math.round(
        Math.min(
          slideWidth * layoutTokens.carouselPortraitRatio,
          Math.max(layoutTokens.carouselMinHeight, windowHeight * 0.56),
        ),
      );

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 40 && Math.abs(nextWidth - measuredWidth) > 1) {
      setMeasuredWidth(nextWidth);
    }
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (slideWidth <= 0) return;
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.min(
      displayImages.length - 1,
      Math.max(0, Math.round(offsetX / slideWidth)),
    );
    if (nextIndex !== safeActiveIndex) {
      setActiveIndex(nextIndex);
    }
  };

  const handleSlideImageError = (originalIndex: number) => {
    setFailedIndices((prev) => {
      const next = { ...prev, [originalIndex]: true };
      const remaining = validImages.filter((_, i) => !next[i]);
      if (remaining.length === 0) {
        onAllImagesError?.();
      }
      return next;
    });
  };

  const handleOpenZoom = useCallback(
    (index: number) => {
      if (isScrollingRef.current) return;
      setZoomModalIndex(index);
    },
    [setZoomModalIndex],
  );

  if (displayImages.length === 0) {
    return null;
  }

  return (
    <View
      onLayout={handleContainerLayout}
      style={styles.root}
      testID={`post-media-carousel-${postId}`}
    >
      <View
        style={[
          styles.carouselFrame,
          {
            height: frameHeight,
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
          },
        ]}
      >
        {displayImages.length === 1 ? (
          <CarouselSlide
            height={frameHeight}
            onImageError={() => handleSlideImageError(0)}
            onPress={() => handleOpenZoom(0)}
            testID={`post-carousel-slide-${postId}-0`}
            uri={displayImages[0]}
            width={slideWidth}
          />
        ) : (
          <ScrollView
            bounces={false}
            decelerationRate="fast"
            directionalLockEnabled
            disableIntervalMomentum
            horizontal
            onMomentumScrollBegin={() => {
              isScrollingRef.current = true;
            }}
            onMomentumScrollEnd={(e) => {
              isScrollingRef.current = false;
              handleMomentumScrollEnd(e);
            }}
            onScrollBeginDrag={() => {
              isScrollingRef.current = true;
            }}
            onScrollEndDrag={() => {
              setTimeout(() => {
                isScrollingRef.current = false;
              }, 60);
            }}
            pagingEnabled={Platform.OS === 'ios'}
            ref={inlineScrollRef}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            snapToAlignment="center"
            snapToInterval={slideWidth}
            style={{ width: slideWidth, height: frameHeight }}
            testID={`post-carousel-scroll-${postId}`}
          >
            {displayImages.map((imgUri, idx) => (
              <CarouselSlide
                height={frameHeight}
                key={`${imgUri}-${idx}`}
                onImageError={() => handleSlideImageError(idx)}
                onPress={() => handleOpenZoom(idx)}
                testID={`post-carousel-slide-${postId}-${idx}`}
                uri={imgUri}
                width={slideWidth}
              />
            ))}
          </ScrollView>
        )}

        {/* Clean Instagram-style top-right counter pill for multi-image posts */}
        {displayImages.length > 1 && (
          <View
            pointerEvents="none"
            style={styles.counterPill}
            testID={`post-carousel-counter-${postId}`}
          >
            <Text
              style={[
                styles.counterPillText,
                { fontSize: scaleFont(postTypography.counterBadge.fontSize) },
              ]}
            >
              {safeActiveIndex + 1}/{displayImages.length}
            </Text>
          </View>
        )}
      </View>

      {/* Clean Instagram-style pagination dots below the carousel */}
      {displayImages.length > 1 && (
        <View style={styles.dotsRow} testID={`post-carousel-dots-${postId}`}>
          {displayImages.map((uri, idx) => {
            const isActive = idx === safeActiveIndex;
            return (
              <View
                key={`dot-${uri}-${idx}`}
                style={[
                  styles.dot,
                  isActive
                    ? {
                        backgroundColor: palette.primary,
                        width: 6,
                        height: 6,
                        opacity: 1,
                      }
                    : {
                        backgroundColor: palette.textMuted,
                        width: 5,
                        height: 5,
                        opacity: 0.35,
                      },
                ]}
                testID={`post-carousel-dot-${postId}-${idx}`}
              />
            );
          })}
        </View>
      )}

      {/* Pop-up real zoom modal: lifts the photo into full screen with smooth horizontal carousel */}
      {zoomModalIndex !== null && (
        <PostImageZoomModal
          images={displayImages}
          initialIndex={zoomModalIndex}
          onClose={() => setZoomModalIndex(null)}
          postId={postId}
          visible={zoomModalIndex !== null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: postSpacing.captionToMediaGap,
    width: '100%',
  },
  carouselFrame: {
    borderRadius: postRadii.media,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  slideWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullImage: {
    height: '100%',
    width: '100%',
  },
  counterPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: postRadii.pill,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: 'absolute',
    right: 10,
    top: 10,
    zIndex: 10,
  },
  counterPillText: {
    color: '#F8FAFC',
    fontVariant: ['tabular-nums'],
    fontWeight: postTypography.counterBadge.fontWeight,
    letterSpacing: postTypography.counterBadge.letterSpacing,
  },
  dotsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: postSpacing.carouselDotsGap,
    justifyContent: 'center',
    marginTop: postSpacing.carouselDotsTopGap,
    paddingVertical: 2,
  },
  dot: {
    borderRadius: postRadii.pill,
  },
});

