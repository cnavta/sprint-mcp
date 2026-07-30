/**
 * Type definitions for Sprint Protocol entities
 */

export type SprintStatus =
  | 'planning'
  | 'in-progress'
  | 'validating'
  | 'verifying'
  | 'published'
  | 'complete';

export interface SprintManifest {
  id: string;
  title: string;
  goal: string;
  owner: string;
  createdAt: string;
  status: SprintStatus;
  links?: {
    pr?: string;
    branch: string;
  };
  notes?: string;
}

export interface RequestLogEntry {
  timestamp: string;
  requestId: string;
  prompt: string;
  interpretation: string;
  commands?: string[];
  filesModified?: string[];
}

export interface DeliverableItem {
  description: string;
  completed: boolean;
}

export interface VerificationReport {
  completed: DeliverableItem[];
  partial: DeliverableItem[];
  deferred: DeliverableItem[];
  alignmentNotes?: string;
}

export interface PublicationInfo {
  pr_url?: string;
  branch: string;
  status: 'created' | 'failed' | 'pending';
  error?: string;
}
