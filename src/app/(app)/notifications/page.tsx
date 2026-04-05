"use client";
import { api } from "@/trpc/react";
import { X, Bell, AlertTriangle, TrendingUp, Target, Info, Calendar } from "lucide-react";

const NOTIF_CONFIG: Record<string, {
  color: string; bg: string; border: string; icon: any;
}> = {
  budget_alert:    { color: "text-red-600",    bg: "bg-red-50",    border: "border-red-100",    icon: AlertTriangle },
  bill_reminder:   { color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-100", icon: Calendar      },
  income:          { color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100",   icon: TrendingUp    },
  goal_milestone:  { color: "text-green-600",  bg: "bg-green-50",  border: "border-green-100",  icon: Target        },
  weekly_summary:  { color: "text-gray-500",   bg: "bg-gray-50",   border: "border-gray-100",   icon: Info          },
  upcoming_bill:   { color: "text-pink-600",   bg: "bg-pink-50",   border: "border-pink-100",   icon: Calendar      },
};

function timeAgo(date: Date | string) {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (days >= 1) return `${days} Day${days > 1 ? "s" : ""} ago`;
  if (hours >= 1) return `${hours} Hour${hours > 1 ? "s" : ""} ago`;
  return "Just now";
}

export default function NotificationsPage() {
  const utils = api.useUtils();
  const { data: notifications = [] } = api.notification.list.useQuery();

  const markAllRead = api.notification.markAllRead.useMutation({
    onSuccess: () => void utils.notification.list.invalidate(),
  });
  const dismiss = api.notification.dismiss.useMutation({
    onSuccess: () => {
      void utils.notification.list.invalidate();
      void utils.notification.unreadCount.invalidate();
    },
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="border-b border-gray-100 bg-white px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications &amp; Alerts</h1>
          <p className="text-sm text-gray-400 mt-0.5">Stay Updated on your Financial Activities</p>
        </div>
        <Bell className="w-7 h-7 text-gray-400" />
      </div>

      <div className="px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black text-gray-900">Recent Notifications</h2>
            {notifications.some(n => !n.isRead) && (
              <button type="button" onClick={() => markAllRead.mutate()}
                className="text-sm text-teal-600 font-semibold hover:underline">
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Bell className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map(n => {
                const config = NOTIF_CONFIG[n.type] ?? NOTIF_CONFIG.weekly_summary!;
                const Icon   = config.icon;
                return (
                  <div key={n.id}
                    className={`relative rounded-2xl border p-4 flex items-start gap-4 transition ${config.bg} ${config.border} ${!n.isRead ? "shadow-sm" : "opacity-80"}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.bg} border ${config.border}`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <p className={`font-bold text-sm ${!n.isRead ? "text-gray-900" : "text-gray-600"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-[11px] text-gray-400 mt-1.5">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <div className="absolute top-4 right-10 w-2 h-2 rounded-full bg-teal-500" />
                    )}
                    <button type="button" onClick={() => dismiss.mutate({ id: n.id })}
                      className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
