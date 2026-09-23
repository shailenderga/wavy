package com.wavy.chatapp;

import android.content.Context;
import android.media.AudioManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AudioRoute")
public class AudioRoutePlugin extends Plugin {

    @PluginMethod
    public void setSpeakerphoneOn(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        try {
            AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
                audioManager.setSpeakerphoneOn(enabled);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to set speakerphone: " + e.getMessage());
        }
    }

    @PluginMethod
    public void resetAudioMode(PluginCall call) {
        try {
            AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                audioManager.setSpeakerphoneOn(false);
                audioManager.setMode(AudioManager.MODE_NORMAL);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to reset audio mode: " + e.getMessage());
        }
    }
}
