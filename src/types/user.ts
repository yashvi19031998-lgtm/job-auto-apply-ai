export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  preferences: {
    minimumMatchScore: number;
    autoApply: boolean;
    emailSignature: string;
    preferredLocations: string[];
    preferredRoles: string[];
  };
  createdAt: string;
  updatedAt: string;
}
