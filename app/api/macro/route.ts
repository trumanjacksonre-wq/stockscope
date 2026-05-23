import { getMacroData } from '@/lib/fred';

export async function GET() {
  try {
    const macro = await getMacroData();
    return Response.json({ macro });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
