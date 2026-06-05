export type ResourceType = "skill" | "location" | "account" | "time";

export type ActivationStepKey = "resource" | "skill" | "goal";

export interface ActivationSelectionDetail {
  code: string;
  label: string;
  intro: string;
  note?: string;
  isCustom?: boolean;
}

export interface ActivationStepDetails {
  resource: ActivationSelectionDetail[];
  skill: ActivationSelectionDetail[];
  goal: ActivationSelectionDetail[];
}

export interface ActivationCustomModule {
  moduleName: string;
  moduleContext?: string;
  sourceStep?: ActivationStepKey;
}

export interface ActivationDetailsPayload {
  version: "v1";
  flowTitle: string;
  stepDetails: ActivationStepDetails;
  customModules?: ActivationCustomModule[];
}

export interface UploadResourceDto {
  resourceType: ResourceType | ResourceType[];
  tags: string[];
  areaCode?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  activationDetails?: ActivationDetailsPayload;
}

export interface UpdateResourceDto {
  tags?: string[];
  status?: "active" | "inactive";
}
