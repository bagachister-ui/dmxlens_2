import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Activity, LayoutGrid, Plug, Camera, GitCompareArrows } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { dmxStore } from '@/lib/dmxStore';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutGrid },
  { label: 'Sources & Connection', path: '/setup', icon: Plug },
  { label: 'Compare', path: '/compare', icon: GitCompareArrows },
  { label: 'Snapshots', path: '/snapshots', icon: Camera },
];

export default function Layout() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [sourceCount, setSourceCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sources = await base44.entities.DMXSource.list();
        if (mounted) {
          setSourceCount(sources.length);
          dmxStore.setSources(sources);
        }
      } catch (e) {
        // Entity may not be accessible in public mode — app still works with local state
        console.error('Failed to load sources:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0D0F14]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#2A2D35] border-t-[#00E5FF] rounded-full animate-spin" />
          <span className="text-xs text-[#6B7280] font-mono tracking-wider">INITIALIZING DMX ENGINE</span>
        </div>
      </div>
    );
  }

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
              {dmxStore.mode === 'live' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  <span className="text-[10px] font-mono text-[#22C55E]">LIVE</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  <span className="text-[10px] font-mono text-[#F59E0B]">SIM</span>
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