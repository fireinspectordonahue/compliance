/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProjectStatus = 'Inspection' | 'Overdue' | 'Incomplete' | 'Reinspect' | 'Overdue Reinspect' | 'Complete';

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  zip: string;
  lat: number; // For map representation
  lng: number; // For map representation
  template: string; // e.g., 'Fire Code Inspection', 'Sprinkler Main Duct'
  lastInspectionDate: string;
  nextInspectionDate: string;
  status: ProjectStatus;
  inspectionsCount: number;
}

export interface InspectionReport {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  contractorId: string;
  contractorName: string;
  inspectorName: string;
  date: string;
  equipmentType: 'Fire Sprinkler' | 'Fire Alarm' | 'Kitchen Suppression' | 'Extinguishers' | 'Fire Hydrants' | 'Backflow Assembly';
  status: 'Passed' | 'Passed with Deficiencies' | 'Failed (Overdue Reinspect)' | 'Incomplete';
  deficiencies: string[];
  notes: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  photos?: string[]; // Scans/photos of completed physical reports
  createdAt: string;
  bureauApproved: boolean;
  bureauComments?: string;
}

export interface Contractor {
  id: string;
  name: string;
  licenseNumber: string;
  email: string;
  phone: string;
  logoUrl?: string;
  activeReportsCount: number;
}

export interface UserInfo {
  id: string;
  name: string;
  role: 'contractor' | 'bureau';
  contractorId?: string; // If role is contractor, links to a specific contractor
  email: string;
}
