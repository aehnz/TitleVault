import React, { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
  badge?: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  variant?: 'default' | 'card' | 'panel';
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = true,
  icon,
  badge,
  className,
  headerClassName,
  contentClassName,
  variant = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const variantStyles = {
    default: {
      wrapper: '',
      header: 'py-2 px-3 hover:bg-accent/50 rounded-lg transition-colors',
      content: 'px-3 py-2',
    },
    card: {
      wrapper: 'border rounded-lg overflow-hidden',
      header: 'py-3 px-4 bg-card hover:bg-accent/30 transition-colors',
      content: 'p-4 border-t bg-card/50',
    },
    panel: {
      wrapper: 'border-b border-[hsl(var(--panel-border))]',
      header: 'py-2 px-3 bg-[hsl(var(--panel-header))] hover:bg-accent/30 transition-colors',
      content: 'p-3',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn(styles.wrapper, className)}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex items-center justify-between w-full text-left group',
            styles.header,
            headerClassName
          )}
        >
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
            {icon && <span className="text-muted-foreground">{icon}</span>}
            <span className="font-medium text-sm">{title}</span>
          </div>
          {badge}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className={cn(styles.content, contentClassName)}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default CollapsibleSection;
