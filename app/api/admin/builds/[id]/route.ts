import { NextResponse } from 'next/server';
import { adminGuard, audit } from '@/lib/guard';
import { isUuid } from '@/lib/utils';

// Изменить сборку: опубликовать/скрыть, поправить название и описание.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await adminGuard(); if (!g.ok) return g.res;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Неверный ID.' }, { status: 400 });
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Некорректные данные.' }, { status: 400 }); }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof b.published === 'boolean') patch.published = b.published;
  if (typeof b.title === 'string') {
    const t = b.title.trim().slice(0, 180);
    if (!t) return NextResponse.json({ error: 'Название не может быть пустым.' }, { status: 400 });
    patch.title = t;
  }
  if (typeof b.description === 'string') patch.description = b.description.trim().slice(0, 5000);

  const { error } = await g.admin.from('builds').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: 'Не удалось обновить. Для публикации у сборки должна быть ссылка или файл.' }, { status: 500 });
  await audit(g.admin, g.user.id, 'build.update', 'build', id, { fields: Object.keys(patch) });
  return NextResponse.json({ ok: true });
}

// Удалить сборку целиком (и её файл из хранилища, если он больше нигде не используется).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await adminGuard(); if (!g.ok) return g.res;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Неверный ID.' }, { status: 400 });

  const { data: build } = await g.admin.from('builds').select('title,edition,storage_path').eq('id', id).maybeSingle();
  if (!build) return NextResponse.json({ error: 'Сборка не найдена.' }, { status: 404 });

  const { error } = await g.admin.from('builds').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Не удалось удалить сборку.' }, { status: 500 });

  let fileRemoved = false;
  if (build.storage_path) {
    const { count } = await g.admin.from('builds').select('id', { count: 'exact', head: true }).eq('storage_path', build.storage_path).eq('edition', build.edition);
    if (!count) {
      const bucket = build.edition === 'PLUS' ? 'plus-private' : 'free-files';
      const { error: rmErr } = await g.admin.storage.from(bucket).remove([build.storage_path]);
      fileRemoved = !rmErr;
    }
  }
  await audit(g.admin, g.user.id, 'build.delete', 'build', id, { title: build.title, fileRemoved });
  return NextResponse.json({ ok: true, fileRemoved });
}
