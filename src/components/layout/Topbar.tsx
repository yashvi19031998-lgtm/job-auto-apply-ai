'use client';

import * as React from 'react';
import { Menu, Bell } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:hidden">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="-ml-2 px-2" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
        <span className="font-bold text-lg tracking-tight">Job Auto Apply AI</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full px-0">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="sr-only">Notifications</span>
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 text-sm">
          YS
        </div>
      </div>
    </header>
  );
}
