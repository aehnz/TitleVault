import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubmission } from '@/hooks/useSubmissions';
import StatusBadge from '@/components/shared/StatusBadge';

const AppHeader: React.FC = () => {
  const { user } = useAuth();
  const { submissionId } = useParams<{ submissionId: string }>();
  const { data: currentSubmission } = useSubmission(submissionId);
  const navigate = useNavigate();

  return (
    <header className="gov-header">
      {/* Left side - Title */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Building2 className="w-5 h-5 text-primary" />
        <h1 className="gov-title">Surveyor Panel</h1>
        <span className="text-muted-foreground text-sm font-normal">• Property Registry</span>
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-8" />

      {/* Right side - Actions */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {currentSubmission && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground hidden sm:inline">Current:</span>
            <StatusBadge status={currentSubmission.meta.status} />
          </div>
        )}

        <button className="p-2 rounded-lg hover:bg-muted transition-colors relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </button>

        {user && (
          <div className="flex items-center gap-2 pl-4 border-l border-border">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium hidden md:block">{user.name}</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
