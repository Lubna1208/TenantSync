<?php

namespace App\Mail;

use App\Models\TenantInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TenantInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public TenantInvitation $invitation,
        public string $invitationUrl
    ) {
    }

    public function build()
    {
        return $this->subject('You have been invited to join TenantSync')
            ->view('emails.tenant-invitation');
    }
}
