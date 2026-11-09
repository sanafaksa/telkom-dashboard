<?php

// Router lokal yang meniru struktur htdocs InfinityFree.
// Jalankan dari root repo: php -S 127.0.0.1:8080 server.php

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

if (preg_match('#^/\.#', $uri) || preg_match('#^/api/(?!public/)[^/]*\.(env|json|lock|xml)$#', $uri)) {
    http_response_code(404);
    return true;
}

if ($uri === '/api' || str_starts_with($uri, '/api/')) {
    require __DIR__ . '/api/public/index.php';
    return true;
}

if ($uri !== '/' && is_file(__DIR__ . $uri)) {
    return false;
}

readfile(__DIR__ . '/index.html');
return true;
