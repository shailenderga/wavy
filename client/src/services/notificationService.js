import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

let channelCreated = false;

export async function initNotificationService() {
  try {
    if (Capacitor.isNativePlatform()) {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }

      if (!channelCreated) {
        // High importance channel for incoming messages
        await LocalNotifications.createChannel({
          id: 'wavy_messages',
          name: 'Wavy Messages',
          description: 'Notifications for incoming chat messages',
          importance: 5,
          visibility: 1,
          vibration: true,
          sound: 'default'
        });

        // Urgent channel for incoming voice and video calls
        await LocalNotifications.createChannel({
          id: 'wavy_calls',
          name: 'Wavy Calls',
          description: 'Notifications for incoming audio and video calls',
          importance: 5,
          visibility: 1,
          vibration: true,
          sound: 'default'
        });

        channelCreated = true;
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }
  } catch (err) {
    console.warn('Failed to initialize notifications:', err);
  }
}

export async function notifyNewMessage({ senderName, content, roomId, avatar }) {
  try {
    const textPreview = content || 'Sent you an attachment';
    const title = senderName ? `${senderName}` : 'New Wavy Message';

    if (Capacitor.isNativePlatform()) {
      const notifId = Math.floor(Math.random() * 1000000) + 1;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body: textPreview,
            channelId: 'wavy_messages',
            smallIcon: 'ic_launcher',
            sound: 'default',
            actionTypeId: '',
            extra: { roomId }
          }
        ]
      });
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(title, {
        body: textPreview,
        icon: avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wavy',
        tag: `room_${roomId}`
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
  } catch (err) {
    console.warn('Error displaying message notification:', err);
  }
}

export async function notifyIncomingCall({ callerName, callType, callerAvatar }) {
  try {
    const typeLabel = callType === 'video' ? 'Video' : 'Audio';
    const title = `Incoming Wavy ${typeLabel} Call`;
    const body = `${callerName} is calling you`;

    if (Capacitor.isNativePlatform()) {
      const notifId = Math.floor(Math.random() * 1000000) + 1;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            channelId: 'wavy_calls',
            smallIcon: 'ic_launcher',
            sound: 'default'
          }
        ]
      });
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(title, {
        body,
        icon: callerAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User',
        tag: 'wavy_incoming_call',
        requireInteraction: true
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
  } catch (err) {
    console.warn('Error displaying call notification:', err);
  }
}
