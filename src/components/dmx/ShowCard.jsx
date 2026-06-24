import { Link } from 'react-router-dom';
import { Folder, Users, ChevronRight } from 'lucide-react';

export default function ShowCard({ show, currentEmail }) {
  const isOwner = show.created_by === currentEmail;
  const memberCount = (show.members?.length || 0) + 1; // +1 for owner

  return (
    <Link
      to={`/shows/${show.id}`}
      className="block bg-[#161920] border border-[#2A2D35] rounded-lg p-4 hover:border-[#00E5FF]/40 transition-colors group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center flex-shrink-0">
            <Folder className="w-4 h-4 text-[#00E5FF]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-white truncate">{show.name}</h3>
            {show.description && (
              <p className="text-xs text-[#6B7280] mt-0.5 truncate">{show.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-[#6B7280]">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {memberCount} member{memberCount !== 1 ? 's' : ''}
              </span>
              <span className={isOwner ? 'text-[#00E5FF]' : 'text-[#6B7280]'}>
                {isOwner ? 'Owner' : 'Member'}
              </span>
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#4B5563] group-hover:text-[#00E5FF] transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}