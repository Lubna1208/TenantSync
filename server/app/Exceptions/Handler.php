<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<Throwable>>
     */
    protected $dontReport = [
        //
    ];

    /**
     * A list of the inputs that are never flashed for validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     *
     * @return void
     */
    public function register()
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * Render an exception into an HTTP response.
     *
     * @param \Illuminate\Http\Request $request
     * @param \Throwable $exception
     * @return \Illuminate\Http\JsonResponse|\Symfony\Component\HttpFoundation\Response
     */
    public function render($request, Throwable $exception)
    {
        if (! $request->expectsJson() && ! $request->is('api/*')) {
            return parent::render($request, $exception);
        }

        if ($exception instanceof ValidationException) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $exception->errors(),
            ], $exception->status);
        }

        if ($exception instanceof AuthenticationException) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ($exception instanceof ModelNotFoundException) {
            return response()->json([
                'message' => 'Resource not found.',
            ], 404);
        }

        if ($exception instanceof QueryException) {
            return response()->json([
                'message' => $this->friendlyDatabaseMessage($exception),
            ], 422);
        }

        return response()->json([
            'message' => $this->getMessage($exception),
        ], 500);
    }



    /**
     * Get the error message from the exception.
     *
     * @param \Throwable $exception
     * @return string
     */
    protected function getMessage(Throwable $exception): string
    {
        if ($exception instanceof ValidationException) {
            return 'Validation failed.';
        }

        if ($exception instanceof ModelNotFoundException) {
            return 'Resource not found.';
        }

        return $exception->getMessage() ?: 'An unexpected error occurred.';
    }

    protected function friendlyDatabaseMessage(QueryException $exception): string
    {
        $sqlState = $exception->errorInfo[0] ?? null;
        $driverCode = $exception->errorInfo[1] ?? null;
        $rawMessage = strtolower($exception->getMessage());

        if ($sqlState === '22003' || $driverCode === 1264 || str_contains($rawMessage, 'out of range value')) {
            if (str_contains($rawMessage, 'total_units')) {
                return 'Total units is too large. Please enter a smaller value.';
            }

            return 'One of the values is too large. Please enter a smaller value.';
        }

        if ($sqlState === '23000') {
            return 'The submitted data conflicts with an existing record or related data.';
        }

        return 'The submitted data could not be saved.';
    }

}
