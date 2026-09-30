import { withSupabase } from "npm:@supabase/server@1.8.1";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Método não permitido." }, { status: 405 });
    }

    let body: { confirmation?: string } = {};
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Confirmação inválida." }, { status: 400 });
    }

    if (body.confirmation !== "EXCLUIR") {
      return Response.json({ error: "Digite EXCLUIR para confirmar." }, { status: 400 });
    }

    const { data: userData, error: userError } = await ctx.supabase.auth.getUser();
    const user = userData?.user;
    if (userError || !user) {
      return Response.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
    }

    const { data: memberships, error: membershipError } = await ctx.supabaseAdmin
      .from("family_members")
      .select("role")
      .eq("user_id", user.id);

    if (membershipError) {
      console.error("delete-account membership lookup failed", membershipError);
      return Response.json({ error: "Não foi possível verificar sua família." }, { status: 500 });
    }

    if ((memberships ?? []).some((membership) => membership.role === "admin")) {
      return Response.json(
        {
          error: "Transfira a administração da família para outro Adulto antes de excluir sua conta.",
          code: "ADMIN_TRANSFER_REQUIRED",
        },
        { status: 409 },
      );
    }

    const { error: deleteError } = await ctx.supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("delete-account auth deletion failed", deleteError);
      return Response.json({ error: "Não foi possível excluir sua conta agora." }, { status: 500 });
    }

    return Response.json({ ok: true });
  }),
};
