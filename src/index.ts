// src/index.ts in your mercator-signup-api repository

/**
 * Define the structure of our environment variables.
 * This tells TypeScript that `env.DB` will be a D1 Database instance.
 */
interface Env {
  DB: D1Database;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // The D1 binding name from the template is 'DB'.
    const D1_DATABASE = env.DB;

    // Handle CORS preflight requests for security
    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }

    // Handle the actual POST request to sign up a user
    if (request.method === "POST") {
      return handlePostRequest(request, D1_DATABASE);
    }

    // For any other method, return a 404
    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

async function handlePostRequest(
  request: Request,
  db: D1Database
): Promise<Response> {
  try {
    // Await the JSON from the request body
    const { name, email } = await request.json<{
      name: string;
      email: string;
    }>();

    // Basic validation
    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: "Name and email are required." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Use a prepared statement to securely insert data and prevent SQL injection
    const ps = db
      .prepare("INSERT INTO signups (name, email) VALUES (?, ?)")
      .bind(name, email);
    await ps.run();

    // Return a successful JSON response
    return new Response(
      JSON.stringify({ success: true, message: "Successfully signed up!" }),
      {
        status: 201, // 201 Created
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (e: any) {
    // Handle potential errors, like a duplicate email which is a common case
    let errorMessage = "An unexpected error occurred.";
    if (e.message && e.message.includes("UNIQUE constraint failed")) {
      errorMessage = "This email address has already been registered.";
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

// CORS headers are mandatory to allow your website (onmercator.com) to call this API
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // For production, lock this down to 'https://onmercator.com'
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function handleOptions(request: Request): Response {
  // Respond to the preflight request with the allowed methods and headers
  return new Response(null, { headers: corsHeaders });
}
