<?php

namespace App\Http\Controllers;

use App\Models\RentPayment;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Stripe\Exception\ApiErrorException;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeClient;
use Stripe\Webhook;

class StripePaymentController extends Controller
{
    public function createCheckoutSession(Request $request)
    {
        $tenant = $this->authenticatedTenant();

        if (! $tenant || ! $tenant->unit_id || ! $tenant->unit) {
            return response()->json([
                'message' => 'Tenant profile is not assigned to a unit yet.',
            ], 422);
        }

        if (! config('services.stripe.secret')) {
            return response()->json([
                'message' => 'Stripe is not configured yet. Add STRIPE_SECRET in the server environment.',
            ], 500);
        }

        [$paymentMonth, $amount] = $this->resolveUpcomingPayment($tenant);
        $currency = strtolower((string) config('services.stripe.currency', 'bdt'));
        $frontendUrl = rtrim((string) config('services.stripe.frontend_url', 'http://localhost:5173'), '/');

        $payment = RentPayment::updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'payment_month' => $paymentMonth,
            ],
            [
                'unit_id' => $tenant->unit_id,
                'amount' => $amount,
                'currency' => $currency,
                'status' => 'pending',
                'payment_method' => null,
                'payment_date' => null,
                'paid_at' => null,
                'failure_reason' => null,
                'receipt_url' => null,
            ]
        );

        try {
            $session = $this->stripeClient()->checkout->sessions->create([
                'mode' => 'payment',
                'payment_method_types' => ['card'],
                'line_items' => [[
                    'price_data' => [
                        'currency' => $currency,
                        'unit_amount' => $this->toMinorAmount($amount),
                        'product_data' => [
                            'name' => 'TenantSync Rent Payment',
                            'description' => sprintf(
                                'Rent for %s - Unit %s',
                                Carbon::createFromFormat('Y-m', $paymentMonth)->format('F Y'),
                                $tenant->unit->unit_number
                            ),
                        ],
                    ],
                    'quantity' => 1,
                ]],
                'success_url' => $frontendUrl . '/dashboard-tenant?payment=success&session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => $frontendUrl . '/dashboard-tenant?payment=cancelled',
                'customer_email' => $tenant->user?->email,
                'metadata' => [
                    'tenant_id' => (string) $tenant->id,
                    'unit_id' => (string) $tenant->unit_id,
                    'rent_payment_id' => (string) $payment->id,
                    'payment_month' => $paymentMonth,
                ],
                'payment_intent_data' => [
                    'metadata' => [
                        'tenant_id' => (string) $tenant->id,
                        'unit_id' => (string) $tenant->unit_id,
                        'rent_payment_id' => (string) $payment->id,
                        'payment_month' => $paymentMonth,
                    ],
                ],
            ]);
        } catch (ApiErrorException $exception) {
            return response()->json([
                'message' => 'Checkout session could not be created.',
                'error' => $exception->getMessage(),
            ], 502);
        }

        $payment->update([
            'stripe_session_id' => $session->id,
            'status' => 'pending',
            'failure_reason' => null,
        ]);

        return response()->json([
            'message' => 'Checkout session created successfully',
            'url' => $session->url,
        ]);
    }

    public function verifySession(Request $request)
    {
        $tenant = $this->authenticatedTenant();

        if (! $tenant) {
            return response()->json([
                'message' => 'Tenant profile is not assigned yet.',
            ], 422);
        }

        if (! config('services.stripe.secret')) {
            return response()->json([
                'message' => 'Stripe is not configured yet. Add STRIPE_SECRET in the server environment.',
            ], 500);
        }

        $sessionId = $request->query('session_id');

        if (! is_string($sessionId) || trim($sessionId) === '') {
            return response()->json([
                'message' => 'Session ID is required',
            ], 422);
        }

        try {
            $session = $this->stripeClient()->checkout->sessions->retrieve($sessionId, [
                'expand' => ['payment_intent.latest_charge', 'payment_intent.payment_method'],
            ]);
        } catch (ApiErrorException $exception) {
            return response()->json([
                'message' => 'Stripe session could not be verified.',
                'error' => $exception->getMessage(),
            ], 502);
        }

        $payment = $this->paymentForSession($sessionId, $session);

        if (! $payment) {
            return response()->json([
                'message' => 'Payment record not found',
            ], 404);
        }

        if ((string) $payment->tenant_id !== (string) $tenant->id) {
            return response()->json([
                'message' => 'This payment does not belong to the authenticated tenant.',
            ], 403);
        }

        if (($session->payment_status ?? null) === 'paid') {
            $payment->update($this->paidAttributesFromSession($session));
        } elseif (($session->status ?? null) === 'expired') {
            $payment->update([
                'status' => 'unpaid',
                'failure_reason' => 'Checkout session expired before payment completed.',
            ]);
        }

        $payment = $payment->fresh(['tenant.user', 'unit']);
        $message = 'Payment verification complete.';

        if ($payment?->status === 'paid') {
            $message = sprintf(
                'Payment successful for %s. Your tenant profile has been updated and the manager payment report now shows this rent.',
                Carbon::createFromFormat('Y-m', $payment->payment_month)->format('F Y')
            );
        } elseif ($payment?->status === 'unpaid') {
            $message = $payment->failure_reason ?: 'Payment could not be completed.';
        }

        return response()->json([
            'message' => $message,
            'status' => $payment?->status,
            'data' => $payment,
        ]);
    }

    public function handleWebhook(Request $request)
    {
        $secret = (string) config('services.stripe.webhook_secret');

        if ($secret === '') {
            return response('Stripe webhook secret is not configured.', 500);
        }

        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature');

        try {
            $event = Webhook::constructEvent($payload, (string) $signature, $secret);
        } catch (\UnexpectedValueException $exception) {
            return response('Invalid payload', 400);
        } catch (SignatureVerificationException $exception) {
            return response('Invalid signature', 400);
        }

        if ($event->type === 'checkout.session.completed' || $event->type === 'checkout.session.async_payment_succeeded') {
            $session = $this->stripeClient()->checkout->sessions->retrieve($event->data->object->id, [
                'expand' => ['payment_intent.latest_charge', 'payment_intent.payment_method'],
            ]);

            $payment = $this->paymentForSession($session->id, $session);

            if ($payment) {
                $payment->update($this->paidAttributesFromSession($session));
            }
        }

        if ($event->type === 'checkout.session.expired') {
            $session = $event->data->object;
            $payment = $this->paymentForSession($session->id, $session);

            if ($payment && $payment->status !== 'paid') {
                $payment->update([
                    'status' => 'unpaid',
                    'failure_reason' => 'Checkout session expired before payment completed.',
                ]);
            }
        }

        if ($event->type === 'payment_intent.payment_failed') {
            $intent = $event->data->object;
            $payment = $this->paymentForIntent($intent->id, $intent->metadata->rent_payment_id ?? null);

            if ($payment && $payment->status !== 'paid') {
                $payment->update([
                    'status' => 'unpaid',
                    'stripe_payment_intent_id' => $intent->id,
                    'failure_reason' => $intent->last_payment_error->message ?? 'Stripe payment failed.',
                ]);
            }
        }

        return response('Webhook handled', 200);
    }

    private function authenticatedTenant(): ?Tenant
    {
        $user = auth('api')->user();

        if (! $user) {
            return null;
        }

        return Tenant::query()
            ->where('user_id', $user->id)
            ->with(['user', 'unit'])
            ->first();
    }

    private function resolveUpcomingPayment(Tenant $tenant): array
    {
        $latestPayment = RentPayment::query()
            ->where('tenant_id', $tenant->id)
            ->orderByDesc('payment_month')
            ->first();

        $dueDate = $this->nextDueDate($latestPayment);
        $paymentMonth = $dueDate?->format('Y-m') ?? Carbon::now()->format('Y-m');

        return [$paymentMonth, (float) $tenant->unit->rent_amount];
    }

    private function nextDueDate(?RentPayment $latestPayment): ?Carbon
    {
        if (! $latestPayment || ! $latestPayment->payment_month) {
            return Carbon::now()->startOfMonth();
        }

        if ($latestPayment->status !== 'paid') {
            return Carbon::createFromFormat('Y-m', $latestPayment->payment_month)->startOfMonth();
        }

        return Carbon::createFromFormat('Y-m', $latestPayment->payment_month)
            ->addMonth()
            ->startOfMonth();
    }

    private function stripeClient(): StripeClient
    {
        return new StripeClient((string) config('services.stripe.secret'));
    }

    private function toMinorAmount(float $amount): int
    {
        return (int) round($amount * 100);
    }

    private function paymentForSession(string $sessionId, $session): ?RentPayment
    {
        return RentPayment::query()
            ->where('stripe_session_id', $sessionId)
            ->orWhere('id', $session->metadata->rent_payment_id ?? 0)
            ->first();
    }

    private function paymentForIntent(string $intentId, $paymentId): ?RentPayment
    {
        return RentPayment::query()
            ->where('stripe_payment_intent_id', $intentId)
            ->orWhere('id', $paymentId ?? 0)
            ->first();
    }

    private function paidAttributesFromSession($session): array
    {
        $paymentIntent = $session->payment_intent;
        $paidAt = Carbon::createFromTimestamp((int) ($session->created ?? now()->timestamp));
        $latestCharge = is_object($paymentIntent) ? ($paymentIntent->latest_charge ?? null) : null;

        return [
            'status' => 'paid',
            'payment_date' => $paidAt->toDateString(),
            'paid_at' => $paidAt->toDateTimeString(),
            'stripe_session_id' => $session->id,
            'stripe_payment_intent_id' => is_string($paymentIntent) ? $paymentIntent : ($paymentIntent->id ?? null),
            'currency' => strtolower((string) ($session->currency ?? config('services.stripe.currency', 'bdt'))),
            'payment_method' => is_object($paymentIntent)
                ? ($paymentIntent->payment_method_types[0] ?? 'card')
                : 'card',
            'failure_reason' => null,
            'receipt_url' => is_object($latestCharge) ? ($latestCharge->receipt_url ?? null) : null,
        ];
    }
}
