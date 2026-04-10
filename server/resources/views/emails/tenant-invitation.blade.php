<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>TenantSync Invitation</title>
</head>
<body style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,sans-serif;color:#172033;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #dbe3f0;">
        <p style="margin:0 0 12px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#5176b8;font-weight:700;">
            TenantSync Invitation
        </p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#0d1b3d;">
            Welcome to your tenant account
        </h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">
            Hello {{ $invitation->user->name }},
        </p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">
            Your property manager has invited you to access TenantSync for unit
            <strong>{{ $invitation->unit->unit_number }}</strong>.
        </p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.7;">
            Use the button below to accept the invitation and set your password. This invitation expires on
            <strong>{{ optional($invitation->expires_at)->format('M d, Y h:i A') }}</strong>.
        </p>
        <p style="margin:0 0 28px;">
            <a href="{{ $invitationUrl }}" style="display:inline-block;background:#1e6fff;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:700;">
                Accept Invitation
            </a>
        </p>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#44516a;">
            If the button does not work, copy and paste this link into your browser:
        </p>
        <p style="margin:0;font-size:13px;line-height:1.7;word-break:break-all;color:#1e4fa1;">
            {{ $invitationUrl }}
        </p>
    </div>
</body>
</html>
