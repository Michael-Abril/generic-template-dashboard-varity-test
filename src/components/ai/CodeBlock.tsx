'use client';

import { useState, ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  children: ReactNode;
  className?: string;
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    // Extract text content from children
    const codeElement = document.querySelector(`[data-code-id="${className}"]`);
    const textContent = codeElement?.textContent || '';

    // Also try to get text from the children directly
    let text = '';
    if (typeof children === 'string') {
      text = children;
    } else if (children && typeof children === 'object' && 'props' in children) {
      const props = children as { props?: { children?: string } };
      text = props.props?.children || textContent;
    } else {
      text = textContent;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="relative group my-2">
      <pre
        className="bg-gray-100 rounded-lg overflow-x-auto"
        data-code-id={className}
      >
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className={`absolute top-2 right-2 p-1.5 rounded-md transition-all ${
          copied
            ? 'bg-green-100 text-green-600'
            : 'bg-white/80 text-gray-500 hover:bg-white hover:text-gray-700 opacity-0 group-hover:opacity-100'
        }`}
        title={copied ? 'Copied!' : 'Copy code'}
      >
        {copied ? (
          <Check className="w-4 h-4" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

export default CodeBlock;
