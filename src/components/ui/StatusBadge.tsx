import * as React from 'react';
import { Badge } from './Badge';

interface StatusBadgeProps {
  status: 'Pending' | 'Sent' | 'Skipped' | 'Duplicate' | 'Failed';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case 'Sent':
      return <Badge variant="success">Sent</Badge>;
    case 'Pending':
      return <Badge variant="warning">Pending</Badge>;
    case 'Failed':
      return <Badge variant="danger">Failed</Badge>;
    case 'Skipped':
    case 'Duplicate':
      return <Badge variant="secondary">{status}</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}
