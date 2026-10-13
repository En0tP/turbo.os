import { NextResponse } from 'next/server';
import { adminGuard, audit } from '@/lib/guard';
import { isUuid } from '@/lib/utils';

// Изменить публикацию: опубликовать/скрыть, поправить заголовок и текст.
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
    if (!t) return NextResponse.json({ error: 'Заголовок не может быть пустым.' }, { status: 400 });
    patch.title = t;
  }
  if (typeof b.body === 'string') {
    const t = b.body.trim().slice(0, 10000);
    if (!t) return NextResponse.json({ error: 'Текст не может быть пустым.' }, { status: 400 });
    patch.body = t;
  }
  const { error } = await g.admin.from('posts').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: 'Не удалось обновить публикацию.' }, { status: 500 });
  await audit(g.admin, g.user.id, 'post.update', 'post', id, { fields: Object.keys(patch) });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await adminGuard(); if (!g.ok) return g.res;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Неверный ID.' }, { status: 400 });
  const { data: post } = await g.admin.from('posts').select('title').eq('id', id).maybeSingle();
  const { error } = await g.admin.from('posts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Не удалось удалить публикацию.' }, { status: 500 });
  await audit(g.admin, g.user.id, 'post.delete', 'post', id, { title: post?.title });
  return NextResponse.json({ ok: true });
}
