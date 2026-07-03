import { promises as fs } from 'fs';
import path from 'path';

/* ─────────────────────────────────────────────────────────────────────────────
   Camada de storage com dois backends, escolhidos por env — sem trocar código:

   - LocalDisk (default): grava sob STORAGE_DIR (ou ./data/storage). Serve para
     dev e para deploy self-hosted em container único com volume persistente.
   - Supabase Storage: ativado quando SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
     estão definidos. Fala com a REST API de storage (sem dependência extra).

   O download é sempre feito ATRAVÉS do app (rota autenticada que faz get() e
   streama), então a service-role key nunca sai do servidor e o comportamento é
   idêntico nos dois backends.
──────────────────────────────────────────────────────────────────────────── */

export interface StorageService {
  readonly backend: 'local' | 'supabase';
  put(objectPath: string, data: Buffer, contentType: string): Promise<void>;
  get(objectPath: string): Promise<Buffer>;
  remove(objectPath: string): Promise<void>;
}

/* ─── Local disk ─── */
class LocalDiskStorage implements StorageService {
  readonly backend = 'local' as const;
  private base: string;

  constructor(baseDir: string) {
    this.base = baseDir;
  }

  private resolve(objectPath: string): string {
    // Impede path traversal (../) — normaliza e garante que fica sob a base.
    const clean = path.normalize(objectPath).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.base, clean);
  }

  async put(objectPath: string, data: Buffer): Promise<void> {
    const full = this.resolve(objectPath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
  }

  async get(objectPath: string): Promise<Buffer> {
    return fs.readFile(this.resolve(objectPath));
  }

  async remove(objectPath: string): Promise<void> {
    await fs.rm(this.resolve(objectPath), { force: true });
  }
}

/* ─── Supabase Storage (REST) ─── */
class SupabaseStorage implements StorageService {
  readonly backend = 'supabase' as const;

  constructor(
    private url: string,
    private key: string,
    private bucket: string,
  ) {}

  private endpoint(objectPath: string): string {
    return `${this.url.replace(/\/$/, '')}/storage/v1/object/${this.bucket}/${objectPath}`;
  }

  async put(objectPath: string, data: Buffer, contentType: string): Promise<void> {
    const res = await fetch(this.endpoint(objectPath), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.key}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: data as unknown as BodyInit,
    });
    if (!res.ok) throw new Error(`Supabase storage put ${res.status}: ${await res.text()}`);
  }

  async get(objectPath: string): Promise<Buffer> {
    const res = await fetch(this.endpoint(objectPath), {
      headers: { Authorization: `Bearer ${this.key}` },
    });
    if (!res.ok) throw new Error(`Supabase storage get ${res.status}: ${await res.text()}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async remove(objectPath: string): Promise<void> {
    const res = await fetch(this.endpoint(objectPath), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.key}` },
    });
    if (!res.ok && res.status !== 404) throw new Error(`Supabase storage remove ${res.status}: ${await res.text()}`);
  }
}

/* ─── Factory (singleton) ─── */
let _storage: StorageService | null = null;

export function getStorage(): StorageService {
  if (_storage) return _storage;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'mapa-equipe';

  if (url && key) {
    _storage = new SupabaseStorage(url, key, bucket);
  } else {
    const baseDir = process.env.STORAGE_DIR ?? path.join(process.cwd(), 'data', 'storage');
    _storage = new LocalDiskStorage(baseDir);
  }
  return _storage;
}
