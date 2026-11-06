export async function GET() {
  const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://api:8000"}/api/v1/public/keys`, {
    cache: "no-store",
  });
  const body = response.ok ? await response.text() : '{"keys":[]}';
  return new Response(body, {
    headers: { "content-type": "application/json" },
  });
}
