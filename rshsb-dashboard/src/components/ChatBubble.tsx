'use client';

interface ChatBubbleProps {
  message: string;
  direction: 'incoming' | 'outgoing';
  timestamp: string;
  waNumber?: string;
  isLast?: boolean;
}

export default function ChatBubble({ message, direction, timestamp, waNumber }: ChatBubbleProps) {
  // Format timestamp to a readable time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${direction === 'incoming' ? 'justify-start' : 'justify-end'} w-full`}>
      <div className={`max-w-md`}>
        <div
          className={`relative p-3 rounded-lg ${
            direction === 'incoming'
              ? 'bg-gray-100 text-gray-800 rounded-tl-none'
              : 'bg-[#8e003b] text-white rounded-tr-none ml-auto'
          }`}
        >
          {/* Chat bubble tail */}
          <div 
            className={`absolute top-0 w-4 h-4 ${
              direction === 'incoming'
                ? '-left-2 bg-gray-100'
                : '-right-2 bg-[#8e003b]'
            }`}
            style={{
              clipPath: direction === 'incoming'
                ? 'polygon(100% 0, 0 0, 100% 100%)'
                : 'polygon(0 0, 100% 0, 0 100%)'
            }}
          ></div>
          
          {/* Message content */}
          <div className="whitespace-pre-wrap break-words">{message}</div>
          
          {/* Timestamp */}
          <div className={`text-xs mt-1 ${direction === 'incoming' ? 'text-gray-500' : 'text-pink-100'} text-right`}>
            {formatTime(timestamp)}
          </div>
        </div>
        
        {/* Phone number label for incoming messages */}
        {direction === 'incoming' && waNumber && (
          <div className="text-xs text-gray-500 ml-1 mt-1">
            {waNumber}
          </div>
        )}
      </div>
    </div>
  );
}
