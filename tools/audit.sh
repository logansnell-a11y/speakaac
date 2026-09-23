#!/usr/bin/env bash
# Speak site audit. Run against production or a Netlify deploy preview:
#   tools/audit.sh                      # defaults to https://speakaac.org
#   tools/audit.sh https://deploy-preview-12--speak.netlify.app
#
# Checks are ordered by how badly the failure hurts a real user.
# Exits non-zero if anything in the BLOCKING section fails.

set -uo pipefail
SITE="${1:-https://speakaac.org}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail=0; warn=0
pass() { printf '  \033[32mok\033[0m   %s\n' "$1"; }
bad()  { printf '  \033[31mFAIL\033[0m %s\n' "$1"; fail=$((fail+1)); }
soft() { printf '  \033[33mwarn\033[0m %s\n' "$1"; warn=$((warn+1)); }

echo "Auditing $SITE"
echo
echo "== BLOCKING =="

# 1. Every service-worker precache URL must return 200.
#    addAll() is atomic: one 404 fails the install and every device that
#    already has the app stays frozen on the previous cache forever.
echo "-- service worker precache"
urls=$(python3 - "$ROOT/sw.js" <<'PY'
import re,sys
s=open(sys.argv[1]).read()
m=re.search(r'const PRECACHE\s*=\s*\[(.*?)\]',s,re.S)
print('\n'.join(re.findall(r"'([^']+)'",m.group(1))) if m else '')
PY
)
for u in $urls; do
  c=$(curl -s -o /dev/null -w '%{http_code}' "$SITE$u")
  [ "$c" = "200" ] && pass "$u" || bad "$u returned $c (would brick every installed device)"
done

# 2. Advertised prices must match Stripe. Stripe is the only thing that charges
#    anyone, so it is the source of truth. Update these when Stripe changes.
echo "-- pricing consistency"
declare -a BAD_PRICES=(
  'then $79.99/mo'      'Clinic advertised at the Lifetime price'
  '$49<small> /mo'      'Clinic advertised at the Institution price'
  'then $49.99/mo'      'Clinic advertised at the Institution price'
  '$799/yr'             'stale Clinic annual price'
  '$799/year'           'stale Clinic annual price'
)
i=0
while [ $i -lt ${#BAD_PRICES[@]} ]; do
  needle="${BAD_PRICES[$i]}"; why="${BAD_PRICES[$((i+1))]}"
  if grep -rqF "$needle" "$ROOT"/*.html; then
    bad "found \"$needle\" ($why)"
  fi
  i=$((i+2))
done
[ $fail -eq 0 ] && pass "no known-stale prices in any page"

# 3. Paid tiers must all be honoured by the AI gate, or someone pays and stays
#    throttled. 'lifetime' and 'facility' were missing once already.
echo "-- paid tier gate"
for t in family clinic institution lifetime facility; do
  if grep -q "'$t'" "$ROOT/netlify/functions/ai-sentence.js" \
  && grep -q "'$t'" "$ROOT/netlify/functions/generate-vocab.js"; then
    pass "tier $t is gated as paid in both AI functions"
  else
    bad "tier $t missing from PAID_TIERS (they pay and stay throttled)"
  fi
done

# 3b. Publish-root leak. netlify.toml publishes ".", so every file in the repo
#     is served unless a forced redirect 404s it. This has bitten twice.
echo "-- publish root"
leaked=0
for f in "$ROOT"/*.sql "$ROOT"/*.md "$ROOT"/*.py "$ROOT"/*.mjs; do
  [ -e "$f" ] || continue
  b=$(basename "$f")
  c=$(curl -s -o /dev/null -w '%{http_code}' "$SITE/$b")
  if [ "$c" = "200" ]; then bad "$b is publicly served (add a forced 404 in netlify.toml)"; leaked=$((leaked+1)); fi
done
[ $leaked -eq 0 ] && pass "no internal .sql/.md/.py served from the publish root"

# 4. Security headers.
echo "-- security headers"
hdrs=$(curl -sI "$SITE/")
for h in strict-transport-security content-security-policy x-frame-options x-content-type-options referrer-policy; do
  echo "$hdrs" | grep -qi "^$h:" && pass "$h" || bad "$h missing"
done

echo
echo "== NON-BLOCKING =="

# 5. Internal links resolve.
echo "-- internal links"
broken=0
for l in $(grep -rhoE 'href="/[a-z_-]+"|href="[a-z_-]+\.html"' "$ROOT"/*.html \
           | sed 's/href="//;s/"//' | sort -u); do
  c=$(curl -s -o /dev/null -w '%{http_code}' "$SITE/${l#/}")
  case "$c" in 200|301|302) ;; *) soft "$l returned $c"; broken=$((broken+1));; esac
done
[ $broken -eq 0 ] && pass "all internal links resolve"

# 6. Canonicals. Netlify Pretty URLs serves /x and /x.html as separate 200s,
#    so without these Google picks between duplicates on its own.
echo "-- canonical tags"
missing=0
for f in "$ROOT"/index.html "$ROOT"/app.html "$ROOT"/for_clinics.html "$ROOT"/device.html "$ROOT"/mission.html "$ROOT"/guide.html; do
  grep -q 'rel="canonical"' "$f" || { soft "$(basename "$f") has no canonical"; missing=$((missing+1)); }
done
[ $missing -eq 0 ] && pass "canonical present on the main pages"

# 7. Dependencies. There are none, on purpose. If a package.json ever appears
#    in the deployed tree this needs to become a real npm audit.
echo "-- dependencies"
if find "$ROOT" -name package.json -not -path '*/aws/*' -not -path '*/node_modules/*' | grep -q .; then
  soft "a package.json appeared in the deploy tree — add a real vulnerability scan"
else
  pass "zero third-party runtime dependencies (nothing to scan)"
fi

# 8. Lighthouse. Thresholds are the Core Web Vitals targets plus an
#    accessibility floor, which matters more than usual on an AAC product.
echo "-- lighthouse (this takes a minute)"
tmp=$(mktemp -d)
if npx --yes lighthouse "$SITE/" --quiet --chrome-flags="--headless=new --no-sandbox" \
     --output=json --output-path="$tmp/lh.json" \
     --only-categories=performance,accessibility,best-practices,seo >/dev/null 2>&1; then
  python3 - "$tmp/lh.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
mins={'performance':85,'accessibility':95,'best-practices':90,'seo':95}
for k,m in mins.items():
    sc=round((d['categories'][k]['score'] or 0)*100)
    print(f"  {'ok  ' if sc>=m else 'warn'} {k:<16} {sc}  (floor {m})")
for a,lim,unit in [('largest-contentful-paint',2500,'ms'),
                   ('cumulative-layout-shift',0.1,''),
                   ('total-blocking-time',200,'ms')]:
    v=d['audits'][a]['numericValue']
    print(f"  {'ok  ' if v<=lim else 'warn'} {a:<26} {d['audits'][a]['displayValue']}")
PY
else
  soft "lighthouse did not run"
fi
rm -rf "$tmp"

echo
echo "blocking failures: $fail   warnings: $warn"
exit $(( fail > 0 ? 1 : 0 ))
