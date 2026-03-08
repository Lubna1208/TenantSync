<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AnnouncementController extends Controller
{
    public function index()
    {
        $announcements = Announcement::with('creator')->latest()->get();

        return response()->json([
            'message' => 'Announcements fetched successfully',
            'data' => $announcements
        ], 200);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'created_by' => 'required|exists:users,id',
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'target_role' => 'nullable|in:tenant,manager,all'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $announcement = Announcement::create([
            'created_by' => $request->created_by,
            'title' => $request->title,
            'message' => $request->message,
            'target_role' => $request->target_role ?? 'all'
        ]);

        $announcement->load('creator');

        return response()->json([
            'message' => 'Announcement created successfully',
            'data' => $announcement
        ], 201);
    }

    public function show($id)
    {
        $announcement = Announcement::with('creator')->find($id);

        if (!$announcement) {
            return response()->json([
                'message' => 'Announcement not found'
            ], 404);
        }

        return response()->json([
            'message' => 'Announcement fetched successfully',
            'data' => $announcement
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $announcement = Announcement::find($id);

        if (!$announcement) {
            return response()->json([
                'message' => 'Announcement not found'
            ], 404);
        }

        $announcement->update($request->only([
            'title',
            'message',
            'target_role'
        ]));

        $announcement->load('creator');

        return response()->json([
            'message' => 'Announcement updated successfully',
            'data' => $announcement
        ], 200);
    }

    public function destroy($id)
    {
        $announcement = Announcement::find($id);

        if (!$announcement) {
            return response()->json([
                'message' => 'Announcement not found'
            ], 404);
        }

        $announcement->delete();

        return response()->json([
            'message' => 'Announcement deleted successfully'
        ], 200);
    }
}