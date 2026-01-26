export type User = {
  id: string;
  username: string;

  // החדש (מהשרת)
  email?: string;
  avatarUrl?: string;

  // תאימות לקוד ישן (אם קיים)
  imageUrl?: string;
};

export type Post = {
  id: string;
  author: User;
  text: string;
  imageUrl?: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
};

export type Comment = {
  id: string;
  postId: string;
  author: User;
  text: string;
  createdAt: string;
};
