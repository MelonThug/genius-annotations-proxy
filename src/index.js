import { fetchAnnotations } from "./annotations";
import { search } from "./search";
import { fetchSongPage } from "./songPage";

export default {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);

            // Preflight handling
            if (request.method === "OPTIONS") {
                return cors(
					new Response(null, { status: 204 }), 
					env
				);
            }

			// Invalid method
            if (request.method !== "GET") {
                return cors(
                    new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 }),
                    env
                );
            }

			// No URL query param, return proxy status
            const target = url.searchParams.get("url");
            if (!target) {
                return cors(
                    new Response(JSON.stringify({ message: "Proxy is running." }, { status: 200 })),
                    env
                );
            }

			// Invalid URL
            if (!/^https?:\/\//i.test(target)) {
                return cors(
                    new Response(JSON.stringify({ error: "Invalid target URL" }), { status: 400 }),
                    env
                );
            }

			// Disallowed origin
            const origin = request.headers.get("origin");
            if (origin && origin !== env.ALLOWED_ORIGIN) {
                return cors(
                    new Response(JSON.stringify({ error: "Origin not allowed" }), { status: 403 }),
                    env
                );
            }

			// Disallowed target
            const hostname = new URL(target).hostname.toLowerCase();
            if (!env.ALLOWED_HOSTS.includes(hostname)) {
                return cors(
                    new Response(JSON.stringify({ error: "Target not allowed" }), { status: 403 }),
                    env
                );
            }

            const outgoingHeaders = buildOutgoingHeaders(request, env);

            let response;
            if (target.includes("api.genius.com/search")) {
                response = await search(target, outgoingHeaders, ctx, env);

            } else if (target.includes("api.genius.com/referents")) {
                response = await fetchAnnotations(target, outgoingHeaders, env);

            } else if (target.includes("genius.com/songs")) {
                response = await fetchSongPage(target, outgoingHeaders, env);

            } else {
                return cors(
                    new Response(JSON.stringify({ error: "Unhandled endpoint" }), { status: 400 }),
                    env
                );
            }

            // Daily proxy limit handling
            if (response.status === 429) {
                return cors(
                    new Response(JSON.stringify({ error: "Proxy daily request limit reached" }), {
                        status: 429,
                    }),
                    env
                );
            }

            return cors(response, env);

        } catch (err) {
            return cors(
                new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
                    status: 500,
                }),
                env
            );
        }
    },
};

function cors(response, env) {
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", env.ALLOWED_ORIGIN);
    headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "*");
    return new Response(response.body, {
        status: response.status,
        headers,
    });
}

function buildOutgoingHeaders(request, env) {
    const headers = new Headers(request.headers);
    headers.set(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/142.0.0.0 Safari/537.36"
    );
    headers.set("Origin", "https://genius.com");
    headers.set("Referer", "https://genius.com");
    if (env.ACCESS_TOKEN) headers.set("Authorization", `Bearer ${env.ACCESS_TOKEN}`);
    return headers;
}

