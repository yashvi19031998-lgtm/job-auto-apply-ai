import * as React from 'react';
import { Badge } from './Badge';

interface MatchScoreBadgeProps {
  score: number | null;
}

export function MatchScoreBadge({ score }: MatchScoreBadgeProps) {
  if (score === null) return <Badge variant="secondary">N/A</Badge>;

  if (score >= 70) {
    return <Badge variant="success">{score}% Match</Badge>;
  }
  if (score >= 50) {
    return <Badge variant="warning">{score}% Match</Badge>;
  }
  return <Badge variant="danger">{score}% Match</Badge>;
}
