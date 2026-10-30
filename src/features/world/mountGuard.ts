// Serializes async game boots across React StrictMode remounts: each mount
// takes a token, and only the latest token may attach its game. Stale boots
// must destroy their orphan without touching the live canvas.
export class MountGuard {
  private current = 0;

  next(): number {
    this.current += 1;
    return this.current;
  }

  isCurrent(token: number): boolean {
    return token === this.current;
  }
}
