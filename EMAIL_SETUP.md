# Ninho — Auth Email Setup

## Production requirement

Supabase's default Auth email service is intended for development and is restricted. Before opening Ninho to external users, configure a custom SMTP provider in **Supabase Dashboard → Authentication → SMTP Settings**.

For the current temporary launch setup, the support inbox can also be used as the SMTP sender:

- Sender name: `Ninho`
- Sender email: `supportlevia.ninho@gmail.com`
- SMTP host: `smtp.gmail.com`
- SMTP port: `587`
- SMTP user: `supportlevia.ninho@gmail.com`
- SMTP password: **Google App Password** — never the normal Google password, and never commit it to GitHub.

The Google account must have 2-Step Verification enabled before an App Password can be created.

## Branded templates

Source-of-truth files:

- `supabase/templates/confirmation.html`
  - Subject: `Confirme seu e-mail no Ninho`
- `supabase/templates/recovery.html`
  - Subject: `Redefina sua senha do Ninho`
- `supabase/templates/email_change.html`
  - Subject: `Confirme seu novo e-mail no Ninho`
- `supabase/templates/password_changed_notification.html`
  - Subject: `Sua senha do Ninho foi alterada`

For the hosted project, paste these templates into **Supabase Dashboard → Authentication → Email Templates** after custom SMTP is enabled.

## Verification before external launch

1. Create a test account using an email address that is not a member of the Supabase organization.
2. Confirm that the signup email arrives and opens the production Ninho URL.
3. Request password recovery and confirm that the recovery email arrives and opens the Ninho reset-password screen.
4. Change the password and confirm login with the new password.
5. Check the sender name/address, mobile rendering, spam folder behavior, and Auth logs.
6. Do not publish or share the SMTP App Password.

## Later upgrade

When Levia has its own domain, replace the Gmail sender with a dedicated transactional address such as `no-reply@<levia-domain>` using a transactional email provider and configure SPF/DKIM/DMARC for that domain. Keep `supportlevia.ninho@gmail.com` as the support contact until a support address on the domain is ready.
