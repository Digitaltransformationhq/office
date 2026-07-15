import React from 'react';
import { Menu, LogOut } from 'lucide-react';

interface NavbarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onLogout: () => void;
  onMobileMenuToggle: () => void;
}

const NAVY = '#1b365d';
const GREEN = '#4ea72e';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Navbar({ user, onLogout, onMobileMenuToggle }: NavbarProps) {
  const firstName = user.name.split(' ')[0];
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#E7EDF4] bg-white px-4 md:px-6">
      {/* Left — mobile menu + greeting */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#F4F6F9] md:hidden"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <div className="leading-tight">
          <p className="text-[0.98rem] font-semibold" style={{ color: NAVY }}>
            {greeting()}, {firstName}
          </p>
          <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{today}</p>
        </div>
      </div>

      {/* Right — identity + logout */}
      <div className="flex items-center gap-3 md:gap-4">
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-sm font-medium" style={{ color: NAVY }}>{user.name}</p>
          <p className="text-xs capitalize text-muted-foreground">{user.role.replace('-', ' ')}</p>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-white ring-2 ring-white shadow-[0_2px_8px_-2px_rgba(78,167,46,0.6)]"
          style={{ backgroundColor: GREEN }}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className="hidden h-7 w-px bg-[#E7EDF4] sm:block" />
        <button
          onClick={onLogout}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#FDEBEC] hover:text-destructive"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
