import { registerPlugin, Capacitor } from '@capacitor/core';

const AudioRoute = registerPlugin('AudioRoute');

export const audioRouteService = {
  setSpeakerphoneOn: async (enabled) => {
    try {
      if (Capacitor.isNativePlatform()) {
        await AudioRoute.setSpeakerphoneOn({ enabled: !!enabled });
      }
    } catch (err) {
      console.warn('Native setSpeakerphoneOn error:', err);
    }
  },

  resetAudioMode: async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await AudioRoute.resetAudioMode();
      }
    } catch (err) {
      console.warn('Native resetAudioMode error:', err);
    }
  }
};
