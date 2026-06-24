import { useState } from 'react';
import { Users, Plus, X, Crown } from 'lucide-react';

export default function MemberManager({ ownerEmail, members, onChange, disabled }) {
  const [email, setEmail] = useState('');

  const addMember = () => {
    const e = email.trim().toLowerCase();
    if (!e || e === ownerEmail?.toLowerCase() || members.includes(e)) {
      setEmail('');
      return;
    }
    onChange([...members, e]);
    setEmail('');
  };

  const removeMember = (e) => {
    onChange(members.filter((m) => m !== e));
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-[#00E5FF]" />
        <h3 className="text-sm font-semibold text-white">Members</h3>
      </div>

      <div className="space-y-1.5 mb-3">
        {/* Owner */}
        <div className="flex items-center justify-between bg-[#0D0F14] border border-[#2A2D35] rounded-md px-3 py-2">
          <span className="text-xs text-white font-mono truncate">{ownerEmail}</span>
          <span className="flex items-center gap-1 text-[10px] text-[#F59E0B] font-mono flex-shrink-0">
            <Crown className="w-3 h-3" />
            Owner
          </span>
        </div>
        {/* Members */}
        {members.map((m) => (
          <div
            key={m}
            className="flex items-center justify-between bg-[#0D0F14] border border-[#2A2D35] rounded-md px-3 py-2"
          >
            <span className="text-xs text-[#9CA3AF] font-mono truncate">{m}</span>
            {!disabled && (
              <button
                onClick={() => removeMember(m)}
                className="p-0.5 text-[#6B7280] hover:text-[#EF4444] rounded flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {!disabled && (
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMember()}
            placeholder="member@email.com"
            className="flex-1 bg-[#0D0F14] border border-[#2A2D35] rounded-md px-3 py-2 text-xs text-white font-mono placeholder-[#4B5563] focus:outline-none focus:border-[#00E5FF]/50 transition-colors"
          />
          <button
            onClick={addMember}
            disabled={!email.trim()}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30 rounded-md text-xs hover:bg-[#00E5FF]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      )}
    </div>
  );
}