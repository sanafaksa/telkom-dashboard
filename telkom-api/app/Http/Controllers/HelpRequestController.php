<?php

namespace App\Http\Controllers;

use App\Models\HelpRequest;
use Illuminate\Http\Request;

/** Aduan lupa kata sandi dari halaman login (publik, dibatasi throttle). */
class HelpRequestController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'    => 'required|string|max:100',
            'nip'     => 'nullable|string|max:30',
            'contact' => 'required|string|max:150',
            'message' => 'required|string|max:1000',
        ]);

        HelpRequest::create($data + ['status' => HelpRequest::OPEN]);

        return response()->json([
            'message' => 'Aduan Anda sudah diterima. Tim IT Support akan menghubungi Anda.',
        ], 201);
    }
}
