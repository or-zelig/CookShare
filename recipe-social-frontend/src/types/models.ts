export type User = {
  id: string;
  username: string;
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

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};
