import { useState, useEffect } from 'react';
import { Plus, FolderOpen, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ShowCard from '@/components/dmx/ShowCard';
import CreateShowDialog from '@/components/dmx/CreateShowDialog';

export default function Shows() {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [email, setEmail] = useState('');

  const loadShows = async () => {
    const me = await base44.auth.me();
    setEmail(me.email);
    const all = await base44.entities.Show.list('-updated_date');
    // Only shows the user owns or is a member of
    const visible = all.filter(
      (s) => s.created_by === me.email || (s.members || []).includes(me.email.toLowerCase())
    );
    setShows(visible);
    setLoading(false);
  };

  useEffect(() => {
    loadShows();
  }, []);

  const handleCreate = async ({ name, description }) => {
    await base44.entities.Show.create({ name, description, members: [] });
    setShowDialog(false);
    await loadShows();
  };

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4 border-b border-[#2A2D35] flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">Shows</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Cloud containers for snapshot series, shared with your team
          </p>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#00E5FF] text-[#0D0F14] rounded-md text-xs font-medium hover:bg-[#00E5FF]/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Show
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#00E5FF] animate-spin" />
          </div>
        ) : shows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#161920] border border-[#2A2D35] flex items-center justify-center mb-4">
              <FolderOpen className="w-7 h-7 text-[#4B5563]" />
            </div>
            <h2 className="text-sm font-medium text-gray-300 mb-1">No shows yet</h2>
            <p className="text-xs text-[#6B7280] max-w-sm">
              Create a show to store a series of snapshots in the cloud and share them with specific team members.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shows.map((show) => (
              <ShowCard key={show.id} show={show} currentEmail={email} />
            ))}
          </div>
        )}
      </div>

      {showDialog && (
        <CreateShowDialog onClose={() => setShowDialog(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}