import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";

export const GET: APIRoute = async () => {
    const fileContent = await readFile(new URL('../stubs/sw.js', import.meta.url), 'utf-8');

    return new Response(fileContent, {
        headers: {
            "Content-Type": "application/javascript"
        }
    });
}