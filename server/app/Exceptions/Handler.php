<?php

namespace App\Exceptions;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
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

        if ($exception instanceof HttpResponseException) {
            return $exception->getResponse();
        }

        $message = $this->getMessage($exception);
        $status = $this->getStatusCode($exception);

        $payload = [
            'success' => false,
            'message' => $message,
        ];

        if ($exception instanceof ValidationException) {
            $payload['errors'] = $exception->errors();
        }

        return response()->json($payload, $status);
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
            return 'Validation failed';
        }

        if ($exception instanceof AuthenticationException) {
            return 'Unauthenticated.';
        }

        if ($exception instanceof AuthorizationException) {
            return 'You are not allowed to perform this action.';
        }

        if ($exception instanceof ModelNotFoundException) {
            return 'Resource not found.';
        }

        if ($exception instanceof NotFoundHttpException) {
            return 'Endpoint not found.';
        }

        if ($exception instanceof MethodNotAllowedHttpException) {
            return 'This action is not allowed for this endpoint.';
        }

        if ($exception instanceof QueryException) {
            $queryMessage = strtolower($exception->getMessage());

            if (strpos($queryMessage, 'out of range') !== false || strpos($queryMessage, '22003') !== false) {
                return 'One of the amounts is too large. Please enter a smaller value.';
            }

            return 'The request could not be completed with the provided data.';
        }

        return 'An unexpected server error occurred. Please try again.';
    }

    protected function getStatusCode(Throwable $exception): int
    {
        if ($exception instanceof ValidationException) {
            return 422;
        }

        if ($exception instanceof AuthenticationException) {
            return 401;
        }

        if ($exception instanceof AuthorizationException) {
            return 403;
        }

        if ($exception instanceof ModelNotFoundException) {
            return 404;
        }

        if ($exception instanceof QueryException) {
            return 422;
        }

        if ($exception instanceof HttpExceptionInterface) {
            return $exception->getStatusCode();
        }

        return 500;
    }
}
