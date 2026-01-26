export type User = {
  id: string;
  username: string;
  email: string;
  avatarDataUrl?: string;
  password: string; // רק ל-Mock
};

export type Post = {
  id: string;
  authorId: string;
  text: string;
  imageDataUrl?: string;
  createdAt: number;
  likedBy: string[]; // userIds
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: number;
};

type DbState = {
  users: User[];
  posts: Post[];
  comments: Comment[];
  currentUserId: string | null;
};

const LS_KEY = "cookshare_mock_db_v1";

function uid() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = crypto;
  return c?.randomUUID ? c.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function seed(): DbState {
  const u1: User = { id: uid(), username: "Noa", email: "noa@mail.com", password: "1234" };
  const u2: User = { id: uid(), username: "Daniel", email: "daniel@mail.com", password: "1234" };

  const p1: Post = {
    id: uid(),
    authorId: u1.id,
    text: "פסטה שמנת פטריות ב-15 דקות 🍝",
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
    likedBy: [u2.id],
  };

  const p2: Post = {
    id: uid(),
    authorId: u2.id,
    text: "סלט קינואה טבעוני, מתאים גם לללא גלוטן 🥗",
    createdAt: Date.now() - 1000 * 60 * 30,
    likedBy: [],
  };

  const c1: Comment = {
    id: uid(),
    postId: p1.id,
    authorId: u2.id,
    text: "נשמע אש! מה שמים במקום שמנת כדי להקליל?",
    createdAt: Date.now() - 1000 * 60 * 20,
  };

  return {
    users: [u1, u2],
    posts: [p2, p1],
    comments: [c1],
    currentUserId: null,
  };
}

function load(): DbState {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) {
    const s = seed();
    save(s);
    return s;
  }
  return JSON.parse(raw) as DbState;
}

function save(state: DbState) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function getState() {
  return load();
}

function setState(updater: (s: DbState) => DbState) {
  const s = load();
  const next = updater(s);
  save(next);
  return next;
}

export const db = {
  // -------- Auth --------
  getCurrentUser(): User | null {
    const s = getState();
    return s.currentUserId ? s.users.find((u) => u.id === s.currentUserId) ?? null : null;
  },

  login(username: string, password: string): User {
    const s = getState();
    const u = s.users.find((x) => x.username.toLowerCase() === username.toLowerCase());
    if (!u || u.password !== password) {
      throw new Error("שם משתמש או סיסמה לא נכונים");
    }
    setState((st) => ({ ...st, currentUserId: u.id }));
    return u;
  },

  register(username: string, email: string, password: string): User {
    const s = getState();
    const exists = s.users.some((x) => x.username.toLowerCase() === username.toLowerCase());
    if (exists) throw new Error("שם המשתמש כבר תפוס");
    const u: User = { id: uid(), username, email, password };
    setState((st) => ({ ...st, users: [u, ...st.users], currentUserId: u.id }));
    return u;
  },

  logout() {
    setState((st) => ({ ...st, currentUserId: null }));
  },

  updateMe(data: { username?: string; avatarDataUrl?: string }) {
    return setState((st) => {
      if (!st.currentUserId) return st;
      return {
        ...st,
        users: st.users.map((u) =>
          u.id === st.currentUserId
            ? { ...u, username: data.username ?? u.username, avatarDataUrl: data.avatarDataUrl ?? u.avatarDataUrl }
            : u
        ),
      };
    });
  },

  // -------- Users --------
  getUser(userId: string): User | null {
    const s = getState();
    return s.users.find((u) => u.id === userId) ?? null;
  },

  // -------- Posts --------
  listPosts(args: {
    cursor?: number;
    limit: number;
    authorId?: string;
    likedByUserId?: string;
    textIncludes?: string[];
  }) {
    const s = getState();
    let posts = [...s.posts].sort((a, b) => b.createdAt - a.createdAt);

    if (args.authorId) posts = posts.filter((p) => p.authorId === args.authorId);

    // ✅ guard שמצמצם טיפוס לפני includes
    if (args.likedByUserId) {
      const uid = args.likedByUserId;
      posts = posts.filter((p) => p.likedBy.includes(uid));
    }

    if (args.textIncludes?.length) {
      const needles = args.textIncludes.map((t) => t.toLowerCase());
      posts = posts.filter((p) => needles.every((n) => (p.text ?? "").toLowerCase().includes(n)));
    }

    const start = args.cursor ?? 0;
    const slice = posts.slice(start, start + args.limit);
    const nextCursor = start + slice.length;
    return { items: slice, nextCursor: nextCursor >= posts.length ? null : nextCursor };
  },

  getPost(postId: string): Post | null {
    const s = getState();
    return s.posts.find((p) => p.id === postId) ?? null;
  },

  createPost(data: { text: string; imageDataUrl?: string }): Post {
    const s = getState();
    if (!s.currentUserId) throw new Error("Not authenticated");
    const p: Post = {
      id: uid(),
      authorId: s.currentUserId,
      text: data.text,
      imageDataUrl: data.imageDataUrl,
      createdAt: Date.now(),
      likedBy: [],
    };
    setState((st) => ({ ...st, posts: [p, ...st.posts] }));
    return p;
  },

  updatePost(postId: string, data: { text: string; imageDataUrl?: string | null }) {
    return setState((st) => {
      const me = st.currentUserId;
      if (!me) return st;
      return {
        ...st,
        posts: st.posts.map((p) => {
          if (p.id !== postId) return p;
          if (p.authorId !== me) return p;
          return {
            ...p,
            text: data.text,
            imageDataUrl: data.imageDataUrl === null ? undefined : data.imageDataUrl ?? p.imageDataUrl,
          };
        }),
      };
    });
  },

  deletePost(postId: string) {
    return setState((st) => {
      const me = st.currentUserId;
      if (!me) return st;
      const post = st.posts.find((p) => p.id === postId);
      if (!post || post.authorId !== me) return st;

      return {
        ...st,
        posts: st.posts.filter((p) => p.id !== postId),
        comments: st.comments.filter((c) => c.postId !== postId),
      };
    });
  },

  toggleLike(postId: string) {
    return setState((st) => {
      const me = st.currentUserId;
      if (!me) return st;
      return {
        ...st,
        posts: st.posts.map((p) => {
          if (p.id !== postId) return p;
          const has = p.likedBy.includes(me);
          return { ...p, likedBy: has ? p.likedBy.filter((id) => id !== me) : [me, ...p.likedBy] };
        }),
      };
    });
  },

  // -------- Comments --------
  listComments(postId: string) {
    const s = getState();
    return s.comments
      .filter((c) => c.postId === postId)
      .sort((a, b) => a.createdAt - b.createdAt);
  },

  addComment(postId: string, text: string) {
    const s = getState();
    if (!s.currentUserId) throw new Error("Not authenticated");
    const c: Comment = { id: uid(), postId, authorId: s.currentUserId, text, createdAt: Date.now() };
    setState((st) => ({ ...st, comments: [...st.comments, c] }));
    return c;
  },

  deleteComment(commentId: string) {
    return setState((st) => {
      const me = st.currentUserId;
      if (!me) return st;
      const c = st.comments.find((x) => x.id === commentId);
      if (!c || c.authorId !== me) return st;
      return { ...st, comments: st.comments.filter((x) => x.id !== commentId) };
    });
  },

  getCounts(postId: string) {
    const s = getState();
    const commentsCount = s.comments.filter((c) => c.postId === postId).length;
    return { commentsCount };
  },
};
