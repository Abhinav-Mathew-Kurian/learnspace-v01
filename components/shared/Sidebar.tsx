'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  ClipboardCheck,
  CalendarDays,
  BarChart3,
  Radio,
  Calendar,
  UserCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Megaphone,
  MessageCircle,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { UserRole } from '@/types';

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

const navByRole: Record<UserRole, NavItem[]> = {
  admin: [
    { href: '/admin/dashboard',  label: 'Dashboard',  Icon: LayoutDashboard },
    { href: '/admin/students',   label: 'Students',   Icon: GraduationCap   },
    { href: '/admin/teachers',   label: 'Teachers',   Icon: Users           },
    { href: '/admin/courses',    label: 'Courses',    Icon: BookOpen        },
    { href: '/admin/attendance', label: 'Attendance', Icon: ClipboardCheck  },
    { href: '/admin/events',     label: 'Events',     Icon: CalendarDays    },
    { href: '/admin/analytics',  label: 'Analytics',  Icon: BarChart3       },
    { href: '/admin/webinars',   label: 'Webinars',   Icon: Radio           },
    { href: '/admin/promotions', label: 'Promotions', Icon: Megaphone       },
    { href: '/admin/enquiries',  label: 'Enquiries',  Icon: MessageCircle   },
    { href: '/admin/ratings',    label: 'Ratings',    Icon: Star            },
  ],
  teacher: [
    { href: '/teacher/dashboard', label: 'Dashboard',    Icon: LayoutDashboard },
    { href: '/teacher/courses',   label: 'My Courses',   Icon: BookOpen        },
    { href: '/teacher/students',  label: 'My Students',  Icon: GraduationCap   },
    { href: '/teacher/live',      label: 'Live Classes', Icon: Radio           },
    { href: '/teacher/calendar',  label: 'Calendar',     Icon: Calendar        },
    { href: '/teacher/profile',   label: 'Profile',      Icon: UserCircle      },
  ],
  student: [
    { href: '/student/dashboard', label: 'Dashboard',    Icon: LayoutDashboard },
    { href: '/student/courses',   label: 'My Courses',   Icon: BookOpen        },
    { href: '/student/live',      label: 'Live Classes', Icon: Radio           },
    { href: '/student/calendar',  label: 'Calendar',     Icon: Calendar        },
    { href: '/student/profile',   label: 'Profile',      Icon: UserCircle      },
  ],
};

const roleBadge: Record<UserRole, string> = {
  admin:   'bg-violet-100 text-violet-700',
  teacher: 'bg-sky-100 text-sky-700',
  student: 'bg-emerald-100 text-emerald-700',
};

// These href prefixes show the event notification dot
const EVENT_HREFS = new Set([
  '/admin/events', '/teacher/calendar', '/student/calendar',
]);
const ENQUIRY_HREF = '/admin/enquiries';

interface SidebarProps {
  role: UserRole;
  userName: string;
  collapsed?: boolean;
  onToggle?: () => void;
  upcomingEventCount?: number;
  unreadEnquiryCount?: number;
  onMobileClose?: () => void;
}

export default function Sidebar({ role, userName, collapsed = false, onToggle, upcomingEventCount = 0, unreadEnquiryCount = 0, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const items = navByRole[role];

  // Live enquiry count: initialised from server-rendered prop, decremented via custom
  // events fired by the enquiries page each time a message is opened.
  const [liveEnquiryCount, setLiveEnquiryCount] = useState(unreadEnquiryCount);

  // Sync when the prop refreshes (happens on navigation — layout re-executes server-side).
  useEffect(() => {
    setLiveEnquiryCount(unreadEnquiryCount);
  }, [unreadEnquiryCount]);

  // Decrement whenever the enquiries page marks one as read.
  useEffect(() => {
    const handler = () => setLiveEnquiryCount((c) => Math.max(0, c - 1));
    window.addEventListener('enquiry-read', handler);
    return () => window.removeEventListener('enquiry-read', handler);
  }, []);

  return (
    <aside
      className={`bg-white border-r border-slate-200/80 h-full sticky top-0 flex flex-col shadow-sm flex-shrink-0 transition-all duration-200 ${
        collapsed ? 'w-[68px]' : 'w-60'
      }`}
    >
      {/* Logo + toggle */}
      <div className="px-3 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className={`flex items-center gap-2.5 min-w-0 ${collapsed ? 'justify-center w-full' : ''}`}>
          <Image src="/images/logo/HOWLFOOX-LOGO4.svg" alt="Howlfox Academy" width={108} height={99} className="h-12 w-auto object-contain flex-shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <Image src="/images/logo/HOWLFOOXTEXT.svg" alt="Howlfox" width={145} height={54} className="h-5 w-auto object-contain" />
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 block pl-0.5 -mt-0.5">Academy</span>
              <span className={`inline-flex mt-1 px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize ${roleBadge[role]}`}>
                {role}
              </span>
            </div>
          )}
        </div>
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            title="Close menu"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        )}
        {!collapsed && onToggle && !onMobileClose && (
          <button
            onClick={onToggle}
            title="Collapse sidebar"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && onToggle && (
        <div className="px-3 py-2 border-b border-slate-100 flex justify-center">
          <button
            onClick={onToggle}
            title="Expand sidebar"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <PanelLeftOpen size={16} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className={`flex-1 px-2 py-3 space-y-0.5 overflow-y-auto ${collapsed ? 'flex flex-col items-center' : ''}`}>
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          const isEventHref = EVENT_HREFS.has(href);
          const isEnquiryHref = href === ENQUIRY_HREF;
          const hasBadge =
            (isEventHref && upcomingEventCount > 0) ||
            (isEnquiryHref && liveEnquiryCount > 0);
          const badgeCount = isEventHref ? upcomingEventCount : isEnquiryHref ? liveEnquiryCount : 0;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`group flex items-center rounded-lg text-[13.5px] font-medium transition-all relative ${
                collapsed
                  ? 'w-10 h-10 justify-center'
                  : 'gap-3 px-3 py-2.5 w-full'
              } ${
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="relative flex-shrink-0">
                <Icon
                  size={18}
                  strokeWidth={active ? 2.5 : 2}
                  className={active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}
                />
                {hasBadge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                )}
              </span>
              {!collapsed && (
                <>
                  {label}
                  {hasBadge && (
                    <span className="ml-auto text-[10px] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 leading-none">
                      {badgeCount}
                    </span>
                  )}
                  {active && !hasBadge && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className={`border-t border-slate-100 py-3 ${collapsed ? 'px-2 flex flex-col items-center gap-1' : 'px-3 space-y-1'}`}>
        {collapsed ? (
          <>
            <div
              className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center"
              title={userName}
            >
              <span className="text-indigo-700 text-xs font-bold">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
              className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} strokeWidth={2} />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-700 text-xs font-bold">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{userName}</p>
                <p className="text-[11px] text-slate-400 capitalize">{role}</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={15} strokeWidth={2} />
              Sign out
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
