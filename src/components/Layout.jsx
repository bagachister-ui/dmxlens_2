import { Link, useLocation, Outlet } from 'react-router-dom';
import { Activity, LayoutGrid, Plug, Camera, GitCompareArrows } from 'lucide-react';
import { useDMXStore } from '@/hooks/useDMXStore';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutGrid },
  { label: 'Connection', path: '/setup', icon: Plug },
  { label: 'Compare', path: '/compare', icon: GitCompareArrows },
  { label: 'Snapshots', path: '/snapshots', icon: Camera },
];

export default function Layout() {
  const location = useLocation();
  const store = useDMXStore();
  const sourceCount = store.getAllUniverses().length;

  return (
    <div className="flex h-screen bg-[#0D0F14] text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-[#2A2D35] bg-[#0D0F14] flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#2A2D35]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-[#00E5FF]" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-white">DMX Signal Reader</div>
              <div className="text-[10px] text-[#6B7280] font-mono tracking-wider">sACN · Art-Net</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active =
              location.pathname === item.path ||
              (item.path === '/setup' &&
                (location.pathname === '/sources' || location.pathname === '/connection'));
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-[#00E5FF]/10 text-[#00E5FF]'
                    : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mode indicator */}
        <div className="px-4 py-4 border-t border-[#2A2D35] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#6B7280] font-mono tracking-wider uppercase">Mode</span>
            <div className="flex items-center gap-1.5">
              {store.mode === 'live' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  <span className="text-[10px] font-mono text-[#22C55E]">LIVE</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" />
                  <span className="text-[10px] font-mono text-[#6B7280]">OFFLINE</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#6B7280] font-mono tracking-wider uppercase">Sources</span>
            <span className="text-[10px] font-mono text-gray-300">{sourceCount}</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}