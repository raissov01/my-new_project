"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { UserPlus, Check, X, Search } from "lucide-react";
import type { FriendWithStats, UserSearchResult } from "@/features/gamification/api";
import { searchUsers, sendFriendRequest, acceptFriendRequest } from "@/features/gamification/api";

interface FriendListProps {
  friends: FriendWithStats[];
  pendingRequests: FriendWithStats[];
}

export function FriendList({ friends, pendingRequests }: FriendListProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const doSearch = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    const res = await searchUsers(query.trim());
    setResults(res);
    setSearching(false);
  };

  const doSend = (targetId: string) => {
    startTransition(async () => {
      await sendFriendRequest(targetId);
      setSentIds((prev) => new Set([...prev, targetId]));
    });
  };

  const doAccept = (requesterId: string) => {
    startTransition(async () => {
      await acceptFriendRequest(requesterId);
    });
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Add a friend</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="Username or invite code (e.g. ABCD-1234)"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Search for friends"
            />
          </div>
          <button
            onClick={doSearch}
            disabled={searching}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {searching ? "..." : "Search"}
          </button>
        </div>

        {results.length > 0 && (
          <ul className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
            {results.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                  {u.avatarUrl ? <Image src={u.avatarUrl} alt={u.username} width={32} height={32} className="object-cover" /> : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-gray-500 text-sm">{u.username[0]?.toUpperCase()}</div>
                  )}
                </div>
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{u.username}</span>
                <span className="text-xs text-orange-500">🔥 {u.streakDays}</span>
                <button
                  onClick={() => doSend(u.id)}
                  disabled={sentIds.has(u.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:bg-green-500"
                  aria-label={`Add ${u.username} as friend`}
                >
                  {sentIds.has(u.id) ? <><Check size={12} /> Sent</> : <><UserPlus size={12} /> Add</>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Friend requests ({pendingRequests.length})
          </p>
          <ul className="space-y-2">
            {pendingRequests.map((f) => (
              <li key={f.userId} className="flex items-center gap-3 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{f.username}</span>
                <button onClick={() => doAccept(f.userId)} className="p-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600" aria-label="Accept">
                  <Check size={14} />
                </button>
                <button className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-gray-300" aria-label="Decline">
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Friend list */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Friends ({friends.length})
        </p>
        {friends.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No friends yet. Share your invite code!</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            {friends.map((f) => (
              <li key={f.userId} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                  {f.avatarUrl ? <Image src={f.avatarUrl} alt={f.username} width={32} height={32} className="object-cover" /> : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-gray-500 text-sm">{f.username[0]?.toUpperCase()}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{f.username}</p>
                  <p className="text-xs text-gray-400">🔥 {f.streakDays} day streak</p>
                </div>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {f.weeklyXp.toLocaleString()} XP
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
