import React from 'react';
import { ExternalLink, Briefcase, User, MapPin, DollarSign, Calendar, Target } from 'lucide-react';
import { Lead } from '@/types/lead';

interface LeadCardProps {
  lead: Lead;
}

export function LeadCard({ lead }: LeadCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">{lead.title}</h3>
            {lead.company && (
              <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                <Briefcase size={14} />
                {lead.company}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              lead.leadType === 'job' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
            }`}>
              {lead.leadType === 'job' ? 'Job' : 'Freelance'}
            </span>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {lead.source}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-4 text-sm text-gray-600">
          {lead.location && (
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="text-gray-400" />
              <span className="truncate">{lead.location}</span>
            </div>
          )}
          {lead.budget && (
            <div className="flex items-center gap-1.5">
              <DollarSign size={14} className="text-gray-400" />
              <span className="truncate">{lead.budget}</span>
            </div>
          )}
          {lead.postedAt && (
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-gray-400" />
              <span className="truncate">{lead.postedAt}</span>
            </div>
          )}
        </div>

        {lead.description && (
          <p className="mt-4 text-sm text-gray-600 line-clamp-3">
            {lead.description}
          </p>
        )}

        {lead.matchScore !== undefined && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <Target size={16} className={lead.matchScore >= 80 ? 'text-green-600' : lead.matchScore >= 50 ? 'text-yellow-600' : 'text-red-500'} />
              <span className="font-semibold text-sm">Match Score: {lead.matchScore}%</span>
            </div>
            {lead.matchReason && <p className="text-xs text-gray-700">{lead.matchReason}</p>}
            {lead.skills && lead.skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {lead.skills.slice(0, 5).map(skill => (
                  <span key={skill} className="px-2 py-0.5 bg-white border border-blue-200 text-blue-700 rounded-full text-xs font-medium">
                    {skill}
                  </span>
                ))}
                {lead.skills.length > 5 && <span className="text-xs text-gray-500 ml-1">+{lead.skills.length - 5} more</span>}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 bg-gray-50 p-4 mt-auto">
        <a
          href={lead.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
        >
          Open Lead
          <ExternalLink size={16} />
        </a>
      </div>
    </div>
  );
}
