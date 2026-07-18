import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const flowerSources = [
  require('../../assets/nc-flower-grow-a.json'),
  require('../../assets/nc-flower-grow-b.json'),
];

let LottieView: React.ComponentType<any> | null = null;
try {
  LottieView = require('lottie-react-native').default ?? require('lottie-react-native');
} catch {
  // The static garden background is still safe in clients without the native module.
}

const lottieAvailable = LottieView != null;

export function NcFlowerSpot({ variant, layoutScale, swayDelayMs = 0 }: { variant: 0 | 1; layoutScale: number; swayDelayMs?: number }) {
  const lottieRef = useRef<any>(null);
  const rotation = useSharedValue(0);
  const swayX = useSharedValue(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      rotation.value = withRepeat(withSequence(
        withTiming(5, { duration: 1700, easing: Easing.inOut(Easing.sin) }),
        withTiming(-5, { duration: 1700, easing: Easing.inOut(Easing.sin) }),
      ), -1, true);
      swayX.value = withRepeat(withSequence(
        withTiming(3, { duration: 1700, easing: Easing.inOut(Easing.sin) }),
        withTiming(-3, { duration: 1700, easing: Easing.inOut(Easing.sin) }),
      ), -1, true);
    }, swayDelayMs);
    return () => clearTimeout(timeout);
  }, [rotation, swayDelayMs, swayX]);

  const swayStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swayX.value }, { rotate: `${rotation.value}deg` }],
  }));

  if (!lottieAvailable || !LottieView) return null;
  const flower = (
    <LottieView
      ref={lottieRef}
      source={flowerSources[variant]}
      style={{ width: 135 * layoutScale, height: 184 * layoutScale }}
      resizeMode="contain"
      loop={false}
      autoPlay={false}
      {...(Platform.OS === 'web'
        ? { onAnimationLoaded: () => lottieRef.current?.play(59, 59) }
        : { progress: 1 })}
      renderMode={Platform.OS === 'android' ? 'SOFTWARE' : 'AUTOMATIC'}
    />
  );

  return <View style={styles.clip}><Animated.View style={[styles.swayOrigin, swayStyle]}>{flower}</Animated.View></View>;
}

const styles = StyleSheet.create({
  clip: { overflow: 'visible', alignItems: 'center', justifyContent: 'flex-end' },
  swayOrigin: { alignItems: 'center', justifyContent: 'flex-end' },
});
