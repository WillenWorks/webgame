#!/usr/bin/env bash
# npm audit com resiliência a indisponibilidade do endpoint de advisories.
#
#   - vuln no nível pedido  -> falha (hard, sem retry)
#   - endpoint 5xx / rede   -> retry 3x; se persistir, passa com WARNING alto
#     (o endpoint do npm cai com alguma frequência e não deve travar todo o
#      repo; o Dependabot continua sendo o gate de verdade)
#
# uso: npm-audit.sh <dir> [--audit-level=high]
set -u

dir="${1:?informe o diretório}"
level="${2:---audit-level=high}"
cd "$dir" || exit 1

transient_re='Service Unavailable|audit endpoint returned an error|ENETUNREACH|ETIMEDOUT|ECONNRESET|socket hang up|502 Bad Gateway|504 Gateway'

for attempt in 1 2 3; do
  out="$(npm audit "$level" 2>&1)"
  code=$?
  echo "$out"
  if [ "$code" -eq 0 ]; then
    exit 0
  fi
  if echo "$out" | grep -qE "$transient_re"; then
    echo "::warning::npm audit ($dir): endpoint indisponível (tentativa $attempt/3)"
    sleep $((attempt * 20))
    continue
  fi
  # erro real (vulnerabilidade encontrada) -> falha imediata
  echo "::error::npm audit ($dir): vulnerabilidade no nível ${level#--audit-level=} ou mais"
  exit "$code"
done

echo "::warning::npm audit ($dir): endpoint do npm indisponível após 3 tentativas — passando com aviso. Rode 'gh run rerun' quando o registry normalizar."
exit 0
