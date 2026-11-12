<?php

namespace App\Services\KoreksiJurbal;

use Generator;
use RuntimeException;
use XMLReader;
use ZipArchive;

/**
 * Pembaca .xlsx streaming (XMLReader).
 *
 * File .xlsx = zip berisi XML. Sheet dibaca baris demi baris langsung dari
 * zip, jadi memori tetap kecil berapa pun ukuran file. Yang disimpan penuh
 * di memori hanya kamus teks (xl/sharedStrings.xml), dimuat sekali per file.
 */
class XlsxStreamReader
{
    /** @var array<string, string> nama sheet => path XML di dalam zip */
    private array $sheets;
    /** @var array<string, array{definition:string, records:string}> nama virtual => cache pivot */
    private array $pivots;
    private ?array $strings = null;

    public function __construct(private string $path)
    {
        [$this->sheets, $this->pivots] = $this->listSheets();
    }

    /**
     * Sheet biasa + cache pivot. Cache pivot menyimpan salinan data mentah
     * yang dipakai pivot table (file yang hanya berisi pivot tetap punya raw).
     *
     * @return string[]
     */
    public function sheetNames(): array
    {
        return [...array_keys($this->sheets), ...array_keys($this->pivots)];
    }

    /**
     * Yield [nomorBaris => [hurufKolom => nilai]] untuk setiap <row>.
     * Sel kosong tidak muncul. Nilai: string, int/float, bool, atau null.
     * Cache pivot: baris 1 = nama field, baris 2 dst. = record.
     *
     * @return Generator<int, array<string, mixed>>
     */
    public function rows(string $sheet, ?array $onlyCols = null): Generator
    {
        if (isset($this->pivots[$sheet])) {
            yield from $this->pivotRows($this->pivots[$sheet], $onlyCols);
            return;
        }

        $entry = $this->sheets[$sheet] ?? throw new RuntimeException("Sheet tidak ditemukan: {$sheet}");
        $this->strings ??= $this->loadSharedStrings();
        $only = $onlyCols ? array_flip($onlyCols) : null;

        $xml = new XMLReader();
        if (!$xml->open('zip://' . $this->zipPath() . '#' . $entry, null, LIBXML_NONET | LIBXML_COMPACT)) {
            throw new RuntimeException("Sheet tidak bisa dibuka: {$sheet}");
        }

        try {
            $rowNum = 0;
            while ($xml->read()) {
                if ($xml->nodeType !== XMLReader::ELEMENT || $xml->localName !== 'row') continue;

                $rowNum = (int) ($xml->getAttribute('r') ?: $rowNum + 1);
                if ($xml->isEmptyElement) {
                    yield $rowNum => [];
                    continue;
                }

                $cells = [];
                $depth = $xml->depth;
                $col = $type = $value = null;
                $inline = '';

                // Jalan di dalam <row> sampai tag penutupnya
                while ($xml->read() && !($xml->nodeType === XMLReader::END_ELEMENT && $xml->depth === $depth)) {
                    if ($xml->nodeType === XMLReader::ELEMENT) {
                        switch ($xml->localName) {
                            case 'c':
                                $col    = preg_replace('/\d+/', '', (string) $xml->getAttribute('r'));
                                $type   = $xml->getAttribute('t');
                                $value  = null;
                                $inline = '';
                                if ($xml->isEmptyElement) $col = null;   // <c r="A1"/> = kosong
                                break;
                            case 'v':
                                $value = $xml->readString();
                                break;
                            case 't':                                    // <is><t>…</t></is> (inlineStr)
                                $inline .= $xml->readString();
                                break;
                        }
                    } elseif ($xml->nodeType === XMLReader::END_ELEMENT && $xml->localName === 'c' && $col !== null) {
                        if ($only === null || isset($only[$col])) {
                            $cells[$col] = $this->cast($type, $value, $inline);
                        }
                        $col = null;
                    }
                }

                yield $rowNum => $cells;
            }
        } finally {
            $xml->close();
        }
    }

    /**
     * Record cache pivot. Urutan elemen di <r> = urutan cacheField:
     * <x v="i"/> = sharedItems[i] field tsb, <n>/<s>/<b>/<d>/<e v=".."/> = nilai langsung, <m/> = kosong.
     */
    private function pivotRows(array $cache, ?array $onlyCols): Generator
    {
        [$fields, $items] = $this->loadPivotDefinition($cache['definition']);
        $letters = array_map([$this, 'columnLetter'], array_keys($fields));
        $only    = $onlyCols ? array_flip($onlyCols) : null;

        yield 1 => array_combine($letters, $fields);

        $xml = new XMLReader();
        if (!$xml->open('zip://' . $this->zipPath() . '#' . $cache['records'], null, LIBXML_NONET | LIBXML_COMPACT)) {
            throw new RuntimeException('Cache pivot tidak bisa dibuka.');
        }

        try {
            $rowNum = 1;
            while ($xml->read()) {
                if ($xml->nodeType !== XMLReader::ELEMENT || $xml->localName !== 'r') continue;
                $rowNum++;
                if ($xml->isEmptyElement) {
                    yield $rowNum => [];
                    continue;
                }

                $cells = [];
                $i     = 0;
                $depth = $xml->depth;
                while ($xml->read() && !($xml->nodeType === XMLReader::END_ELEMENT && $xml->depth === $depth)) {
                    if ($xml->nodeType !== XMLReader::ELEMENT) continue;
                    $col = $letters[$i] ?? null;
                    if ($col !== null && ($only === null || isset($only[$col]))) {
                        $v = $xml->getAttribute('v');
                        $cells[$col] = match ($xml->localName) {
                            'x'     => $items[$i][(int) $v] ?? null,
                            'n'     => $this->number($v),
                            'b'     => $v === '1',
                            'm', 'e' => null,
                            default => $v,                       // s, d
                        };
                    }
                    $i++;
                }

                yield $rowNum => $cells;
            }
        } finally {
            $xml->close();
        }
    }

    /** cacheField (nama) + sharedItems (nilai yang dirujuk <x v="i"/>) per field. */
    private function loadPivotDefinition(string $entry): array
    {
        $xml = new XMLReader();
        $xml->open('zip://' . $this->zipPath() . '#' . $entry, null, LIBXML_NONET | LIBXML_COMPACT);

        $fields = $items = [];
        $f = -1;
        $inShared = false;
        while ($xml->read()) {
            if ($xml->nodeType === XMLReader::ELEMENT) {
                switch ($xml->localName) {
                    case 'cacheField':
                        $fields[++$f] = (string) $xml->getAttribute('name');
                        $items[$f] = [];
                        break;
                    case 'sharedItems':
                        $inShared = !$xml->isEmptyElement;
                        break;
                    case 'fieldGroup':                          // item grup (tanggal dsb.) bukan nilai record
                        $inShared = false;
                        break;
                    case 's': case 'n': case 'b': case 'd': case 'e': case 'm':
                        if ($inShared && $f >= 0) {
                            $v = $xml->getAttribute('v');
                            $items[$f][] = match ($xml->localName) {
                                'n'      => $this->number($v),
                                'b'      => $v === '1',
                                'm', 'e' => null,
                                default  => $v,
                            };
                        }
                        break;
                }
            } elseif ($xml->nodeType === XMLReader::END_ELEMENT && $xml->localName === 'sharedItems') {
                $inShared = false;
            }
        }
        $xml->close();

        return [$fields, $items];
    }

    private function number(?string $v): int|float|null
    {
        if ($v === null || $v === '') return null;
        return preg_match('/^-?\d+$/', $v) && strlen($v) < 16 ? (int) $v : (float) $v;
    }

    /** 0 → A, 25 → Z, 26 → AA */
    private function columnLetter(int $i): string
    {
        $s = '';
        for ($i++; $i > 0; $i = intdiv($i - 1, 26)) {
            $s = chr(65 + ($i - 1) % 26) . $s;
        }
        return $s;
    }

    private function cast(?string $type, ?string $value, string $inline): mixed
    {
        return match ($type) {
            's'         => $value === null ? null : ($this->strings[(int) $value] ?? null),
            'inlineStr' => $inline,
            'str'       => $value,                       // hasil formula berupa teks
            'b'         => $value === null ? null : $value === '1',
            'e'         => null,                         // #N/A, #REF!, dst.
            default     => $value === null || $value === '' ? null
                : (preg_match('/^-?\d+$/', $value) && strlen($value) < 16 ? (int) $value : (float) $value),
        };
    }

    /** Kamus teks: <si><t>..</t></si> atau rich text <si><r><t>..</t></r>…</si>. */
    private function loadSharedStrings(): array
    {
        $zip = new ZipArchive();
        $zip->open($this->path);
        $idx  = $zip->locateName('xl/sharedStrings.xml', ZipArchive::FL_NOCASE);
        $name = $idx === false ? null : $zip->getNameIndex($idx);
        $zip->close();
        if ($name === null) return [];

        $xml = new XMLReader();
        $xml->open('zip://' . $this->zipPath() . '#' . $name, null, LIBXML_NONET | LIBXML_COMPACT);

        $strings = [];
        $buf  = null;
        $skip = 0;                                       // abaikan <rPh> (teks fonetik)
        while ($xml->read()) {
            if ($xml->nodeType === XMLReader::ELEMENT) {
                if ($xml->localName === 'si') {
                    $buf = '';
                    if ($xml->isEmptyElement) { $strings[] = ''; $buf = null; }
                } elseif ($xml->localName === 'rPh' && !$xml->isEmptyElement) {
                    $skip++;
                } elseif ($xml->localName === 't' && $buf !== null && !$skip) {
                    $buf .= $xml->readString();
                }
            } elseif ($xml->nodeType === XMLReader::END_ELEMENT) {
                if ($xml->localName === 'rPh') {
                    $skip--;
                } elseif ($xml->localName === 'si' && $buf !== null) {
                    $strings[] = $buf;
                    $buf = null;
                }
            }
        }
        $xml->close();

        return $strings;
    }

    /** Nama sheet => path XML di zip, dari workbook.xml + rels (tanpa membaca isi sheet). */
    private function listSheets(): array
    {
        $zip = new ZipArchive();
        if ($zip->open($this->path) !== true) {
            throw new RuntimeException('File bukan .xlsx yang valid.');
        }

        try {
            $wb   = $zip->getFromName('xl/workbook.xml');
            $rels = $zip->getFromName('xl/_rels/workbook.xml.rels');
            if ($wb === false || $rels === false) {
                throw new RuntimeException('File bukan .xlsx yang valid.');
            }

            $targets = [];
            preg_match_all('/<Relationship\b[^>]*>/', $rels, $rs);
            foreach ($rs[0] as $rel) {
                if (preg_match('/\bId="([^"]+)"/', $rel, $id) && preg_match('/\bTarget="([^"]+)"/', $rel, $t)) {
                    $targets[$id[1]] = ltrim(str_starts_with($t[1], '/') ? $t[1] : 'xl/' . $t[1], '/');
                }
            }

            $sheets = [];
            preg_match_all('/<sheet\b[^>]*>/', $wb, $tags);
            foreach ($tags[0] as $tag) {
                if (!preg_match('/\bname="([^"]*)"/', $tag, $n) || !preg_match('/\br:id="([^"]+)"/', $tag, $id)) continue;
                $target = $targets[$id[1]] ?? null;
                $idx = $target === null ? false : $zip->locateName($target, ZipArchive::FL_NOCASE);
                if ($idx !== false) {
                    $sheets[html_entity_decode($n[1], ENT_QUOTES | ENT_XML1)] = $zip->getNameIndex($idx);
                }
            }

            // Cache pivot: workbook <pivotCache r:id> → definition → (rels) records
            $pivots = [];
            preg_match_all('/<pivotCache\b[^>]*>/', $wb, $caches);
            foreach ($caches[0] as $tag) {
                if (!preg_match('/\bcacheId="(\d+)"/', $tag, $cid) || !preg_match('/\br:id="([^"]+)"/', $tag, $id)) continue;
                $def = $targets[$id[1]] ?? null;
                if ($def === null || $zip->locateName($def, ZipArchive::FL_NOCASE) === false) continue;

                $relsPath = dirname($def) . '/_rels/' . basename($def) . '.rels';
                $defRels  = $zip->getFromName($relsPath);
                if ($defRels === false || !preg_match('/\bTarget="([^"]+)"/', $defRels, $t)) continue;
                $records = ltrim(str_starts_with($t[1], '/') ? $t[1] : dirname($def) . '/' . $t[1], '/');
                $idx = $zip->locateName($records, ZipArchive::FL_NOCASE);
                if ($idx === false) continue;

                $pivots["Pivot cache {$cid[1]}"] = ['definition' => $def, 'records' => $zip->getNameIndex($idx)];
            }

            return [$sheets, $pivots];
        } finally {
            $zip->close();
        }
    }

    /** Wrapper zip:// butuh path dengan slash biasa (Windows). */
    private function zipPath(): string
    {
        return str_replace('\\', '/', realpath($this->path) ?: $this->path);
    }
}
