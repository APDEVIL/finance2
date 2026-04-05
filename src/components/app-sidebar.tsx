// src/components/app-sidebar.tsx
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ArrowLeftRight, Target, BarChart3,
  Bell, Settings, LogOut, BookMarked,
} from "lucide-react";
import { signOut } from "@/server/better-auth/client";
import { api } from "@/trpc/react";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard",     label: "Dashboard",      icon: LayoutDashboard },
  { href: "/transactions",  label: "Transactions",   icon: ArrowLeftRight  },
  { href: "/budget-goals",  label: "Budget & Goals", icon: Target          },
  { href: "/reports",       label: "Reports",        icon: BarChart3       },
  { href: "/notifications", label: "Notifications",  icon: Bell            },
  { href: "/settings",      label: "Settings",       icon: Settings        },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [showLogout, setShowLogout] = useState(false);

  const { data: profile }      = api.profile.me.useQuery();
  const { data: unreadCount }  = api.notification.unreadCount.useQuery();

  async function handleLogout() {
    await signOut();
    router.push("/sign-in");
  }

  return (
    <>
      <aside className="w-64 h-full bg-white border-r border-gray-100 flex flex-col shadow-sm shrink-0">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center shadow-sm">
              <BookMarked className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-teal-600 leading-tight">Finance Hub</p>
              <p className="text-[11px] text-gray-400 leading-tight">Manage your money</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon    = item.icon;
            const active  = pathname.startsWith(item.href);
            const isNotif = item.href === "/notifications";
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group ${
                  active
                    ? "bg-teal-50 text-teal-700 font-semibold"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}>
                <Icon className={`w-4.5 h-4.5 shrink-0 ${active ? "text-teal-600" : "text-gray-400 group-hover:text-gray-600"}`} style={{ width: 18, height: 18 }} />
                <span className="flex-1">{item.label}</span>
                {isNotif && unreadCount && unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-gray-100 p-4 space-y-3">
          {profile && (
            <div className="flex items-center gap-3 px-1">
              <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-sm font-bold text-teal-700 shrink-0 overflow-hidden">
                {profile.image
                  ? <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
                  : profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">{profile.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{profile.email}</p>
              </div>
            </div>
          )}
          <button type="button"
            onClick={() => setShowLogout(true)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition">
            <LogOut style={{ width: 16, height: 16 }} />
            <span className="text-xs font-medium">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Logout confirmation dialog */}
      <Dialog open={showLogout} onOpenChange={setShowLogout}>
        <DialogContent className="sm:max-w-sm bg-gray-900 border-0 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-base font-semibold">
              Are you sure you want to Log out?
            </DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => setShowLogout(false)}
              className="flex-1 bg-white text-gray-900 hover:bg-gray-100 border-white font-semibold rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleLogout}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl">
              Log out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}