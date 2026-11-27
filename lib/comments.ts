export const MAX_COMMENTS_PER_SURVEY = 100;
export const MAX_COMMENT_LENGTH = 2000;

export type CommentItem = {
  id: string;
  /** null = the survey as a whole. */
  questionId: string | null;
  parentId: string | null;
  authorId: string;
  authorName: string;
  body: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
};
