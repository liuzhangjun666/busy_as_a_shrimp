import type { HttpClientLike } from "./http";

export type BountyDifficulty = "EASY" | "MEDIUM" | "HARD" | "EXPERT";
export type BountyTaskStatus = "PUBLISHED" | "FINISHED" | "CANCELLED";
export type BountySubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface BountyUserSummary {
  userId: number | null;
  label: string;
  nickname: string | null;
  city: string | null;
  district: string | null;
  memberLevel: string;
  realNameVerified: boolean;
  avatar: string | null;
  taskAcceptCount: number;
  resourceCount: number;
  resourceHighlights: string[];
  skillHighlights: string[];
}

export interface BountyUnlockedContact {
  userId: number;
  nickname: string | null;
  maskedPhone: string | null;
}

export interface BountySubmissionSummary {
  submissionId: number;
  userId: number;
  claimer: BountyUserSummary;
  isCurrentUserSubmission: boolean;
  proof: string;
  status: BountySubmissionStatus;
  createdAt: string;
  updatedAt: string;
  publisherAgreedAt: string | null;
  claimerAgreedAt: string | null;
  contactUnlockedAt: string | null;
  rewardGrantedAt: string | null;
}

export interface BountyTaskCard {
  taskId: number;
  title: string;
  content: string;
  points: number;
  difficulty: BountyDifficulty;
  status: BountyTaskStatus;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
  publisher: BountyUserSummary;
  scope: "open" | "published" | "detail";
  claimCount: number;
  selectedSubmissionId: number | null;
  mySubmission: BountySubmissionSummary | null;
  selectedSubmission: BountySubmissionSummary | null;
  submissions: BountySubmissionSummary[];
  unlockedContact: {
    publisher: BountyUnlockedContact | null;
    claimer: BountyUnlockedContact | null;
  } | null;
}

export interface BountyClaimedTaskCard {
  submissionId: number;
  taskId: number;
  title: string;
  content: string;
  points: number;
  difficulty: BountyDifficulty;
  taskStatus: BountyTaskStatus;
  taskCreatedAt: string;
  publisher: BountyUserSummary;
  submission: BountySubmissionSummary;
  unlockedContact: {
    publisher: BountyUnlockedContact | null;
    claimer: BountyUnlockedContact | null;
  } | null;
}

export interface PublishBountyTaskPayload {
  title: string;
  content: string;
  points: number;
  difficulty?: BountyDifficulty;
}

export interface SubmissionActionResult {
  success: true;
  submissionId: number;
}

export function createBountyHallApi(client: Pick<HttpClientLike, "get" | "post">) {
  return {
    listOpenTasks(): Promise<BountyTaskCard[]> {
      return client.get<BountyTaskCard[]>("/bounty-hall/tasks");
    },
    publishTask(payload: PublishBountyTaskPayload): Promise<BountyTaskCard> {
      return client.post<BountyTaskCard>("/bounty-hall/tasks", payload);
    },
    getTask(taskId: number): Promise<BountyTaskCard> {
      return client.get<BountyTaskCard>(`/bounty-hall/tasks/${taskId}`);
    },
    claimTask(taskId: number): Promise<SubmissionActionResult> {
      return client.post<SubmissionActionResult>(`/bounty-hall/tasks/${taskId}/claim`);
    },
    listMyPublishedTasks(): Promise<BountyTaskCard[]> {
      return client.get<BountyTaskCard[]>("/bounty-hall/my/published");
    },
    listMyClaimedTasks(): Promise<BountyClaimedTaskCard[]> {
      return client.get<BountyClaimedTaskCard[]>("/bounty-hall/my/claimed");
    },
    publisherAgree(submissionId: number): Promise<SubmissionActionResult> {
      return client.post<SubmissionActionResult>(`/bounty-hall/submissions/${submissionId}/publisher-agree`);
    },
    claimerAgree(submissionId: number): Promise<SubmissionActionResult> {
      return client.post<SubmissionActionResult>(`/bounty-hall/submissions/${submissionId}/claimer-agree`);
    },
    rejectSubmission(submissionId: number): Promise<SubmissionActionResult> {
      return client.post<SubmissionActionResult>(`/bounty-hall/submissions/${submissionId}/reject`);
    },
    submitProof(submissionId: number, proof: string): Promise<SubmissionActionResult> {
      return client.post<SubmissionActionResult>(`/bounty-hall/submissions/${submissionId}/proof`, {
        proof
      });
    },
    completeSubmission(submissionId: number): Promise<SubmissionActionResult> {
      return client.post<SubmissionActionResult>(`/bounty-hall/submissions/${submissionId}/complete`);
    }
  };
}
