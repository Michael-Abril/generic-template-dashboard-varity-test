'use client';

import React, { useState } from 'react';
import {
  Hash,
  Lock,
  ChevronDown,
  ChevronRight,
  Plus,
  Circle
} from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  type: 'channel' | 'dm';
  is_private?: boolean;
  unread?: number;
  online?: boolean;
  status_text?: string;
}

interface ChannelListProps {
  channels: Channel[];
  dms: Channel[];
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
}

export function ChannelList({
  channels,
  dms,
  selectedChannel,
  onSelectChannel
}: ChannelListProps) {
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [dmsExpanded, setDmsExpanded] = useState(true);

  return (
    <div className="px-2 space-y-4">
      {/* Channels Section */}
      <div>
        <button
          onClick={() => setChannelsExpanded(!channelsExpanded)}
          className="flex items-center justify-between w-full px-2 py-1 hover:bg-purple-800 rounded text-sm mb-1"
        >
          <div className="flex items-center gap-1">
            {channelsExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span className="font-semibold">Channels</span>
          </div>
          <Plus className="h-4 w-4" />
        </button>

        {channelsExpanded && (
          <div className="space-y-0.5">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel)}
                className={`
                  flex items-center gap-2 w-full px-2 py-1 rounded text-sm
                  ${
                    selectedChannel?.id === channel.id
                      ? 'bg-purple-700 text-white'
                      : 'hover:bg-purple-800 text-purple-100'
                  }
                `}
              >
                {channel.is_private ? (
                  <Lock className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <Hash className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="truncate">{channel.name}</span>
                {channel.unread && channel.unread > 0 && (
                  <span className="ml-auto bg-white text-purple-900 text-xs rounded px-1.5 py-0.5 font-bold">
                    {channel.unread}
                  </span>
                )}
              </button>
            ))}

            {channels.length === 0 && (
              <div className="px-2 py-4 text-center text-purple-300 text-xs">
                No channels yet
              </div>
            )}

            <button className="flex items-center gap-2 w-full px-2 py-1 rounded text-sm text-purple-300 hover:bg-purple-800 hover:text-white">
              <Plus className="h-4 w-4" />
              <span>Add channels</span>
            </button>
          </div>
        )}
      </div>

      {/* Direct Messages Section */}
      <div>
        <button
          onClick={() => setDmsExpanded(!dmsExpanded)}
          className="flex items-center justify-between w-full px-2 py-1 hover:bg-purple-800 rounded text-sm mb-1"
        >
          <div className="flex items-center gap-1">
            {dmsExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span className="font-semibold">Direct messages</span>
          </div>
          <Plus className="h-4 w-4" />
        </button>

        {dmsExpanded && (
          <div className="space-y-0.5">
            {dms.slice(0, 10).map((dm) => (
              <button
                key={dm.id}
                onClick={() => onSelectChannel(dm)}
                className={`
                  flex items-center gap-2 w-full px-2 py-1 rounded text-sm
                  ${
                    selectedChannel?.id === dm.id
                      ? 'bg-purple-700 text-white'
                      : 'hover:bg-purple-800 text-purple-100'
                  }
                `}
              >
                <div className="relative flex-shrink-0">
                  <div className="h-6 w-6 rounded bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    {dm.name[0].toUpperCase()}
                  </div>
                  {dm.online && (
                    <Circle
                      className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-green-500 text-green-500"
                    />
                  )}
                </div>
                <div className="flex-1 truncate text-left">
                  <div className="truncate">{dm.name}</div>
                  {dm.status_text && (
                    <div className="text-xs text-purple-300 truncate">
                      {dm.status_text}
                    </div>
                  )}
                </div>
                {dm.unread && dm.unread > 0 && (
                  <span className="ml-auto bg-white text-purple-900 text-xs rounded px-1.5 py-0.5 font-bold">
                    {dm.unread}
                  </span>
                )}
              </button>
            ))}

            {dms.length === 0 && (
              <div className="px-2 py-4 text-center text-purple-300 text-xs">
                No direct messages yet
              </div>
            )}

            {dms.length > 10 && (
              <button className="flex items-center gap-2 w-full px-2 py-1 rounded text-sm text-purple-300 hover:bg-purple-800 hover:text-white">
                <span>Show more ({dms.length - 10})</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Apps Section */}
      <div>
        <button className="flex items-center gap-1 w-full px-2 py-1 hover:bg-purple-800 rounded text-sm">
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold">Apps</span>
        </button>
      </div>
    </div>
  );
}
