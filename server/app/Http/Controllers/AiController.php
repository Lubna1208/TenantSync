<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AiController extends Controller
{
    public function generate(Request $request)
    {
        $validated = $request->validate([
            'prompt' => 'nullable|string',
            'contents' => 'nullable|array|min:1',
            'contents.*.role' => 'required_with:contents|string|in:user,model',
            'contents.*.parts' => 'required_with:contents|array|min:1',
            'contents.*.parts.*.text' => 'required_with:contents|string',
        ]);

        $prompt = isset($validated['prompt']) ? trim((string) $validated['prompt']) : '';
        $contents = $validated['contents'] ?? null;

        if ($prompt === '' && ! is_array($contents)) {
            return response()->json([
                'message' => 'A prompt or conversation contents payload is required.',
            ], 422);
        }

        $apiKey = (string) config('services.gemini.api_key');

        if ($apiKey === '') {
            return response()->json([
                'message' => 'AI is not configured yet. Add GEMINI_API_KEY in the server environment.',
            ], 500);
        }

        $baseUrl = rtrim((string) config('services.gemini.base_url'), '/');
        $models = config('services.gemini.models', ['gemini-2.5-flash', 'gemini-2.5-flash-lite']);
        $payload = [
            'contents' => is_array($contents)
                ? $contents
                : [[
                    'role' => 'user',
                    'parts' => [[
                        'text' => $prompt,
                    ]],
                ]],
        ];

        $lastErrorMessage = 'AI request failed.';
        $lastStatus = 502;

        foreach ($models as $model) {
            $response = Http::timeout(30)
                ->acceptJson()
                ->post($baseUrl . '/models/' . $model . ':generateContent?key=' . $apiKey, $payload);

            $data = $response->json();
            $reply = data_get($data, 'candidates.0.content.parts.0.text');

            if ($response->successful() && is_string($reply) && trim($reply) !== '') {
                return response()->json([
                    'message' => 'AI response generated successfully.',
                    'reply' => $reply,
                    'model' => $model,
                ]);
            }

            $lastErrorMessage = data_get($data, 'error.message', $lastErrorMessage);
            $lastStatus = $response->status() >= 400 ? $response->status() : 502;

            if ($response->status() !== 503) {
                break;
            }
        }

        return response()->json([
            'message' => $lastErrorMessage,
        ], $lastStatus);
    }
}
