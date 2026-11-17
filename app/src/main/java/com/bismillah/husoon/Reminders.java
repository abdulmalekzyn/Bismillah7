package com.bismillah.husoon;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Calendar;

/** Daily wird reminders: stored as JSON [{h,m,title,text}], fired with inexact alarms (no special permission). */
final class Reminders {
    private static final String PREFS = "husoon", KEY = "reminders", CHANNEL = "wird";
    private static final int MAX = 8;

    private Reminders() {
    }

    static void save(Context c, String json) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply();
    }

    private static JSONArray load(Context c) {
        try {
            return new JSONArray(c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    static int count(Context c) {
        return load(c).length();
    }

    private static PendingIntent intent(Context c, int index) {
        Intent i = new Intent(c, ReminderReceiver.class).putExtra("index", index);
        return PendingIntent.getBroadcast(c, index, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void scheduleAll(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        JSONArray list = load(c);
        for (int i = 0; i < MAX; i++) {
            PendingIntent pi = intent(c, i);
            am.cancel(pi);
            JSONObject r = list.optJSONObject(i);
            if (r == null) continue;
            Calendar t = Calendar.getInstance();
            t.set(Calendar.HOUR_OF_DAY, r.optInt("h", 6));
            t.set(Calendar.MINUTE, r.optInt("m", 0));
            t.set(Calendar.SECOND, 0);
            t.set(Calendar.MILLISECOND, 0);
            if (t.getTimeInMillis() <= System.currentTimeMillis() + 5000) t.add(Calendar.DAY_OF_YEAR, 1);
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t.getTimeInMillis(), pi);
        }
    }

    static void show(Context c, int index) {
        JSONObject r = load(c).optJSONObject(index);
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (r == null || nm == null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, c.getString(R.string.channel_name), NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription(c.getString(R.string.channel_desc));
        nm.createNotificationChannel(ch);
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent tap = PendingIntent.getActivity(c, 100 + index, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_notif)
                .setColor(c.getColor(R.color.brand))
                .setContentTitle(r.optString("title", c.getString(R.string.app_name)))
                .setContentText(r.optString("text", ""))
                .setContentIntent(tap)
                .setAutoCancel(true)
                .build();
        try {
            nm.notify(100 + index, n);
        } catch (SecurityException ignored) {
            // notification permission not granted
        }
    }
}
