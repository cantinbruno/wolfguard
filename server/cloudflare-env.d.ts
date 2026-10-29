declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ENTRY_LINK_HASH?: string;
  }
}
