export type {};

declare global {
  export interface PendingPost {
    postId: number;
    threadId: number;
    thread: HTMLElement;
  }
}
