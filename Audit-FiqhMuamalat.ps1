# ===== FiqhMuamalat — فحص آمن للقراءة فقط =====
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$root = (Get-Location).Path
if (-not (Test-Path (Join-Path $root 'package.json'))) {
  Write-Host "لا يوجد package.json هنا. افتح الطرفية داخل D:\FiqhMuamalat ثم أعد التشغيل." -ForegroundColor Red
  return
}

$sb = New-Object System.Text.StringBuilder
function P([string]$t = '') { [void]$sb.AppendLine($t) }
function H([string]$t) { P ''; P ('=' * 70); P "## $t"; P ('=' * 70) }
function Rel([string]$p) { $p.Substring($root.Length).TrimStart('\') }

function Redact([string]$s) {
  if ($null -eq $s) { return '' }
  $s = [regex]::Replace($s, 'eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.?[A-Za-z0-9_\-]*', '<REDACTED_JWT>')
  $s = [regex]::Replace($s, 'sb_(secret|publishable)_[A-Za-z0-9_\-]+', '<REDACTED_SB_KEY>')
  $s = [regex]::Replace($s, '(?i)(password|passwd|secret|token|api[_-]?key|service[_-]?role[_-]?key)(\s*[:=]\s*)([''"`])[^''"`]{8,}\3', '$1$2$3<REDACTED>$3')
  $s = [regex]::Replace($s, '://[^/@\s]+@', '://<REDACTED>@')
  return $s
}

function ShowFile($f, [int]$max = 250) {
  P ''; P "----- FILE: $(Rel $f.FullName) -----"
  try {
    $lines = @(Get-Content -LiteralPath $f.FullName -Encoding UTF8 -ErrorAction Stop)
    $i = 0
    foreach ($l in $lines) {
      if ($i -ge $max) { P "... [مقتطع، المجموع $($lines.Count) سطرًا]"; break }
      P (Redact $l); $i++
    }
  } catch { P "(تعذرت القراءة: $($_.Exception.Message))" }
}

function JwtRole([string]$jwt) {
  try {
    $p = $jwt.Split('.')[1].Replace('-', '+').Replace('_', '/')
    switch ($p.Length % 4) { 2 { $p += '==' } 3 { $p += '=' } }
    $o = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($p)) | ConvertFrom-Json
    return [string]$o.role
  } catch { return 'unknown' }
}

$all = @(Get-ChildItem -LiteralPath $root -Recurse -File -Force -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '\\(node_modules|dist|\.git|\.vite|coverage)\\' })

# 1) الموقع والبيئة
H '1) الموقع والبيئة'
P "المسار الحالي: $root"
P "D:\FiqhMuamalat موجود؟ $(Test-Path 'D:\FiqhMuamalat')"
foreach ($c in @('node -v', 'npm -v', 'git --version')) {
  try { P ("{0}: {1}" -f $c, ((Invoke-Expression "$c 2>&1") -join ' ')) } catch { P "$c : غير متاح" }
}
P "node_modules موجود؟ $(Test-Path (Join-Path $root 'node_modules'))"
P "dist موجود؟ $(Test-Path (Join-Path $root 'dist'))"

# 2) شجرة الملفات (بدون node_modules/dist/.git)
H '2) شجرة الملفات'
$all | Select-Object -First 500 | ForEach-Object { P ("{0,8} B  {1}" -f $_.Length, (Rel $_.FullName)) }
if ($all.Count -gt 500) { P "... يوجد $($all.Count) ملفًا، عُرض أول 500" }

# 3) ملفات الإعداد
H '3) ملفات الإعداد (package.json / Vite / TS / Tailwind / ESLint ...)'
$cfgNames = '^(package\.json|vite\.config\..+|tsconfig.*\.json|tailwind\.config\..+|postcss\.config\..+|eslint\.config\..+|\.eslintrc.*|index\.html|\.gitignore|\.env\.example|Run-FiqhMuamalat\.bat|README\.md|vercel\.json|netlify\.toml)$'
$all | Where-Object { $_.DirectoryName -eq $root -and $_.Name -match $cfgNames } | ForEach-Object { ShowFile $_ 150 }

# 4) ملفات src
H '4) ملفات src مع عدد الأسطر'
$srcDir = Join-Path $root 'src'
if (Test-Path $srcDir) {
  Get-ChildItem -LiteralPath $srcDir -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    $n = @(Get-Content -LiteralPath $_.FullName -Encoding UTF8 -ErrorAction SilentlyContinue).Count
    P ("{0,5} سطر  {1}" -f $n, (Rel $_.FullName))
  }
} else { P 'لا يوجد مجلد src' }

# 5) المصادقة وSupabase client
H '5) ملفات المصادقة وSupabase client ونقطة الدخول'
if (Test-Path $srcDir) {
  $authFiles = @(Get-ChildItem -LiteralPath $srcDir -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^(main|App|vite-env\.d)\.(tsx?|ts)$' -or (Rel $_.FullName) -match '(?i)(auth|supabase|login|session|role|protected|guard|route|profile)' })
  $authFiles | ForEach-Object { ShowFile $_ 250 }
  P ''; P '--- مواضع استخدام Supabase في الكود (ملف:سطر) ---'
  Get-ChildItem -LiteralPath $srcDir -Recurse -File -Include *.ts, *.tsx -ErrorAction SilentlyContinue |
    Select-String -Pattern 'createClient|supabase\.auth|onAuthStateChange|supabase\.from|supabase\.rpc|import\.meta\.env' |
    ForEach-Object { P ("{0}:{1}  {2}" -f (Rel $_.Path), $_.LineNumber, (Redact $_.Line.Trim())) }
}

# 6) مجلد supabase والـ migrations
H '6) مجلد supabase والـ migrations وملفات SQL'
$sqlFiles = @($all | Where-Object { $_.Extension -ieq '.sql' })
$supDir = Join-Path $root 'supabase'
P "مجلد supabase موجود؟ $(Test-Path $supDir)"
if (Test-Path $supDir) {
  Get-ChildItem -LiteralPath $supDir -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object { P ("{0,8} B  {1}" -f $_.Length, (Rel $_.FullName)) }
  $all | Where-Object { $_.FullName -like (Join-Path $supDir 'config.toml') } | ForEach-Object { ShowFile $_ 150 }
}
P "عدد ملفات SQL في المشروع: $($sqlFiles.Count)"
$sqlFiles | Sort-Object FullName | ForEach-Object { ShowFile $_ 400 }

# 7) ملخص RLS والسياسات
H '7) ملخص أوامر RLS والسياسات والدوال (من ملفات SQL)'
if ($sqlFiles.Count -gt 0) {
  $sqlFiles.FullName | Select-String -Pattern 'row level security|create policy|alter policy|drop policy|create table|alter table|create (or replace )?function|security definer|security invoker|create trigger|create type|create view|\bgrant\b|\brevoke\b' |
    ForEach-Object { P ("{0}:{1}  {2}" -f (Rel $_.Path), $_.LineNumber, (Redact $_.Line.Trim())) }
} else { P 'لا توجد ملفات SQL في المشروع (السياسات قد تكون منفذة مباشرة في لوحة Supabase فقط).' }

# 8) ملفات .env (أسماء المتغيرات فقط، بدون القيم)
H '8) ملفات .env — أسماء المتغيرات فقط'
$envFiles = @($all | Where-Object { $_.Name -like '.env*' })
if ($envFiles.Count -eq 0) { P 'لا توجد ملفات .env*' }
foreach ($e in $envFiles) {
  P ''; P "ملف: $(Rel $e.FullName)"
  Get-Content -LiteralPath $e.FullName -Encoding UTF8 -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_ -match '^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
      $name = $Matches[1]; $val = $Matches[2].Trim().Trim('"').Trim("'")
      $state = if ($val.Length -eq 0) { 'فارغ' } else { "معبّأ ($($val.Length) حرفًا)" }
      $flag = ''
      if ($name -match '(?i)SERVICE_ROLE|SECRET|PRIVATE') { $flag += '  <-- اسم حساس' }
      if ($name -match '^VITE_' -and $name -match '(?i)SERVICE|SECRET|PRIVATE') { $flag += '  !! بادئة VITE_ تعني ظهوره في المتصفح' }
      P ("  {0} = {1}{2}" -f $name, $state, $flag)
    }
  }
}

# 9) مسح الأسرار (يطبع الملف ورقم السطر ونوع النمط فقط، لا يطبع محتوى السطر)
H '9) مسح الأسرار المحتملة (ملف:سطر + نوع النمط فقط)'
$textExt = '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.html', '.sql', '.toml', '.yml', '.yaml', '.bat', '.cmd', '.ps1', '.txt', '.css', '.env'
$scanFiles = @($all | Where-Object { ($textExt -contains $_.Extension.ToLower() -or $_.Name -like '.env*') -and $_.Name -ne 'package-lock.json' -and $_.Length -lt 2MB })
$jwtRx = 'eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.?[A-Za-z0-9_\-]*'
$patterns = @(
  @{ L = 'service_role (نص)'; R = 'service_role' },
  @{ L = 'SERVICE_ROLE_KEY'; R = 'SERVICE_ROLE_KEY' },
  @{ L = 'JWT'; R = $jwtRx },
  @{ L = 'مفتاح sb_secret'; R = 'sb_secret_[A-Za-z0-9_\-]+' },
  @{ L = 'مفتاح خاص PEM'; R = 'BEGIN [A-Z ]*PRIVATE KEY' },
  @{ L = 'GitHub token'; R = 'ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}' },
  @{ L = 'Anthropic key'; R = 'sk-ant-[A-Za-z0-9_\-]{10,}' },
  @{ L = 'سلسلة اتصال قاعدة بيانات بكلمة مرور'; R = 'postgres(ql)?://[^\s:@/]+:[^\s@]+@' },
  @{ L = 'password/secret مكتوب نصًّا'; R = '(?i)(password|secret)\s*[:=]\s*[''"][^''"]{8,}[''"]' }
)
$anyHit = $false
foreach ($pt in $patterns) {
  $hits = @(Select-String -LiteralPath $scanFiles.FullName -Pattern $pt.R -AllMatches -ErrorAction SilentlyContinue)
  foreach ($h in $hits) {
    $anyHit = $true
    $extra = ''
    if ($pt.L -eq 'JWT') {
      $roles = ($h.Matches | ForEach-Object { JwtRole $_.Value } | Sort-Object -Unique) -join ','
      $extra = "  [role داخل المفتاح = $roles]"
    }
    P ("{0}:{1}  [{2}]{3}" -f (Rel $h.Path), $h.LineNumber, $pt.L, $extra)
  }
}
if (-not $anyHit) { P 'لم يُعثر على أي نمط من الأنماط المفحوصة.' }

# 10) Git
H '10) حالة Git'
$inGit = (git rev-parse --is-inside-work-tree 2>$null)
if ($inGit -eq 'true') {
  P "الفرع الحالي: $(git branch --show-current 2>&1)"
  P '--- status (مختصر) ---'
  (git --no-optional-locks status --short 2>&1) | ForEach-Object { P $_ }
  P '--- remote ---'
  (git remote -v 2>&1) | ForEach-Object { P (Redact $_) }
  P '--- آخر 8 commits ---'
  (git log -8 --oneline 2>&1) | ForEach-Object { P $_ }
  P '--- ملفات .env المتتبَّعة في Git (يجب ألا يوجد أي منها عدا .env.example) ---'
  $trk = @(git ls-files 2>$null | Select-String -Pattern '(^|/)\.env')
  if ($trk.Count -eq 0) { P 'لا يوجد' } else { $trk | ForEach-Object { P $_.Line } }
  P '--- هل .env و .env.local مُتجاهَلان (gitignore)؟ ---'
  (git check-ignore -v .env .env.local 2>&1) | ForEach-Object { P $_ }
  P '--- هل أُضيف .env إلى التاريخ يومًا؟ ---'
  $envHist = @(git log --all --diff-filter=A --name-only --pretty=format: -- .env .env.local 2>$null | Where-Object { $_ } | Sort-Object -Unique)
  if ($envHist.Count -eq 0) { P 'لا' } else { $envHist | ForEach-Object { P $_ } }
  P '--- هل ظهر service_role / SERVICE_ROLE_KEY في تاريخ commits؟ (hash + رسالة فقط) ---'
  $h1 = @(git log --all --oneline -S"service_role" 2>$null)
  $h2 = @(git log --all --oneline -S"SERVICE_ROLE_KEY" 2>$null)
  if (($h1.Count + $h2.Count) -eq 0) { P 'لا' } else { ($h1 + $h2) | Sort-Object -Unique | ForEach-Object { P $_ } }
  P "عدد الملفات المتتبَّعة: $(@(git ls-files 2>$null).Count)"
} else { P 'هذا المجلد ليس مستودع Git' }

# 11) الحزم المثبّتة (قراءة فقط) وملفات GitHub
H '11) الحزم المثبّتة (المستوى الأول) وworkflows'
try { (npm ls --depth=0 2>&1) | ForEach-Object { P $_ } } catch { P 'تعذر تشغيل npm ls' }
$wf = Join-Path $root '.github'
if (Test-Path $wf) { Get-ChildItem -LiteralPath $wf -Recurse -File | ForEach-Object { P (Rel $_.FullName) } } else { P 'لا يوجد مجلد .github' }

# النهاية
$report = $sb.ToString()
Write-Output $report
try { $report | Set-Clipboard; Write-Host "`n[تم نسخ التقرير كاملًا إلى الحافظة، الصقه في الرد]" -ForegroundColor Green } catch { }