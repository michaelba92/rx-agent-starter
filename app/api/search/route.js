import Fuse from "fuse.js";
import fs from "fs";
import path from "path";

export async function GET(request){
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if(!q) return new Response(JSON.stringify({ results: [] }), { headers:{ "content-type":"application/json" } });

  // Load sample data (replace with licensed Z-Index source in production)
  const filePath = path.join(process.cwd(), "public", "data", "prk_sample.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const fuse = new Fuse(data, { keys:["prk_description"], includeScore:true, threshold:0.3 });
  const results = fuse.search(q).slice(0, 12).map(r => ({ prk_description: r.item.prk_description, prk_code: r.item.prk_code }));
  return new Response(JSON.stringify({ results }), { headers:{ "content-type":"application/json" } });
}
