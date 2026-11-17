package com.bismillah.husoon;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class ReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Reminders.show(context, intent.getIntExtra("index", 0));
        Reminders.scheduleAll(context); // arm the same reminder for tomorrow
    }
}
