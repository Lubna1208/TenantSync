<?php

namespace App\Support;

class ValidationRules
{
    public const MONEY_MAX = '99999999.99';

    /**
     * Build rules for decimal(10,2) monetary values.
     *
     * @param  string  $presence  required|sometimes|required|nullable
     * @return array<int, string>
     */
    public static function money(string $presence = 'required'): array
    {
        $rules = [];

        if ($presence === 'sometimes|required') {
            $rules[] = 'sometimes';
            $rules[] = 'required';
        } elseif ($presence === 'nullable') {
            $rules[] = 'nullable';
        } else {
            $rules[] = 'required';
        }

        $rules[] = 'numeric';
        $rules[] = 'between:0,' . self::MONEY_MAX;

        return $rules;
    }

    /**
     * @return array<string, string>
     */
    public static function moneyMessages(string $field, string $label): array
    {
        return [
            $field . '.between' => $label . ' must be between 0 and ' . number_format((float) self::MONEY_MAX, 2) . '.',
        ];
    }
}
