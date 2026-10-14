import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isStaff, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteObject, putObject } from "@/lib/storage";

// Vídeos passam do limite das server actions (9 MB): o upload vem cru, por esta rota.
const MAX_VIDEO = 60 * 1024 * 1024;

/** Confere a assinatura do arquivo: MP4/MOV (caixa "ftyp") ou WebM (EBML). */
function sniffVideo(b: Uint8Array): { ext: string; type: string } | null {
  if (String.fromCharCode(...b.slice(4, 8)) === "ftyp") {
    const brand = String.fromCharCode(...b.slice(8, 12));
    return brand.startsWith("qt") ? { ext: "mov", type: "video/quicktime" } : { ext: "mp4", type: "video/mp4" };
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { ext: "webm", type: "video/webm" };
  return null;
}

async function staffExercise(id: string) {
  const user = await requireUser();
  if (!isStaff(user.role)) return null;
  return db.exercise.findUnique({ where: { id }, select: { id: true, videoKey: true } });
}

function refresh() {
  revalidatePath("/treinador/exercicios");
  revalidatePath("/aluno", "layout");
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ex = await staffExercise((await params).id);
  if (!ex) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_VIDEO) return NextResponse.json({ error: "Vídeo acima de 60 MB" }, { status: 413 });
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.byteLength === 0) return NextResponse.json({ error: "Selecione um vídeo" }, { status: 400 });
  if (bytes.byteLength > MAX_VIDEO) return NextResponse.json({ error: "Vídeo acima de 60 MB" }, { status: 413 });
  const kind = sniffVideo(bytes);
  if (!kind) return NextResponse.json({ error: "Use MP4, MOV ou WebM" }, { status: 415 });

  const key = `exercises/${ex.id}/video-${randomUUID()}.${kind.ext}`;
  await putObject(key, bytes, kind.type);
  await db.exercise.update({ where: { id: ex.id }, data: { videoKey: key } });
  if (ex.videoKey) await deleteObject(ex.videoKey).catch(() => {});
  refresh();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ex = await staffExercise((await params).id);
  if (!ex) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (ex.videoKey) {
    await db.exercise.update({ where: { id: ex.id }, data: { videoKey: null } });
    await deleteObject(ex.videoKey).catch(() => {});
  }
  refresh();
  return NextResponse.json({ ok: true });
}
